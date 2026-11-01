import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { ResearchOrchestrator } from "@/lib/research/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 30;

const InputSchema = z
  .object({
    question: z.string().trim().min(8).max(2000),
    requirements: z.array(z.string().trim().min(1).max(160)).min(1).max(12).optional(),
    manualUrls: z.array(z.string().trim().min(1).max(2048)).max(5).optional(),
    urls: z.array(z.string().trim().min(1).max(2048)).max(5).optional(),
  })
  .strict();

class BodyTooLargeError extends Error {}

async function readBoundedBody(request: NextRequest, maxBytes = 32_000): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new BodyTooLargeError("Request body exceeds limit");
  }
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError("Request body exceeds limit");
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  return text ? JSON.parse(text) : {};
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await readBoundedBody(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json(
        { error: "The request body was too large." },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "The request could not be read." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const input = InputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Please enter a research question with at least 8 characters." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const orchestrator = new ResearchOrchestrator();
    const manualUrls = input.data.manualUrls || input.data.urls || [];
    const result = await orchestrator.run({
      question: input.data.question,
      requirements: input.data.requirements,
      manualUrls: manualUrls.length ? manualUrls : undefined,
      acceptLanguage: request.headers.get("accept-language"),
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Autonomous research could not be completed. Please try again or provide optional URLs.";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
