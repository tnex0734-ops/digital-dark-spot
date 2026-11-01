import { z } from "zod";
import type { ResearchResult } from "./schema";

export const UIComponentTypeSchema = z.enum([
  "ResearchSummary",
  "ResearchProgress",
  "CoverageOverview",
  "CoverageMatrix",
  "EvidenceCard",
  "SourceCard",
  "SourceList",
  "SourceAuthorityIndicator",
  "InformationGapCard",
  "ConflictComparison",
  "FreshnessTimeline",
  "VerificationChecklist",
  "KnowledgeMap",
  "FollowUpResearchPanel",
  "IllustrationPanel",
  "ResearchLimitationsNotice",
]);

export const UIPlanSchema = z
  .object({
    layout: z.enum(["scholarship", "comparison", "academic", "policy", "research"]),
    components: z
      .array(
        z
          .object({
            type: UIComponentTypeSchema,
            dataIds: z.array(z.string().min(1).max(100)).max(30),
          })
          .strict(),
      )
      .min(1)
      .max(16),
  })
  .strict();

export type UIComponentType = z.infer<typeof UIComponentTypeSchema>;
export type UIPlan = z.infer<typeof UIPlanSchema>;

export function fallbackPlan(): UIPlan {
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
  const category = result.intent.category;
  const layout =
    category === "scholarship" || category === "eligibility"
      ? "scholarship"
      : category === "comparison"
        ? "comparison"
        : category === "academic"
          ? "academic"
          : category === "policy"
            ? "policy"
            : "research";

  const components: UIPlan["components"] = [
    { type: "ResearchSummary", dataIds: ["summary"] },
  ];

  if (layout === "scholarship") {
    components.push({ type: "CoverageOverview", dataIds: ["coverage"] });
    components.push({
      type: "CoverageMatrix",
      dataIds: result.requirements.map((item) => item.id),
    });
    components.push({ type: "SourceAuthorityIndicator", dataIds: ["authority"] });
    if (result.coverage.some((c) => c.status === "missing_in_reviewed_sources")) {
      components.push({
        type: "InformationGapCard",
        dataIds: result.coverage
          .filter((c) => c.status === "missing_in_reviewed_sources")
          .map((c) => c.requirementId),
      });
    }
    if (result.conflicts.length > 0) {
      components.push({
        type: "ConflictComparison",
        dataIds: result.conflicts.map((item) => item.id),
      });
    }
    if (result.sources.length > 0) {
      components.push({
        type: "FreshnessTimeline",
        dataIds: result.sources.map((item) => item.id),
      });
    }
    if (result.claims.length > 0) {
      components.push({
        type: "EvidenceCard",
        dataIds: result.claims.slice(0, 10).map((item) => item.id),
      });
    }
    if (result.tasks.length > 0) {
      components.push({
        type: "VerificationChecklist",
        dataIds: result.tasks.map((item) => item.id),
      });
    }
    components.push({
      type: "KnowledgeMap",
      dataIds: result.requirements.map((item) => item.id),
    });
    if (result.followUpActions && result.followUpActions.length > 0) {
      components.push({
        type: "FollowUpResearchPanel",
        dataIds: result.followUpActions.map((item) => item.id),
      });
    }
    components.push({ type: "SourceList", dataIds: result.sources.map((item) => item.id) });
    components.push({ type: "ResearchLimitationsNotice", dataIds: ["limitations"] });
  } else if (layout === "academic") {
    components.push({
      type: "KnowledgeMap",
      dataIds: result.requirements.map((item) => item.id),
    });
    components.push({ type: "CoverageOverview", dataIds: ["coverage"] });
    if (result.claims.length > 0) {
      components.push({
        type: "EvidenceCard",
        dataIds: result.claims.slice(0, 12).map((item) => item.id),
      });
    }
    components.push({
      type: "CoverageMatrix",
      dataIds: result.requirements.map((item) => item.id),
    });
    if (result.coverage.some((c) => c.status === "missing_in_reviewed_sources")) {
      components.push({
        type: "InformationGapCard",
        dataIds: result.coverage
          .filter((c) => c.status === "missing_in_reviewed_sources")
          .map((c) => c.requirementId),
      });
    }
    if (result.sources.length > 0) {
      components.push({
        type: "FreshnessTimeline",
        dataIds: result.sources.map((item) => item.id),
      });
    }
    if (result.tasks.length > 0) {
      components.push({
        type: "VerificationChecklist",
        dataIds: result.tasks.map((item) => item.id),
      });
    }
    if (result.followUpActions && result.followUpActions.length > 0) {
      components.push({
        type: "FollowUpResearchPanel",
        dataIds: result.followUpActions.map((item) => item.id),
      });
    }
    components.push({ type: "SourceList", dataIds: result.sources.map((item) => item.id) });
    components.push({ type: "ResearchLimitationsNotice", dataIds: ["limitations"] });
  } else if (layout === "comparison") {
    components.push({ type: "CoverageOverview", dataIds: ["coverage"] });
    components.push({
      type: "CoverageMatrix",
      dataIds: result.requirements.map((item) => item.id),
    });
    if (result.conflicts.length > 0) {
      components.push({
        type: "ConflictComparison",
        dataIds: result.conflicts.map((item) => item.id),
      });
    }
    if (result.claims.length > 0) {
      components.push({
        type: "EvidenceCard",
        dataIds: result.claims.slice(0, 10).map((item) => item.id),
      });
    }
    if (result.sources.length > 0) {
      components.push({
        type: "FreshnessTimeline",
        dataIds: result.sources.map((item) => item.id),
      });
    }
    if (result.tasks.length > 0) {
      components.push({
        type: "VerificationChecklist",
        dataIds: result.tasks.map((item) => item.id),
      });
    }
    if (result.followUpActions && result.followUpActions.length > 0) {
      components.push({
        type: "FollowUpResearchPanel",
        dataIds: result.followUpActions.map((item) => item.id),
      });
    }
    components.push({ type: "SourceList", dataIds: result.sources.map((item) => item.id) });
    components.push({ type: "ResearchLimitationsNotice", dataIds: ["limitations"] });
  } else if (layout === "policy") {
    components.push({ type: "SourceAuthorityIndicator", dataIds: ["authority"] });
    components.push({ type: "CoverageOverview", dataIds: ["coverage"] });
    components.push({
      type: "CoverageMatrix",
      dataIds: result.requirements.map((item) => item.id),
    });
    if (result.sources.length > 0) {
      components.push({
        type: "FreshnessTimeline",
        dataIds: result.sources.map((item) => item.id),
      });
    }
    if (result.claims.length > 0) {
      components.push({
        type: "EvidenceCard",
        dataIds: result.claims.slice(0, 10).map((item) => item.id),
      });
    }
    if (result.coverage.some((c) => c.status === "missing_in_reviewed_sources")) {
      components.push({
        type: "InformationGapCard",
        dataIds: result.coverage
          .filter((c) => c.status === "missing_in_reviewed_sources")
          .map((c) => c.requirementId),
      });
    }
    if (result.tasks.length > 0) {
      components.push({
        type: "VerificationChecklist",
        dataIds: result.tasks.map((item) => item.id),
      });
    }
    if (result.followUpActions && result.followUpActions.length > 0) {
      components.push({
        type: "FollowUpResearchPanel",
        dataIds: result.followUpActions.map((item) => item.id),
      });
    }
    components.push({ type: "SourceList", dataIds: result.sources.map((item) => item.id) });
    components.push({ type: "ResearchLimitationsNotice", dataIds: ["limitations"] });
  } else {
    // general exploration
    components.push({ type: "CoverageOverview", dataIds: ["coverage"] });
    components.push({
      type: "CoverageMatrix",
      dataIds: result.requirements.map((item) => item.id),
    });
    if (result.claims.length > 0) {
      components.push({
        type: "EvidenceCard",
        dataIds: result.claims.slice(0, 10).map((item) => item.id),
      });
    }
    if (result.sources.length > 0) {
      components.push({
        type: "FreshnessTimeline",
        dataIds: result.sources.map((item) => item.id),
      });
    }
    if (result.coverage.some((c) => c.status === "missing_in_reviewed_sources")) {
      components.push({
        type: "InformationGapCard",
        dataIds: result.coverage
          .filter((c) => c.status === "missing_in_reviewed_sources")
          .map((c) => c.requirementId),
      });
    }
    if (result.tasks.length > 0) {
      components.push({
        type: "VerificationChecklist",
        dataIds: result.tasks.map((item) => item.id),
      });
    }
    if (result.followUpActions && result.followUpActions.length > 0) {
      components.push({
        type: "FollowUpResearchPanel",
        dataIds: result.followUpActions.map((item) => item.id),
      });
    }
    components.push({ type: "SourceList", dataIds: result.sources.map((item) => item.id) });
    components.push({ type: "ResearchLimitationsNotice", dataIds: ["limitations"] });
  }

  return { layout, components };
}

export function validateUIPlan(
  candidate: unknown,
  result: ResearchResult,
): { plan: UIPlan; usedFallback: boolean } {
  const parsed = UIPlanSchema.safeParse(candidate);
  if (!parsed.success) return { plan: fallbackPlan(), usedFallback: true };

  const allowedIds = new Set([
    "summary",
    "illustration",
    "coverage",
    "authority",
    "limitations",
    "progress",
    ...result.requirements.map((item) => item.id),
    ...result.sources.map((item) => item.id),
    ...result.claims.map((item) => item.id),
    ...result.conflicts.map((item) => item.id),
    ...result.tasks.map((item) => item.id),
    ...(result.followUpActions?.map((item) => item.id) || []),
  ]);

  if (
    parsed.data.components.some((component) =>
      component.dataIds.some((id) => !allowedIds.has(id)),
    )
  ) {
    return { plan: fallbackPlan(), usedFallback: true };
  }

  return { plan: parsed.data, usedFallback: false };
}
