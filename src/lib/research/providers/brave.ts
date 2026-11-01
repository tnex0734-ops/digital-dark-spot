import type { SearchOptions, SearchProvider, SearchResult } from "./types";
import { SearchProviderError } from "./types";

export class BraveSearchProvider implements SearchProvider {
  public readonly name = "Brave Search API";
  private readonly endpoint = "https://api.search.brave.com/res/v1/web/search";
  private readonly timeoutMs = 4_000;

  async isAvailable(): Promise<boolean> {
    return Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim());
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) {
      throw new SearchProviderError(this.name, "not_configured", "BRAVE_SEARCH_API_KEY is not configured.");
    }

    const limit = Math.min(options.count ?? 8, 15);
    const timeout = options.timeoutMs ?? this.timeoutMs;
    const url = new URL(this.endpoint);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));
    url.searchParams.set("safesearch", "strict");
    url.searchParams.set("result_filter", "web");

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new SearchProviderError(this.name, "timeout", "Brave Search API timed out.");
    }

    if (response.status === 429) {
      throw new SearchProviderError(this.name, "rate_limited", "Brave Search is rate-limited.");
    }
    if (!response.ok) {
      throw new SearchProviderError(this.name, "unavailable", `Brave Search returned HTTP ${response.status}.`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new SearchProviderError(this.name, "invalid_response", "Failed to parse Brave Search JSON response.");
    }

    const items =
      (data as { web?: { results?: Array<{ title?: string; url?: string; description?: string; page_age?: string }> } })
        ?.web?.results ?? [];
    const results: SearchResult[] = [];

    for (const item of items) {
      const title = String(item.title || "").trim();
      const rawUrl = String(item.url || "");
      if (!title || !rawUrl.startsWith("https://")) continue;

      let domain = "";
      try {
        domain = new URL(rawUrl).hostname.toLowerCase();
      } catch {
        continue;
      }

      results.push({
        title,
        url: rawUrl,
        domain,
        snippet: String(item.description || "").slice(0, 400),
        query,
        provider: this.name,
        publishedDate: item.page_age ? new Date(item.page_age).toISOString() : null,
      });
    }

    return results;
  }
}

