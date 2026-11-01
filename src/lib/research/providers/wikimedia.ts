import type { SearchOptions, SearchProvider, SearchResult } from "./types";
import { SearchProviderError } from "./types";

export class WikimediaSearchProvider implements SearchProvider {
  public readonly name = "Wikimedia Knowledge API";
  private readonly endpoint = "https://en.wikipedia.org/w/api.php";
  private readonly timeoutMs = 4_000;

  async isAvailable(): Promise<boolean> {
    return true; // No key required, public REST endpoint
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = Math.min(options.count ?? 5, 10);
    const timeout = options.timeoutMs ?? this.timeoutMs;
    const url = new URL(this.endpoint);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "search");
    url.searchParams.set("srsearch", query);
    url.searchParams.set("utf8", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("srlimit", String(limit));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "DigitalDarkSpot/1.0 (https://digitaldarkspot.vercel.app; research-preflight@digitaldarkspot.org)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new SearchProviderError(this.name, "timeout", "Wikimedia API request timed out.");
    }

    if (response.status === 429) {
      throw new SearchProviderError(this.name, "rate_limited", "Wikimedia API is currently busy.");
    }
    if (!response.ok) {
      throw new SearchProviderError(this.name, "unavailable", `Wikimedia API returned HTTP ${response.status}.`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new SearchProviderError(this.name, "invalid_response", "Failed to parse Wikimedia JSON response.");
    }

    const items =
      (data as { query?: { search?: Array<{ title?: string; snippet?: string; timestamp?: string }> } })
        ?.query?.search ?? [];
    return items.map((item) => {
      const title = String(item.title || "").trim();
      const rawSnippet = String(item.snippet || "");
      const cleanSnippet = rawSnippet.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
      const publishedDate = item.timestamp ? new Date(item.timestamp).toISOString() : null;

      return {
        title,
        url: articleUrl,
        domain: "en.wikipedia.org",
        snippet: cleanSnippet || `Encyclopedic reference for ${title}`,
        query,
        provider: this.name,
        publishedDate,
      };
    });
  }
}

