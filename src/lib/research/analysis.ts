import type {
  Citation,
  CoverageStatus,
  DirectAnswer,
  DiscoveredSource,
  EvidenceClaim,
  FollowUpAction,
  PossibleConflict,
  Requirement,
  RequirementCoverage,
  ResearchResult,
  SearchSummary,
  Source,
  VerificationTask,
} from "./schema";
import { inferIntent } from "./intent";
import { synthesizeAnswer } from "./answer-engine";

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
    if (!left.subject || !left.attribute || !left.value) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < claims.length; rightIndex += 1) {
      const right = claims[rightIndex];
      if (!right.subject || !right.attribute || !right.value) continue;
      // If units exist on both, they must match to be directly comparable
      if (left.unit && right.unit && normalize(left.unit) !== normalize(right.unit)) continue;

      const sameContext =
        normalize(left.subject) === normalize(right.subject) &&
        normalize(left.attribute) === normalize(right.attribute) &&
        normalize(left.jurisdiction) === normalize(right.jurisdiction) &&
        normalize(left.condition) === normalize(right.condition) &&
        normalize(left.period) === normalize(right.period);

      if (!sameContext || normalize(left.value) === normalize(right.value)) continue;

      const requirementId = left.requirementIds.find((id) => right.requirementIds.includes(id));
      if (!requirementId) continue;

      conflicts.push({
        id: `conflict-${left.id}-${right.id}`,
        requirementId,
        leftClaimId: left.id,
        rightClaimId: right.id,
        reason: `Both excerpts appear to describe '${left.attribute}' for '${left.subject}' in comparable context (${left.period || "current cycle"}), but state different values ('${left.value}' vs '${right.value}'). Verify against the official primary source.`,
      });
    }
  }
  return conflicts;
}

export function classifyFreshness(source: Source, now = new Date()): { label: string; detail: string; warning: boolean; basisField: string } {
  const validTo = source.dates.validTo ? new Date(source.dates.validTo) : null;
  if (validTo && validTo.getTime() < now.getTime()) {
    return {
      label: "Validity period ended",
      detail: `The listed valid-through date was ${validTo.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}. This source may describe an expired cycle.`,
      warning: true,
      basisField: "validTo",
    };
  }

  const modified = source.dates.modified ? new Date(source.dates.modified) : null;
  if (modified) {
    const ageDays = (now.getTime() - modified.getTime()) / 86_400_000;
    if (ageDays > 365) {
      return {
        label: "Modified over 1 year ago",
        detail: `Last modified on ${modified.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}. Details may have changed in subsequent updates.`,
        warning: true,
        basisField: "modified",
      };
    }
    return {
      label: "Recently modified",
      detail: `Last modified on ${modified.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}.`,
      warning: false,
      basisField: "modified",
    };
  }

  const published = source.dates.published ? new Date(source.dates.published) : null;
  if (published) {
    const ageDays = (now.getTime() - published.getTime()) / 86_400_000;
    if (ageDays > 365) {
      return {
        label: "Older publication",
        detail: `Published on ${published.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}. Publication age alone does not prove information is invalid, but current cycle terms should be confirmed.`,
        warning: true,
        basisField: "published",
      };
    }
    return {
      label: "Published within 1 year",
      detail: `Published on ${published.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}.`,
      warning: false,
      basisField: "published",
    };
  }

  return {
    label: "No date found",
    detail: "The source page did not disclose a publication, modification, or validity date.",
    warning: true,
    basisField: "none",
  };
}

function reasonForStatus(status: CoverageStatus): string {
  switch (status) {
    case "covered":
      return "Direct supporting excerpts were found in the reviewed sources.";
    case "partial":
      return "Some related text was found, but key specifics or complete criteria were not found in reviewed sources.";
    case "missing_in_reviewed_sources":
      return "Not found in the sources reviewed. This means reviewed sources did not contain this information, not that it does not exist.";
    case "conflicting":
      return "Reviewed sources provide conflicting or divergent statements for this requirement. Check against an authoritative primary source.";
    case "needs_verification":
      return "Evidence was located, but its applicability period, version, or conditions require confirmation.";
  }
}

function classifyCoverage(
  requirement: Requirement,
  claims: EvidenceClaim[],
  conflicts: PossibleConflict[],
): RequirementCoverage {
  const evidence = claims.filter((claim) => claim.requirementIds.includes(requirement.id));
  const conflict = conflicts.some((item) => item.requirementId === requirement.id);
  let status: CoverageStatus;

  if (conflict) {
    status = "conflicting";
  } else if (evidence.length === 0) {
    status = "missing_in_reviewed_sources";
  } else if (requirement.expectedPeriod && evidence.some((claim) => claim.period && normalize(claim.period) !== normalize(requirement.expectedPeriod))) {
    status = "needs_verification";
  } else if (evidence.some((claim) => claim.directness === "partial")) {
    status = "partial";
  } else {
    status = "covered";
  }

  return {
    requirementId: requirement.id,
    status,
    claimIds: evidence.map((claim) => claim.id),
    reason: reasonForStatus(status),
  };
}

function priorityFor(
  requirement: Requirement,
  status: CoverageStatus,
  timeSensitivity: "high" | "medium" | "low",
) {
  const uncertainty =
    status === "missing_in_reviewed_sources" || status === "conflicting"
      ? 3
      : status === "needs_verification" || status === "partial"
        ? 2
        : 1;
  const timeWeight = timeSensitivity === "high" ? 3 : timeSensitivity === "medium" ? 2 : 1;
  const impact = requirement.impact * uncertainty * timeWeight;
  const priority = impact >= 18 ? "high" : impact >= 10 ? "medium" : "low";
  const priorityReason = `${requirement.impact === 3 ? "High" : requirement.impact === 2 ? "Medium" : "Lower"} impact (${requirement.impact}/3), ${uncertainty === 3 ? "high" : uncertainty === 2 ? "moderate" : "low"} uncertainty, and ${timeSensitivity} time sensitivity indicate ${priority} triage priority.`;

  return { priority, priorityReason } as const;
}

export function generateFollowUpActions(
  requirements: Requirement[],
  coverage: RequirementCoverage[],
  conflicts: PossibleConflict[],
): FollowUpAction[] {
  const actions: FollowUpAction[] = [];

  // Actions for conflicts first
  for (const conflict of conflicts.slice(0, 2)) {
    const req = requirements.find((r) => r.id === conflict.requirementId);
    if (req) {
      actions.push({
        id: `followup-${conflict.id}`,
        title: `Investigate conflict: ${req.title}`,
        description: `Compare differing claims in ${req.sourceType} to determine the currently governing rule.`,
        targetRequirementId: req.id,
        suggestedQuery: `${req.title} official current notification`,
      });
    }
  }

  // Actions for missing critical requirements
  for (const cov of coverage.filter((c) => c.status === "missing_in_reviewed_sources")) {
    const req = requirements.find((r) => r.id === cov.requirementId);
    if (req && req.impact >= 2 && actions.length < 5) {
      actions.push({
        id: `followup-missing-${req.id}`,
        title: `Find ${req.title.toLowerCase()}`,
        description: `Not found in reviewed sources. Search ${req.sourceType} to fill this evidence gap.`,
        targetRequirementId: req.id,
        suggestedQuery: `official ${req.title} ${req.sourceType}`,
      });
    }
  }

  // Actions for items needing verification
  for (const cov of coverage.filter((c) => c.status === "needs_verification" || c.status === "partial")) {
    const req = requirements.find((r) => r.id === cov.requirementId);
    if (req && actions.length < 5) {
      actions.push({
        id: `followup-verify-${req.id}`,
        title: `Verify ${req.title.toLowerCase()}`,
        description: `Check latest effective date or complete terms in ${req.sourceType}.`,
        targetRequirementId: req.id,
        suggestedQuery: `current ${req.title} latest update`,
      });
    }
  }

  return actions;
}

export function buildResearchResult(input: {
  mode: "demo" | "web-search" | "url";
  query: string;
  conversationId?: string;
  search?: SearchSummary;
  answer?: DirectAnswer;
  citations?: Citation[];
  relatedQuestions?: string[];
  requirements: Requirement[];
  sources: Source[];
  discoveredSources?: DiscoveredSource[];
  claims: EvidenceClaim[];
  limitations?: string[];
  createdAt?: string;
}): ResearchResult {
  const intent = inferIntent(input.query);
  const conflicts = findPossibleConflicts(input.claims);
  const coverage = input.requirements.map((requirement) =>
    classifyCoverage(requirement, input.claims, conflicts),
  );
  const withEvidence = coverage.filter((item) => item.claimIds.length > 0).length;

  const answerPayload = input.answer
    ? {
        answer: input.answer,
        citations: input.citations || [],
        relatedQuestions: input.relatedQuestions || [],
      }
    : synthesizeAnswer({
        query: input.query,
        topic: intent.topic,
        category: intent.category,
        sources: input.sources,
        claims: input.claims,
      });

  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  const tasks: VerificationTask[] = coverage
    .flatMap((item) => {
      if (item.status === "covered") return [];
      const requirement = input.requirements.find((candidate) => candidate.id === item.requirementId);
      if (!requirement) return [];
      const prioritized = priorityFor(requirement, item.status, intent.timeSensitivity);
      return [
        {
          id: `verify-${requirement.id}`,
          requirementId: requirement.id,
          title: item.status === "conflicting" ? `Resolve: ${requirement.title}` : `Verify: ${requirement.title}`,
          why: item.reason,
          nextSource: requirement.sourceType,
          ...prioritized,
        },
      ];
    })
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const followUpActions = generateFollowUpActions(input.requirements, coverage, conflicts);

  const reviewedSources = input.sources.filter((source) => source.status === "reviewed");
  const reviewedSourceCount = reviewedSources.length;
  const failedCount = input.sources.filter((s) => s.status !== "reviewed" && s.status !== "not_reviewed").length;
  const status =
    reviewedSourceCount === 0 ? "blocked" : failedCount > 0 ? "partial" : "complete";

  const limitations = input.limitations ?? [];
  if (status === "blocked") {
    limitations.push("No source pages could be successfully parsed. Findings represent information gaps in reviewed sources.");
  } else if (status === "partial") {
    limitations.push("Some selected candidate sources could not be parsed. Evidence reflects only successfully extracted pages.");
  }
  if (input.search) {
    limitations.push("Discovered pages were found via public search APIs. Evidence extraction is bounded to static HTML text without executing client-side scripts.");
  }
  limitations.push(
    "Automated research organizes evidence and detects gaps; it is not professional, legal, financial, or academic advice. Machines can make mistakes.",
  );

  return {
    version: 1,
    mode: input.mode,
    query: input.query,
    conversationId: input.conversationId,
    createdAt: input.createdAt || new Date().toISOString(),
    ...(input.search ? { search: input.search } : {}),
    answer: answerPayload.answer,
    citations: answerPayload.citations,
    relatedQuestions: answerPayload.relatedQuestions,
    intent: {
      category: intent.category,
      categories: intent.categories,
      summary: input.query,
      timeSensitivity: intent.timeSensitivity,
      timeReason: intent.timeReason,
      highStakes: intent.highStakes,
    },
    requirements: input.requirements,
    discoveredSources: input.discoveredSources,
    discoveredSourceCount: input.discoveredSources ? input.discoveredSources.length : input.sources.length,
    sources: input.sources,
    claims: input.claims,
    coverage,
    conflicts,
    tasks,
    followUpActions,
    evidenceCoverage: {
      withEvidence,
      denominator: input.requirements.length,
      percentage: input.requirements.length ? Math.round((withEvidence / input.requirements.length) * 100) : 0,
      caveat:
        "This is the share of listed requirements with at least one excerpt. It is not a probability of correctness or a measure of all available information.",
    },
    reviewedSourceCount,
    status,
    limitations,
  };
}
