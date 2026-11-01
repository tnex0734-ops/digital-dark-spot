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

    // Rank and select 4 to 8 diverse pages for extraction
    // Prefer distinct hostnames, authoritative suffixes (.gov, .edu, .org, official academic/knowledge), and relevant titles
    const selected: SearchResult[] = [];
    const seenHosts = new Set<string>();

    // First pass: 1 per domain, prioritising official / high authority
    const sorted = [...allDiscovered].sort((a, b) => {
      const aOfficial = /\.(gov|edu)(\.[a-z]{2,})?$/i.test(a.domain) ? 2 : a.domain.includes(".org") ? 1 : 0;
      const bOfficial = /\.(gov|edu)(\.[a-z]{2,})?$/i.test(b.domain) ? 2 : b.domain.includes(".org") ? 1 : 0;
      return bOfficial - aOfficial;
    });

    for (const candidate of sorted) {
      if (!seenHosts.has(candidate.domain)) {
        selected.push(candidate);
        seenHosts.add(candidate.domain);
        if (selected.length >= 6) break;
      }
    }

    // Second pass if fewer than 4 selected
    if (selected.length < 4) {
      for (const candidate of sorted) {
        if (!selected.some((s) => s.url === candidate.url)) {
          selected.push(candidate);
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
