import { inferIntent, requirementsFromLabels } from "./intent";
import { MultiProviderOrchestrator } from "./providers/orchestrator";
import { reviewUrls, validateResearchUrl } from "./url-research";
import { buildResearchResult } from "./analysis";
import {
  ResearchResultSchema,
  type DiscoveredSource,
  type ResearchResult,
  type Source,
  type EvidenceClaim,
} from "./schema";

export interface ResearchRequest {
  question: string;
  requirements?: string[];
  manualUrls?: string[];
  acceptLanguage?: string | null;
}

export class ResearchOrchestrator {
  private discoveryOrchestrator: MultiProviderOrchestrator;

  constructor(customDiscoveryOrchestrator?: MultiProviderOrchestrator) {
    this.discoveryOrchestrator =
      customDiscoveryOrchestrator ?? new MultiProviderOrchestrator();
  }

  async run(request: ResearchRequest): Promise<ResearchResult> {
    const question = request.question.trim();
    if (question.length < 8) {
      throw new Error("Question must be at least 8 characters long.");
    }

    const intent = inferIntent(question);
    const requirements = request.requirements?.length
      ? requirementsFromLabels(request.requirements, intent.category)
      : intent.requirements;

    const allSources: Source[] = [];
    const allClaims: EvidenceClaim[] = [];
    const discoveredList: DiscoveredSource[] = [];
    const limitations: string[] = [];
    let searchSummary: ResearchResult["search"] = undefined;

    // 1. Process manual user URLs if provided
    const validManualUrls: string[] = [];
    if (request.manualUrls?.length) {
      for (const rawUrl of request.manualUrls) {
        try {
          const validated = validateResearchUrl(rawUrl);
          validManualUrls.push(validated.toString());
        } catch {
          // invalid manual URLs will be reported or skipped
        }
      }

      if (validManualUrls.length > 0) {
        try {
          const manualReview = await reviewUrls(
            validManualUrls.slice(0, 5),
            requirements,
            { origin: "user-provided" },
          );
          allSources.push(...manualReview.sources);
          allClaims.push(...manualReview.claims);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "fetch error";
          limitations.push(`Manual URL review encountered an issue: ${message}`);
        }
      }
    }

    // 2. Perform autonomous discovery
    let discoveryError: string | null = null;
    try {
      const discoveryReport = await this.discoveryOrchestrator.discover(
        intent.queries,
        intent.category,
        {
          acceptLanguage: request.acceptLanguage,
        },
      );

      limitations.push(...discoveryReport.limitations);

      searchSummary = {
        provider: discoveryReport.provider,
        query: intent.queries[0] || question,
        queries: intent.queries,
        resultsFound: discoveryReport.totalDiscovered,
        pagesSelected: discoveryReport.selectedForReview.length,
      };

      // Map all discovered results
      for (let i = 0; i < discoveryReport.discoveredResults.length; i++) {
        const item = discoveryReport.discoveredResults[i];
        const isSelected = discoveryReport.selectedForReview.some((s) => s.url === item.url);
        discoveredList.push({
          id: `discovered-${i + 1}`,
          title: item.title,
          url: item.url,
          domain: item.domain,
          snippet: item.snippet,
          publishedDate: item.publishedDate,
          provider: item.provider,
          query: item.query,
          selectedForReview: isSelected,
        });
      }

      // Review selected candidate pages
      if (discoveryReport.selectedForReview.length > 0) {
        const selectedUrls = discoveryReport.selectedForReview.map((s) => s.url);
        const selectedTitles = discoveryReport.selectedForReview.map((s) => s.title);

        const autoReview = await reviewUrls(selectedUrls, requirements, {
          origin: "automatic-search",
          titles: selectedTitles,
        });

        allSources.push(...autoReview.sources);
        allClaims.push(...autoReview.claims);

        // Include discovered unselected sources in sources list with not_reviewed status
        const unselected = discoveryReport.discoveredResults
          .filter((d) => !selectedUrls.includes(d.url))
          .slice(0, 8);

        for (let i = 0; i < unselected.length; i++) {
          const item = unselected[i];
          allSources.push({
            id: `source-discovered-${i + 1}`,
            title: item.title,
            domain: item.domain,
            url: item.url,
            origin: "automatic-search",
            status: "not_reviewed",
            headings: [],
            authoritySignal: `Found by ${item.provider}; not selected for deep extraction`,
            retrievalNote: "Discovered during web search; excerpt extraction not performed due to runtime budget.",
            dates: {
              published: item.publishedDate,
              modified: null,
              retrieved: new Date().toISOString(),
              validFrom: null,
              validTo: null,
            },
          });
        }
      }
    } catch (err: unknown) {
      discoveryError = err instanceof Error ? err.message : "Search discovery failed.";
    }

    // If both autonomous discovery and manual review produced no sources, propagate honest error
    if (allSources.length === 0) {
      throw new Error(
        discoveryError ||
          "No sources could be discovered or reviewed. Please check your query or provide optional URLs.",
      );
    }

    const result = buildResearchResult({
      mode: "web-search",
      query: question,
      search: searchSummary,
      requirements,
      sources: allSources,
      discoveredSources: discoveredList.length ? discoveredList : undefined,
      claims: allClaims,
      limitations: limitations.length ? limitations : undefined,
    });

    return ResearchResultSchema.parse(result);
  }
}

