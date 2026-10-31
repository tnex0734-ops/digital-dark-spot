import { z } from "zod";
import type { ResearchResult } from "./schema";

export const UIComponentTypeSchema = z.enum([
  "ResearchSummary",
  "CoverageMatrix",
  "EvidenceCard",
  "ConflictComparison",
  "FreshnessTimeline",
  "SourceList",
  "KnowledgeMap",
  "VerificationChecklist",
  "IllustrationPanel",
]);

export const UIPlanSchema = z.object({
  layout: z.enum(["scholarship", "comparison", "policy", "research"]),
  components: z.array(z.object({
    type: UIComponentTypeSchema,
    dataIds: z.array(z.string().min(1).max(100)).max(20),
  }).strict()).min(1).max(9),
}).strict();

export type UIComponentType = z.infer<typeof UIComponentTypeSchema>;
export type UIPlan = z.infer<typeof UIPlanSchema>;

function fallbackPlan(): UIPlan {
  return {
    layout: "research",
    components: [
      { type: "ResearchSummary", dataIds: ["summary"] },
      { type: "CoverageMatrix", dataIds: [] },
      { type: "SourceList", dataIds: [] },
    ],
  };
}

export function buildUIPlan(result: ResearchResult): UIPlan {
  const layout = result.intent.category === "scholarship" || result.intent.category === "eligibility"
    ? "scholarship"
    : result.intent.category === "comparison"
      ? "comparison"
      : result.intent.category === "policy" ? "policy" : "research";
  const components: UIPlan["components"] = [
    { type: "ResearchSummary", dataIds: ["summary"] },
    { type: "CoverageMatrix", dataIds: result.requirements.map((item) => item.id) },
    { type: "IllustrationPanel", dataIds: ["illustration"] },
    { type: "KnowledgeMap", dataIds: result.requirements.map((item) => item.id) },
  ];
  if (result.claims.length) components.push({ type: "EvidenceCard", dataIds: result.claims.slice(0, 8).map((item) => item.id) });
  if (result.conflicts.length) components.push({ type: "ConflictComparison", dataIds: result.conflicts.map((item) => item.id) });
  if (result.sources.length) components.push({ type: "FreshnessTimeline", dataIds: result.sources.map((item) => item.id) });
  components.push({ type: "SourceList", dataIds: result.sources.map((item) => item.id) });
  if (result.tasks.length) components.push({ type: "VerificationChecklist", dataIds: result.tasks.map((item) => item.id) });
  return { layout, components };
}

export function validateUIPlan(candidate: unknown, result: ResearchResult): { plan: UIPlan; usedFallback: boolean } {
  const parsed = UIPlanSchema.safeParse(candidate);
  if (!parsed.success) return { plan: fallbackPlan(), usedFallback: true };
  const allowedIds = new Set([
    "summary",
    "illustration",
    ...result.requirements.map((item) => item.id),
    ...result.sources.map((item) => item.id),
    ...result.claims.map((item) => item.id),
    ...result.conflicts.map((item) => item.id),
    ...result.tasks.map((item) => item.id),
  ]);
  if (parsed.data.components.some((component) => component.dataIds.some((id) => !allowedIds.has(id)))) {
    return { plan: fallbackPlan(), usedFallback: true };
  }
  return { plan: parsed.data, usedFallback: false };
}
