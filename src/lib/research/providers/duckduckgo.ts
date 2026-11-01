import { parse } from "node-html-parser";
import type { SearchOptions, SearchProvider, SearchResult } from "./types";
import { SearchProviderError } from "./types";

export class DuckDuckGoHtmlProvider implements SearchProvider {
  public readonly name = "DuckDuckGo Web Discovery";
  private readonly endpoint = "https://html.duckduckgo.com/html/";
  private readonly timeoutMs = 4_500;

  async isAvailable(): Promise<boolean> {
    return true; // No API key required
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = Math.min(options.count ?? 8, 12);
    const timeout = options.timeoutMs ?? this.timeoutMs;
    const url = new URL(this.endpoint);
    url.searchParams.set("q", query);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": options.acceptLanguage || "en-US,en;q=0.9",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new SearchProviderError(this.name, "timeout", "DuckDuckGo web request timed out.");
    }

    if (response.status === 429) {
      throw new SearchProviderError(this.name, "rate_limited", "DuckDuckGo search is temporarily rate limited.");
    }
    if (!response.ok) {
      throw new SearchProviderError(this.name, "unavailable", `DuckDuckGo returned HTTP ${response.status}.`);
    }

    let html: string;
    try {
      html = await response.text();
    } catch {
      throw new SearchProviderError(this.name, "invalid_response", "Failed to read DuckDuckGo response body.");
    }

    const root = parse(html);
    const resultElements = root.querySelectorAll(".result");
    const results: SearchResult[] = [];

    for (const el of resultElements) {
      const linkEl = el.querySelector(".result__title a");
      const snippetEl = el.querySelector(".result__snippet");
      if (!linkEl) continue;

      let href = linkEl.getAttribute("href") || "";
      if (href.includes("uddg=")) {
        const match = href.match(/uddg=([^&]+)/);
        if (match) {
          try {
            href = decodeURIComponent(match[1]);
          } catch {
            // keep raw href
          }
        }
      }

      if (!href.startsWith("https://")) continue;

      let domain = "";
      try {
        domain = new URL(href).hostname.toLowerCase();
      } catch {
        continue;
      }

      // Skip DuckDuckGo internal URLs or trackers
      if (domain.includes("duckduckgo.com")) continue;

      const title = linkEl.textContent.replace(/\s+/g, " ").trim().slice(0, 260);
      const snippet = snippetEl ? snippetEl.textContent.replace(/\s+/g, " ").trim().slice(0, 400) : "";

      if (title) {
        results.push({
          title,
          url: href,
          domain,
          snippet,
          query,
          provider: this.name,
          publishedDate: null,
        });
      }

      if (results.length >= limit) break;
    }

    return results;
  }
}

