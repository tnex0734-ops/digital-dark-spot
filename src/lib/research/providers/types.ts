export interface SearchOptions {
  count?: number;
  acceptLanguage?: string | null;
  timeoutMs?: number;
  category?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  query: string;
  provider: string;
  publishedDate: string | null;
}

export interface SearchProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

export type ProviderFailureCode =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "unavailable"
  | "invalid_response";

export class SearchProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: ProviderFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "SearchProviderError";
  }
}

