import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { buildResearchResult } from "@/lib/research/analysis";
import { inferIntent, requirementsFromLabels } from "@/lib/research/intent";
import { PublicFetchError, reviewUrls } from "@/lib/research/url-research";
import { ResearchResultSchema } from "@/lib/research/schema";

export const runtime = "nodejs";
export const maxDuration = 15;

const InputSchema = z.object({
  question: z.string().trim().min(8).max(2000),
  requirements: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
  urls: z.array(z.string().trim().min(1).max(2048)).min(1).max(3),
}).strict();

class BodyTooLargeError extends Error {}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16_000) throw new BodyTooLargeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_000) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))) as unknown;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    return NextResponse.json({ error: "Cross-origin page review requests are not accepted." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const status = error instanceof BodyTooLargeError ? 413 : 400;
    return NextResponse.json({ error: status === 413 ? "Request is larger than the 16 KB limit." : "Request body must be valid JSON." }, { status, headers: { "Cache-Control": "no-store" } });
  }
  const input = InputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: "Add a question, one to three HTTPS page URLs, and at least one requirement." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const intent = inferIntent(input.data.question);
    const requirements = requirementsFromLabels(input.data.requirements, intent.category);
    const { sources, claims } = await reviewUrls(input.data.urls, requirements);
    const result = ResearchResultSchema.parse(buildResearchResult({ mode: "url", query: input.data.question, requirements, sources, claims }));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PublicFetchError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "The request could not be analyzed. Review your inputs and try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
