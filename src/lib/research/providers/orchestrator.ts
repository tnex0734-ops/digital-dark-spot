import type { SearchOptions, SearchProvider, SearchResult } from "./types";
import { BraveSearchProvider } from "./brave";
import { DuckDuckGoHtmlProvider } from "./duckduckgo";
import { WikimediaSearchProvider } from "./wikimedia";
import { OpenAlexSearchProvider } from "./openalex";
import { validateResearchUrl } from "../url-research";

export interface DiscoveryReport {
  provider: string;
  queries: string[];
  totalDiscovered: number;
  discoveredResults: SearchResult[];
  selectedForReview: SearchResult[];
  limitations: string[];
}

export class MultiProviderOrchestrator {
  private providers: SearchProvider[];

  constructor(customProviders?: SearchProvider[]) {
    this.providers = customProviders ?? [
      new BraveSearchProvider(),
      new DuckDuckGoHtmlProvider(),
      new WikimediaSearchProvider(),
      new OpenAlexSearchProvider(),
    ];
  }

  private normalizeUrl(rawUrl: string): string | null {
    try {
      const url = validateResearchUrl(rawUrl);
      url.hash = "";
      url.searchParams.delete("utm_source");
      url.searchParams.delete("utm_medium");
      url.searchParams.delete("utm_campaign");
      url.searchParams.delete("fbclid");
      url.searchParams.delete("gclid");
      return url.toString().replace(/\/$/, "");
    } catch {
      return null;
    }
  }

  async discover(
    queries: string[],
    category: string,
    options: SearchOptions = {},
  ): Promise<DiscoveryReport> {
    if (!queries.length) {
      throw new Error("At least one search query is required for discovery.");
    }

    const availableProviders: SearchProvider[] = [];
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        availableProviders.push(provider);
      }
    }

    if (!availableProviders.length) {
      throw new Error("No live search discovery providers are available.");
    }

    const brave = availableProviders.find((p) => p instanceof BraveSearchProvider);
    const isBraveAvailable = Boolean(brave);
    const activeProviders: SearchProvider[] = [];

    if (brave) {
      activeProviders.push(brave);
    } else {
      // Route available providers (including any custom providers passed in)
      for (const p of availableProviders) {
        if (category === "academic") {
          activeProviders.push(p);
        } else {
          // General, scholarship, comparison, policy
          activeProviders.push(p);
        }
      }
    }

    const limitations: string[] = [];
    const usedProviderNames = new Set<string>();
    const discoveredMap = new Map<string, SearchResult>();

    // Execute queries across active providers
    for (const query of queries) {
      for (const provider of activeProviders) {
        try {
          const results = await provider.search(query, {
            ...options,
            count: 6,
          });
          if (results.length > 0) {
            usedProviderNames.add(provider.name);
          }
          for (const item of results) {
            const canonical = this.normalizeUrl(item.url);
            if (!canonical) continue;
            if (!discoveredMap.has(canonical)) {
              discoveredMap.set(canonical, {
                ...item,
                url: canonical,
              });
            }
          }
        } catch (err: unknown) {
          // Continue with remaining queries/providers
          // Record provider health note if it is not just an expected timeout
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code: string }).code === "rate_limited"
          ) {
            limitations.push(`${provider.name} rate limit reached during search.`);
          }
        }
      }
    }

    const allDiscovered = Array.from(discoveredMap.values());

    if (allDiscovered.length === 0) {
      throw new Error(
        "Live search did not return usable public sources. Check network availability, refine the question, or provide source URLs.",
      );
    }

    // Stage B: Query-Specific Two-Pass Relevance Reranking
    // Score each candidate against the original query terms, target entities, and requirement coverage
    const primaryQuery = queries[0] || "";
    const queryTokens = primaryQuery.toLowerCase().split(/\W+/).filter((w) => w.length > 2);

    function scoreCandidate(candidate: SearchResult): number {
      const title = candidate.title.toLowerCase();
      const snippet = (candidate.snippet || "").toLowerCase();
      const domain = candidate.domain.toLowerCase();
      const full = `${title} ${snippet} ${candidate.url.toLowerCase()}`;

      // 1. Topic / Entity Match (0.30)
      let entityMatch = 0;
      if (queryTokens.length > 0) {
        const titleMatches = queryTokens.filter((token) => title.includes(token)).length;
        entityMatch = Math.min(1, titleMatches / Math.min(queryTokens.length, 3));
      }

      // 2. Requirement / Substring Match (0.25)
      let reqMatch = 0;
      for (const q of queries) {
        const qTerms = q.toLowerCase().split(/\W+/).filter((t) => t.length > 3);
        const hits = qTerms.filter((term) => full.includes(term)).length;
        if (hits > 0) reqMatch += 1;
      }
      const reqScore = Math.min(1, reqMatch / Math.min(queries.length, 4));

      // 3. Directness of Evidence (0.20)
      const directnessScore = title.length > 10 && queryTokens.some((t) => title.includes(t)) ? 1.0 : 0.5;

      // 4. Query-term Coverage (0.15)
      const termHits = queryTokens.filter((token) => full.includes(token)).length;
      const termCoverage = queryTokens.length ? termHits / queryTokens.length : 0.5;

      // 5. Source Suitability & Authority (0.10)
      let suitability = 0.5;
      if (/\.(gov|edu)(\.[a-z]{2,})?$/i.test(domain) || domain.includes("wikipedia.org") || domain.includes("doi.org")) {
        suitability = 1.0;
      } else if (domain.includes(".org") || domain.includes("github.com") || domain.includes("nature.com") || domain.includes("vercel.com")) {
        suitability = 0.8;
      }

      return (
        0.30 * entityMatch +
        0.25 * reqScore +
        0.20 * directnessScore +
        0.15 * termCoverage +
        0.10 * suitability
      );
    }

    const scored = [...allDiscovered].map((candidate) => ({
      candidate,
      relevanceScore: scoreCandidate(candidate),
    }));

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Select 4 to 8 top distinct-domain candidates
    const selected: SearchResult[] = [];
    const seenHosts = new Set<string>();

    for (const item of scored) {
      if (!seenHosts.has(item.candidate.domain)) {
        selected.push(item.candidate);
        seenHosts.add(item.candidate.domain);
        if (selected.length >= 6) break;
      }
    }

    // Fill remaining slots up to 6 if needed
    if (selected.length < 4) {
      for (const item of scored) {
        if (!selected.some((s) => s.url === item.candidate.url)) {
          selected.push(item.candidate);
          if (selected.length >= 6) break;
        }
      }
    }

    const providerSummary = Array.from(usedProviderNames).join(" & ") || "Autonomous Discovery";

    if (!isBraveAvailable && !usedProviderNames.has("DuckDuckGo Web Discovery")) {
      limitations.push(
        "General-web search was unavailable. Autonomous discovery used permitted open scholarly and reference knowledge sources.",
      );
    }

    return {
      provider: providerSummary,
      queries,
      totalDiscovered: allDiscovered.length,
      discoveredResults: allDiscovered,
      selectedForReview: selected,
      limitations,
    };
  }
}
