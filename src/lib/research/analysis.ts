import type {
  CoverageStatus,
  EvidenceClaim,
  PossibleConflict,
  Requirement,
  RequirementCoverage,
  ResearchResult,
  Source,
  VerificationTask,
} from "./schema";
import { inferIntent } from "./intent";

export const SOURCE_RANKING_WEIGHTS = {
  relevance: 0.35,
  authority: 0.25,
  freshness: 0.2,
  directness: 0.1,
  corroboration: 0.1,
} as const;

export function rankSource(signals: Record<keyof typeof SOURCE_RANKING_WEIGHTS, number>) {
  const score = Object.entries(SOURCE_RANKING_WEIGHTS).reduce((total, [key, weight]) => {
    const value = signals[key as keyof typeof SOURCE_RANKING_WEIGHTS];
    return total + Math.min(1, Math.max(0, value)) * weight;
  }, 0);
  return { score, reasons: Object.entries(signals).filter(([, value]) => value >= 0.7).map(([key]) => key) };
}

function normalize(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase().replace(/\s+/g, " ") ?? "";
}

export function findPossibleConflicts(claims: EvidenceClaim[]): PossibleConflict[] {
  const conflicts: PossibleConflict[] = [];
  for (let leftIndex = 0; leftIndex < claims.length; leftIndex += 1) {
    const left = claims[leftIndex];
    if (!left.subject || !left.attribute || !left.value || !left.unit) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < claims.length; rightIndex += 1) {
      const right = claims[rightIndex];
      if (!right.subject || !right.attribute || !right.value || !right.unit) continue;
      const sameContext = normalize(left.subject) === normalize(right.subject)
        && normalize(left.attribute) === normalize(right.attribute)
        && normalize(left.unit) === normalize(right.unit)
        && normalize(left.jurisdiction) === normalize(right.jurisdiction)
        && normalize(left.condition) === normalize(right.condition)
        && normalize(left.period) === normalize(right.period);
      if (!sameContext || normalize(left.value) === normalize(right.value)) continue;
      const requirementId = left.requirementIds.find((id) => right.requirementIds.includes(id));
      if (!requirementId) continue;
      conflicts.push({
        id: `conflict-${left.id}-${right.id}`,
        requirementId,
        leftClaimId: left.id,
        rightClaimId: right.id,
        reason: "Both excerpts appear to describe the same subject, period and conditions, but give different values. Treat this as a possible conflict until checked against a current primary source.",
      });
    }
  }
  return conflicts;
}

export function classifyFreshness(source: Source, now = new Date()): { label: string; detail: string; warning: boolean } {
  const validTo = source.dates.validTo ? new Date(source.dates.validTo) : null;
  if (validTo && validTo.getTime() < now.getTime()) {
    return { label: "Validity period ended", detail: `The listed valid-through date was ${validTo.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}. This does not establish what applies now.`, warning: true };
  }
  const date = source.dates.modified ?? source.dates.published;
  if (!date) return { label: "No date found", detail: "The page did not provide a publication or update date.", warning: true };
  const ageDays = (now.getTime() - new Date(date).getTime()) / 86_400_000;
  if (ageDays > 365) return { label: "Older publication", detail: "Publication age alone does not prove the information is outdated; check its validity period and current notice.", warning: true };
  return { label: "Date available", detail: "A publication or update date is available; it does not by itself confirm that the information is current.", warning: false };
}

function reasonForStatus(status: CoverageStatus): string {
  switch (status) {
    case "covered": return "A text excerpt matched this requirement in the sources reviewed.";
    case "partial": return "Some relevant text was found, but it may not answer the full requirement.";
    case "missing_in_reviewed_sources": return "Not found in the sources reviewed. This does not mean the information does not exist.";
    case "conflicting": return "Comparable excerpts give different values; check both against a current primary source.";
    case "needs_verification": return "Evidence was found, but its period, date or context needs checking.";
  }
}

function classifyCoverage(requirement: Requirement, claims: EvidenceClaim[], conflicts: PossibleConflict[]): RequirementCoverage {
  const evidence = claims.filter((claim) => claim.requirementIds.includes(requirement.id));
  const conflict = conflicts.some((item) => item.requirementId === requirement.id);
  let status: CoverageStatus;
  if (conflict) status = "conflicting";
  else if (evidence.length === 0) status = "missing_in_reviewed_sources";
  else if (requirement.expectedPeriod && evidence.some((claim) => claim.period && normalize(claim.period) !== normalize(requirement.expectedPeriod))) status = "needs_verification";
  else if (evidence.some((claim) => claim.directness === "partial")) status = "partial";
  else status = "covered";
  return { requirementId: requirement.id, status, claimIds: evidence.map((claim) => claim.id), reason: reasonForStatus(status) };
}

function priorityFor(requirement: Requirement, status: CoverageStatus, time: "high" | "medium" | "low") {
  const uncertainty = status === "missing_in_reviewed_sources" || status === "conflicting" ? 3 : status === "needs_verification" || status === "partial" ? 2 : 1;
  const timeWeight = time === "high" ? 3 : time === "medium" ? 2 : 1;
  const impact = requirement.impact * uncertainty * timeWeight;
  const priority = impact >= 18 ? "high" : impact >= 10 ? "medium" : "low";
  const priorityReason = `${requirement.impact === 3 ? "High" : requirement.impact === 2 ? "Medium" : "Lower"} impact, ${uncertainty === 3 ? "substantial" : uncertainty === 2 ? "some" : "limited"} evidence uncertainty, and ${time} time sensitivity inform this triage label. It is not a risk probability.`;
  return { priority, priorityReason } as const;
}

export function buildResearchResult(input: {
  mode: "demo" | "url";
  query: string;
  requirements: Requirement[];
  sources: Source[];
  claims: EvidenceClaim[];
  limitations?: string[];
}): ResearchResult {
  const intent = inferIntent(input.query);
  const conflicts = findPossibleConflicts(input.claims);
  const coverage = input.requirements.map((requirement) => classifyCoverage(requirement, input.claims, conflicts));
  const withEvidence = coverage.filter((item) => item.claimIds.length > 0).length;
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  const tasks: VerificationTask[] = coverage.flatMap((item) => {
    if (item.status === "covered") return [];
    const requirement = input.requirements.find((candidate) => candidate.id === item.requirementId);
    if (!requirement) return [];
    const prioritized = priorityFor(requirement, item.status, intent.timeSensitivity);
    return [{
      id: `verify-${requirement.id}`,
      requirementId: requirement.id,
      title: item.status === "conflicting" ? `Resolve: ${requirement.title}` : `Verify: ${requirement.title}`,
      why: item.reason,
      nextSource: requirement.sourceType,
      ...prioritized,
    }];
  }).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const reviewedSourceCount = input.sources.filter((source) => source.status === "reviewed").length;
  const failedCount = input.sources.length - reviewedSourceCount;
  const status = reviewedSourceCount === 0 ? "blocked" : failedCount > 0 ? "partial" : "complete";
  const limitations = input.limitations ?? [];
  if (status === "blocked") limitations.push("No source page could be reviewed. Findings show gaps in the submitted pages only.");
  else if (status === "partial") limitations.push("Some submitted pages could not be reviewed. Findings cover only the pages that returned readable text.");
  limitations.push("This review uses deterministic text matching, not a live AI model or internet-wide search.");
  return {
    version: 1,
    mode: input.mode,
    query: input.query,
    intent: {
      category: intent.category,
      summary: input.query,
      timeSensitivity: intent.timeSensitivity,
      timeReason: intent.timeReason,
      highStakes: intent.highStakes,
    },
    requirements: input.requirements,
    sources: input.sources,
    claims: input.claims,
    coverage,
    conflicts,
    tasks,
    evidenceCoverage: {
      withEvidence,
      denominator: input.requirements.length,
      percentage: input.requirements.length ? Math.round((withEvidence / input.requirements.length) * 100) : 0,
      caveat: "This is the share of listed requirements with at least one excerpt. It is not a probability of correctness or a measure of all available information.",
    },
    reviewedSourceCount,
    status,
    limitations,
  };
}
