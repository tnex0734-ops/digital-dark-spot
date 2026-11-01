import type { SearchOptions, SearchProvider, SearchResult } from "./types";
import { SearchProviderError } from "./types";

export class OpenAlexSearchProvider implements SearchProvider {
  public readonly name = "OpenAlex Scholarly API";
  private readonly endpoint = "https://api.openalex.org/works";
  private readonly timeoutMs = 4_500;

  async isAvailable(): Promise<boolean> {
    return true; // No key required, public open access research API
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = Math.min(options.count ?? 5, 8);
    const timeout = options.timeoutMs ?? this.timeoutMs;
    const url = new URL(this.endpoint);
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", String(limit));
    url.searchParams.set("sort", "relevance_score:desc");

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "DigitalDarkSpot/1.0 (mailto:research@digitaldarkspot.org)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new SearchProviderError(this.name, "timeout", "OpenAlex API request timed out.");
    }

    if (response.status === 429) {
      throw new SearchProviderError(this.name, "rate_limited", "OpenAlex API is currently busy.");
    }
    if (!response.ok) {
      throw new SearchProviderError(this.name, "unavailable", `OpenAlex API returned HTTP ${response.status}.`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new SearchProviderError(this.name, "invalid_response", "Failed to parse OpenAlex JSON response.");
    }

    const items =
      (data as {
        results?: Array<{
          title?: string;
          primary_location?: { landing_page_url?: string };
          doi?: string;
          open_access?: { oa_url?: string };
          type?: string;
          publication_year?: number;
          publication_date?: string;
          abstract_inverted_index?: Record<string, number[]>;
        }>;
      })?.results ?? [];
    const results: SearchResult[] = [];

    for (const item of items) {
      const title = String(item.title || "").trim();
      if (!title) continue;
      const targetUrl = item.primary_location?.landing_page_url || item.doi || (item.open_access?.oa_url);
      if (!targetUrl || !targetUrl.startsWith("https://")) continue;

      let domain = "openalex.org";
      try {
        domain = new URL(targetUrl).hostname;
      } catch {
        // use default domain
      }

      // Reconstruct snippet from abstract_inverted_index if available
      let snippet = "";
      if (item.abstract_inverted_index && typeof item.abstract_inverted_index === "object") {
        const wordPositions: Array<{ word: string; pos: number }> = [];
        for (const [word, positions] of Object.entries(item.abstract_inverted_index)) {
          if (Array.isArray(positions)) {
            for (const pos of positions) {
              wordPositions.push({ word, pos });
            }
          }
        }
        wordPositions.sort((a, b) => a.pos - b.pos);
        snippet = wordPositions.slice(0, 45).map((w) => w.word).join(" ");
      }
      if (!snippet) {
        snippet = `${item.type || "Scholarly work"} published in ${item.publication_year || "recent years"}.`;
      }

      results.push({
        title,
        url: targetUrl,
        domain,
        snippet: snippet.slice(0, 400),
        query,
        provider: this.name,
        publishedDate: item.publication_date ? new Date(item.publication_date).toISOString() : null,
      });
    }

    return results;
  }
}

