import { describe, expect, it } from "vitest";
import { buildResearchResult, classifyFreshness, findPossibleConflicts, rankSource, SOURCE_RANKING_WEIGHTS } from "@/lib/research/analysis";
import { inferIntent } from "@/lib/research/intent";
import type { EvidenceClaim, Requirement, Source } from "@/lib/research/schema";

const requirement: Requirement = { id: "docs", title: "Required documents", reason: "Check the current document list.", sourceType: "Official checklist", keywords: ["document"], impact: 3, expectedPeriod: "2026–27" };
const source: Source = {
  id: "source-a", title: "Example page", domain: "example.org", url: "https://example.org/", origin: "user-provided", status: "reviewed", headings: ["Details"], authoritySignal: "Authority not assessed", retrievalNote: "Text only.",
  dates: { published: "2024-01-01T00:00:00.000Z", modified: null, retrieved: "2026-11-01T00:00:00.000Z", validFrom: null, validTo: null },
};

function claim(overrides: Partial<EvidenceClaim> = {}): EvidenceClaim {
  return {
    id: "claim-a", sourceId: "source-a", requirementIds: ["docs"], statement: "Text matched the requirement.", excerpt: "The example page says the applicant should provide documents.", method: "keyword-match", directness: "direct",
    subject: "Example programme", attribute: "letter count", value: "2", unit: "letters", jurisdiction: "North region", condition: "first-time applicant", period: "2026–27", ...overrides,
  };
}

describe("intent and evidence analysis", () => {
  it("suggests a scholarship checklist and time sensitivity without a remote model", () => {
    const result = inferIntent("What should I verify before applying for a scholarship?");
    expect(result.category).toBe("scholarship");
    expect(result.timeSensitivity).toBe("high");
    expect(result.requirements.map((item) => item.id)).toContain("deadline");
  });

  it("detects a conflict only when subject, unit, place, condition and period match", () => {
    expect(findPossibleConflicts([claim(), claim({ id: "claim-b", sourceId: "source-b", value: "1" })])).toHaveLength(1);
    expect(findPossibleConflicts([claim(), claim({ id: "claim-b", value: "1", period: "2025–26" })])).toHaveLength(0);
    expect(findPossibleConflicts([claim(), claim({ id: "claim-b", value: "1", unit: "applications" })])).toHaveLength(0);
    expect(findPossibleConflicts([claim(), claim({ id: "claim-b", value: "1", condition: "renewal applicant" })])).toHaveLength(0);
  });

  it("keeps missing information scoped to the reviewed set and reports a transparent denominator", () => {
    const result = buildResearchResult({ mode: "url", query: "Check the scholarship documents", requirements: [requirement], sources: [source], claims: [] });
    expect(result.coverage[0]?.status).toBe("missing_in_reviewed_sources");
    expect(result.coverage[0]?.reason).toContain("Not found in the sources reviewed");
    expect(result.evidenceCoverage).toMatchObject({ withEvidence: 0, denominator: 1, percentage: 0 });
    expect(result.evidenceCoverage.caveat).toContain("not a probability");
  });

  it("keeps publication age separate from validity and calls an ended validity period explicitly", () => {
    expect(classifyFreshness(source, new Date("2026-11-01T00:00:00.000Z")).label).toBe("Older publication");
    expect(classifyFreshness({ ...source, dates: { ...source.dates, validTo: "2025-01-01T00:00:00.000Z" } }, new Date("2026-11-01T00:00:00.000Z")).label).toBe("Validity period ended");
    expect(classifyFreshness({ ...source, dates: { ...source.dates, published: null } }, new Date("2026-11-01T00:00:00.000Z")).label).toBe("No date found");
  });

  it("uses documented provisional ranking weights without calling them probabilities", () => {
    expect(Object.values(SOURCE_RANKING_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
    expect(rankSource({ relevance: 1, authority: 1, freshness: 1, directness: 1, corroboration: 1 }).score).toBe(1);
    expect(rankSource({ relevance: 3, authority: 0, freshness: 0, directness: 0, corroboration: 0 }).score).toBeLessThanOrEqual(0.35);
  });
});
