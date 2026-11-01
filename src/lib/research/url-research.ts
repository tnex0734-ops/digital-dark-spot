import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https, { type RequestOptions } from "node:https";
import zlib from "node:zlib";
import { parse } from "node-html-parser";
import type { LookupFunction } from "node:net";
import type { EvidenceClaim, Requirement, Source } from "./schema";

export const MAX_URLS = 8;
export const MAX_HTML_BYTES = 1_000_000;
export const MAX_PAGE_MILLISECONDS = 4_500;
const MAX_REDIRECTS = 2;

export class PublicFetchError extends Error {
  constructor(public readonly code: "invalid_url" | "blocked" | "timeout" | "unsupported" | "empty", message: string) {
    super(message);
    this.name = "PublicFetchError";
  }
}

function isPublicV4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c, d] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || (b === 88 && c === 99) || (b === 168))) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 255 && b === 255 && c === 255 && d === 255) return false;
  return true;
}

function ipv6Groups(address: string): number[] | null {
  let value = address.toLowerCase().replace(/%.+$/, "");
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const ipv4 = value.slice(lastColon + 1).split(".").map(Number);
    if (ipv4.length !== 4 || ipv4.some((part) => part < 0 || part > 255 || !Number.isInteger(part))) return null;
    value = `${value.slice(0, lastColon)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }
  const pieces = value.split("::");
  if (pieces.length > 2) return null;
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((pieces.length === 1 && missing !== 0) || (pieces.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right].map((part) => Number.parseInt(part || "0", 16));
  return groups.length === 8 && groups.every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff) ? groups : null;
}

function isPublicV6(address: string): boolean {
  const groups = ipv6Groups(address);
  if (!groups) return false;
  const [first, second] = groups;
  // Only global unicast (2000::/3) is eligible; embedded and special-purpose ranges stay blocked.
  if (first < 0x2000 || first > 0x3fff) return false;
  if (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)) return false;
  if (first === 0x2002 || (first === 0x3fff && second <= 0x0fff)) return false;
  return true;
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? isPublicV4(address) : family === 6 ? isPublicV6(address) : false;
}

export function validateResearchUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new PublicFetchError("invalid_url", "Enter a complete HTTPS page URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new PublicFetchError("blocked", "Only public HTTPS pages on the standard port can be reviewed.");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || isIP(hostname) || hostname === "localhost" || /\.(local|internal|localhost)$/.test(hostname)) {
    throw new PublicFetchError("blocked", "Local, private and direct-IP destinations are not accepted.");
  }
  const labels = hostname.split(".");
  if (labels.length < 2 || labels.some((label) => !/^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(label))) {
    throw new PublicFetchError("invalid_url", "The page hostname is not a valid public domain name.");
  }
  url.hostname = hostname;
  url.hash = "";
  return url;
}

type AddressRecord = { address: string; family: 4 | 6 };
type Resolver = (hostname: string) => Promise<AddressRecord[]>;

const resolveDns: Resolver = async (hostname) => lookup(hostname, { all: true, verbatim: true }) as Promise<AddressRecord[]>;

export async function resolvePublicTarget(hostname: string, resolver: Resolver = resolveDns): Promise<AddressRecord> {
  let records: AddressRecord[];
  try {
    records = await resolver(hostname);
  } catch {
    throw new PublicFetchError("blocked", "The hostname could not be resolved to a public address.");
  }
  if (!records.length || records.some((record) => !isPublicIpAddress(record.address))) {
    throw new PublicFetchError("blocked", "The hostname resolves to a non-public or unsupported address.");
  }
  return records[0];
}

interface RawResponse {
  status: number;
  contentType: string;
  encoding: string;
  location: string | undefined;
  body: Buffer;
}

function requestPinned(url: URL, address: AddressRecord, timeoutMs: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const requestHolder: { current?: ReturnType<typeof https.request> } = {};
    const timer = setTimeout(() => {
      requestHolder.current?.destroy(new PublicFetchError("timeout", "The page took too long to respond."));
    }, Math.max(1, timeoutMs));
    const settle = (value: RawResponse | Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (value instanceof Error) reject(value);
      else resolve(value);
    };
    const pinnedLookup = ((_: string, options: unknown, callback: (...args: unknown[]) => void) => {
      if (typeof options === "object" && options !== null && "all" in options && (options as { all?: boolean }).all) {
        callback(null, [{ address: address.address, family: address.family }]);
      } else {
        callback(null, address.address, address.family);
      }
    }) as unknown as LookupFunction;
    const options: RequestOptions = {
      protocol: "https:",
      hostname: url.hostname,
      port: 443,
      servername: url.hostname,
      method: "GET",
      agent: false,
      lookup: pinnedLookup,
      path: `${url.pathname || "/"}${url.search}`,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9",
        "Accept-Encoding": "gzip, deflate, br, identity",
        "User-Agent": "DigitalDarkSpot/1.0 (Autonomous research evidence extraction)",
        Connection: "close",
      },
    };
    const request = https.request(options, (response) => {
      const status = response.statusCode ?? 0;
      const contentType = String(response.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      const encoding = String(response.headers["content-encoding"] ?? "identity").toLowerCase();
      const location = response.headers.location;
      const length = Number(response.headers["content-length"] ?? 0);
      response.on("error", (error) => settle(error));
      if ([301, 302, 303, 307, 308].includes(status) || status !== 200 || (contentType !== "text/html" && contentType !== "application/xhtml+xml")) {
        response.destroy();
        settle({ status, contentType, encoding, location, body: Buffer.alloc(0) });
        return;
      }
      if (Number.isFinite(length) && length > MAX_HTML_BYTES) {
        response.destroy();
        settle(new PublicFetchError("unsupported", "The page is larger than the 1 MB review limit."));
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > MAX_HTML_BYTES) {
          response.destroy();
          settle(new PublicFetchError("unsupported", "The page is larger than the 1 MB review limit."));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        const rawBody = Buffer.concat(chunks);
        let decompressedBody = rawBody;
        try {
          if (encoding === "gzip") decompressedBody = zlib.gunzipSync(rawBody);
          else if (encoding === "deflate") decompressedBody = zlib.inflateSync(rawBody);
          else if (encoding === "br") decompressedBody = zlib.brotliDecompressSync(rawBody);
        } catch {
          // If decompression fails, fall back to raw or fail
        }
        settle({ status, contentType, encoding, location, body: decompressedBody });
      });
    });
    requestHolder.current = request;
    request.on("error", (error) => settle(error));
    request.end();
  });
}

export interface ExtractedPage {
  title: string;
  headings: string[];
  text: string;
  sentences: string[];
  published: string | null;
  modified: string | null;
}

function safeDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractPage(html: string, url: URL): ExtractedPage {
  const root = parse(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true } });
  for (const node of root.querySelectorAll("script,style,noscript,template,svg,iframe,canvas,nav,footer,header,form,input,button,aside,[hidden],[aria-hidden='true']")) node.remove();
  for (const node of root.querySelectorAll("[style]")) {
    if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:\D|$)/i.test(node.getAttribute("style") ?? "")) node.remove();
  }
  for (const node of root.querySelectorAll("[class]")) {
    if (/(?:^|[\s_-])(hidden|sr-only|visually-hidden|screen-reader-only)(?:$|[\s_-])/i.test(node.getAttribute("class") ?? "")) node.remove();
  }
  const title = (root.querySelector("title")?.textContent ?? root.querySelector("h1")?.textContent ?? url.hostname).replace(/\s+/g, " ").trim().slice(0, 240) || url.hostname;
  const main = root.querySelector("main") ?? root.querySelector("article") ?? root.querySelector("body") ?? root;
  const text = main.textContent.replace(/\s+/g, " ").trim().slice(0, 80_000);
  const headings = main.querySelectorAll("h1,h2,h3,h4").map((node) => node.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 40);
  const publishedMeta = root.querySelector("meta[property='article:published_time']")?.getAttribute("content")
    ?? root.querySelector("meta[name='datePublished']")?.getAttribute("content")
    ?? root.querySelector("meta[name='publication_date']")?.getAttribute("content");
  const modifiedMeta = root.querySelector("meta[property='article:modified_time']")?.getAttribute("content")
    ?? root.querySelector("meta[name='dateModified']")?.getAttribute("content")
    ?? root.querySelector("meta[name='last-modified']")?.getAttribute("content");
  const publishedTime = root.querySelector("time[datetime]")?.getAttribute("datetime");
  const sentences = (text.match(/[^.!?…]+[.!?…]?/g) ?? []).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 24 && sentence.length <= 1200).slice(0, 120);
  return { title, headings, text, sentences, published: safeDate(publishedMeta ?? publishedTime), modified: safeDate(modifiedMeta) };
}

export interface FetchedPage {
  inputUrl: URL;
  page: ExtractedPage;
}

export async function fetchPublicHtml(input: string): Promise<FetchedPage> {
  const startedAt = Date.now();
  let current = validateResearchUrl(input);
  const inputUrl = current;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const remaining = MAX_PAGE_MILLISECONDS - (Date.now() - startedAt);
    if (remaining <= 0) throw new PublicFetchError("timeout", "The page took too long to respond.");
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    const target = await Promise.race([
      resolvePublicTarget(current.hostname),
      new Promise<never>((_, reject) => {
        dnsTimer = setTimeout(() => reject(new PublicFetchError("timeout", "The page hostname took too long to resolve.")), Math.min(1_500, remaining));
      }),
    ]).finally(() => clearTimeout(dnsTimer));
    const response = await requestPinned(current, target, MAX_PAGE_MILLISECONDS - (Date.now() - startedAt));
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.location || redirects === MAX_REDIRECTS) throw new PublicFetchError("blocked", "The page redirected too many times or omitted its destination.");
      try {
        current = validateResearchUrl(new URL(response.location, current).toString());
      } catch (error) {
        if (error instanceof PublicFetchError) throw new PublicFetchError("blocked", "A redirect target did not pass the public HTTPS checks.");
        throw new PublicFetchError("blocked", "The redirect target could not be validated.");
      }
      continue;
    }
    if (response.status === 401 || response.status === 403) throw new PublicFetchError("blocked", "The page declined the server request.");
    if (response.status !== 200) throw new PublicFetchError("unsupported", `The page returned HTTP ${response.status || "an unknown status"}.`);
    if (response.contentType !== "text/html" && response.contentType !== "application/xhtml+xml") {
      throw new PublicFetchError("unsupported", "Only text/html pages can be reviewed.");
    }
    const page = extractPage(response.body.toString("utf8"), current);
    if (page.text.length < 40) throw new PublicFetchError("empty", "No readable page text was found.");
    return { inputUrl, page };
  }
  throw new PublicFetchError("blocked", "The redirect limit was reached.");
}

function fold(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function makeClaims(
  sourceId: string,
  sentences: string[],
  requirements: Requirement[],
  provenance: "page_excerpt" | "search_snippet" | "user_provided" | "demo_fixture" = "page_excerpt",
): EvidenceClaim[] {
  const seen = new Set<string>();
  const matches: EvidenceClaim[] = [];
  for (const sentence of sentences) {
    const normalized = fold(sentence);
    if (!normalized || seen.has(normalized)) continue;
    const found = requirements.map((requirement) => ({
      requirement,
      count: requirement.keywords.filter((keyword) => keyword.length > 2 && normalized.includes(fold(keyword))).length,
    })).filter((item) => item.count > 0);
    if (!found.length) continue;
    seen.add(normalized);
    const bestCount = Math.max(...found.map((item) => item.count));
    const matchedRequirements = found.filter((item) => item.count === bestCount).map((item) => item.requirement);
    const requirementIds = matchedRequirements.map((r) => r.id);

    // Extract structured claim properties where possible
    const primaryReq = matchedRequirements[0];
    const attribute = primaryReq ? primaryReq.title : undefined;
    const subject = primaryReq?.title.split(/[:–-]/)[0]?.trim() || "Observed Topic";
    let value: string | undefined;
    let unit: string | undefined;
    let period: string | undefined;

    // Detect period (e.g. 2024-25, 2026, 2026-2027)
    const periodMatch = sentence.match(/\b(202\d(?:[–-](?:20)?2\d)?)\b/);
    if (periodMatch) period = periodMatch[1];

    // Detect currency / numerical value
    const valMatch = sentence.match(/(\$\s?[\d,]+(?:\.\d+)?|\b\d+(?:,\d+)*(?:\.\d+)?\s?(?:percent|%|hours|credits|months|days|years|USD|EUR|GBP|INR|Wh\/kg|mAh|Hz|mAh\/g)\b)/i);
    if (valMatch) {
      value = valMatch[1].trim();
      if (valMatch[1].startsWith("$")) unit = "currency";
      else if (valMatch[1].includes("%") || valMatch[1].toLowerCase().includes("percent")) unit = "percentage";
    }

    matches.push({
      id: `claim-${sourceId}-${matches.length + 1}`,
      sourceId,
      requirementIds,
      statement: `Page text matched: ${matchedRequirements.map((item) => item.title).join(", ")}. A text match does not establish guaranteed truth.`,
      excerpt: sentence.slice(0, 1200),
      method: "keyword-match",
      directness: bestCount > 1 ? "direct" : "partial",
      evidenceProvenance: provenance,
      supportStatus: bestCount > 1 ? "supported" : "partial",
      retrievedAt: new Date().toISOString(),
      subject,
      attribute,
      value,
      unit,
      period,
    });
    if (matches.length >= 40) break;
  }
  return matches;
}

export function authoritySignal(hostname: string, origin: Source["origin"] = "user-provided"): string {
  const host = hostname.toLowerCase();
  if (/\.(gov|mil)(\.[a-z]{2,})?$/i.test(host)) {
    return "Official public sector / government domain (.gov)";
  }
  if (/\.edu(\.[a-z]{2,})?$/i.test(host) || /\.ac\.[a-z]{2,}$/i.test(host)) {
    return "Accredited educational / academic domain (.edu)";
  }
  if (host === "en.wikipedia.org" || host.endsWith(".wikipedia.org")) {
    return "Open reference encyclopedia (Wikimedia Foundation)";
  }
  if (host.includes("doi.org") || host.includes("openalex.org") || host.includes("nature.com") || host.includes("sciencedirect.com") || host.includes("ieee.org") || host.includes("nih.gov")) {
    return "Academic literature or scientific publisher repository";
  }
  if (origin === "automatic-search") {
    return "Discovered via public search ranking; authority unverified";
  }
  return "Supplied URL; domain authority not assessed";
}

export async function reviewUrls(
  urls: string[],
  requirements: Requirement[],
  options: { origin?: Exclude<Source["origin"], "illustrative">; titles?: string[] } = {},
): Promise<{ sources: Source[]; claims: EvidenceClaim[] }> {
  if (!Array.isArray(urls) || urls.length < 1 || urls.length > MAX_URLS) {
    throw new PublicFetchError("invalid_url", `Add between one and ${MAX_URLS} public HTTPS page URLs.`);
  }
  const origin = options.origin ?? "user-provided";
  const sources: Source[] = new Array(urls.length);
  const claims: EvidenceClaim[] = [];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(3, urls.length) }, async () => {
    while (nextIndex < urls.length) {
      const index = nextIndex;
      nextIndex += 1;
      const retrieved = new Date().toISOString();
      const id = `source-${index + 1}`;
      try {
        const { inputUrl, page } = await fetchPublicHtml(urls[index]);
        const foundClaims = makeClaims(
          id,
          page.sentences,
          requirements,
          origin === "user-provided" ? "user_provided" : "page_excerpt",
        );
        claims.push(...foundClaims);
        const readable = page.text.length >= 40;
        const title = page.title.toLowerCase() === inputUrl.hostname.toLowerCase() ? options.titles?.[index] ?? page.title : page.title;
        sources[index] = {
          id,
          title: title.slice(0, 240),
          domain: inputUrl.hostname,
          url: inputUrl.toString(),
          origin,
          status: readable ? "reviewed" : "empty",
          headings: page.headings,
          authoritySignal: authoritySignal(inputUrl.hostname, origin),
          retrievalNote: `${origin === "automatic-search" ? "Discovered by autonomous search and fetched server-side" : "Requested by you from this server"}. Untrusted HTML parsed safely.`,
          dates: { published: page.published, modified: page.modified, retrieved, validFrom: null, validTo: null },
        };
      } catch (error) {
        const failure = error instanceof PublicFetchError ? error : new PublicFetchError("blocked", "The page could not be reviewed safely.");
        let submittedHost = "Submitted URL";
        try { submittedHost = new URL(urls[index]).hostname; } catch { /* Keep invalid URLs out of error details. */ }
        sources[index] = {
          id,
          title: (options.titles?.[index] ?? submittedHost).slice(0, 240),
          domain: submittedHost,
          url: null,
          origin,
          status: failure.code === "timeout" ? "timeout" : failure.code === "unsupported" ? "unsupported" : failure.code === "empty" ? "empty" : "blocked",
          error: failure.message,
          headings: [],
          authoritySignal: "Not assessed",
          retrievalNote: `${origin === "automatic-search" ? "Discovered by web search" : "Submitted URL"}; no page text was accepted.`,
          dates: { published: null, modified: null, retrieved, validFrom: null, validTo: null },
        };
      }
    }
  });
  await Promise.all(workers);
  return { sources, claims };
}
