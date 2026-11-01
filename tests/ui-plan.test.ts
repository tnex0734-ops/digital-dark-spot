import { describe, expect, it } from "vitest";
import { scholarshipDemo } from "@/lib/research/demo-data";
import { buildUIPlan, UIPlanSchema, validateUIPlan } from "@/lib/research/ui-plan";
import { buildResearchResult } from "@/lib/research/analysis";
import type { Requirement, Source } from "@/lib/research/schema";

const dummyReq: Requirement = {
  id: "req-1",
  title: "Test Requirement",
  reason: "Test reason",
  sourceType: "Test source",
  keywords: ["test"],
  impact: 2,
};

const dummySource: Source = {
  id: "src-1",
  title: "Test Source",
  domain: "example.org",
  url: "https://example.org",
  origin: "user-provided",
  status: "reviewed",
  headings: [],
  authoritySignal: "Unknown",
  retrievalNote: "Test",
  dates: { published: null, modified: null, retrieved: "2026-11-01T00:00:00.000Z", validFrom: null, validTo: null },
};

describe("controlled results plans and Generative UI variations", () => {
  it("selects only approved components and known IDs for scholarship intent", () => {
    const plan = buildUIPlan(scholarshipDemo);
    expect(UIPlanSchema.parse(plan)).toEqual(plan);
    expect(plan.components.length).toBeLessThanOrEqual(16);
    expect(plan.layout).toBe("scholarship");
    expect(plan.components.map((item) => item.type)).toContain("VerificationChecklist");
    expect(validateUIPlan(plan, scholarshipDemo).usedFallback).toBe(false);
  });

  it("selects distinct layouts and component sets for different intents (Test D)", () => {
    // 1. Comparison Intent
    const comparisonResult = buildResearchResult({
      mode: "web-search",
      query: "Compare the latest publicly available specifications of two smartphones",
      requirements: [dummyReq],
      sources: [dummySource],
      claims: [],
    });
    const comparisonPlan = buildUIPlan(comparisonResult);
    expect(comparisonPlan.layout).toBe("comparison");
    expect(validateUIPlan(comparisonPlan, comparisonResult).usedFallback).toBe(false);

    // 2. Academic / Scientific Intent
    const academicResult = buildResearchResult({
      mode: "web-search",
      query: "What are the latest developments in solid-state battery technology?",
      requirements: [dummyReq],
      sources: [dummySource],
      claims: [],
    });
    const academicPlan = buildUIPlan(academicResult);
    expect(academicPlan.layout).toBe("academic");
    expect(academicPlan.components.map((c) => c.type)).toContain("KnowledgeMap");
    expect(validateUIPlan(academicPlan, academicResult).usedFallback).toBe(false);

    // 3. Policy Intent
    const policyResult = buildResearchResult({
      mode: "web-search",
      query: "What are the official policy requirements for public healthcare subsidy?",
      requirements: [dummyReq],
      sources: [dummySource],
      claims: [],
    });
    const policyPlan = buildUIPlan(policyResult);
    expect(policyPlan.layout).toBe("policy");
    expect(validateUIPlan(policyPlan, policyResult).usedFallback).toBe(false);

    // All three layouts are different
    expect(comparisonPlan.layout).not.toBe(academicPlan.layout);
    expect(academicPlan.layout).not.toBe(policyPlan.layout);
  });

  it("uses the fixed fallback when a plan references unknown data", () => {
    const invalid = { layout: "scholarship", components: [{ type: "EvidenceCard", dataIds: ["invented-evidence"] }] };
    const result = validateUIPlan(invalid, scholarshipDemo);
    expect(result.usedFallback).toBe(true);
    expect(result.plan.components.map((item) => item.type)).toEqual(["ResearchSummary", "CoverageMatrix", "SourceList"]);
  });

  it("uses the fixed fallback when component counts or names are outside the registry", () => {
    const tooMany = { layout: "research", components: Array.from({ length: 20 }, () => ({ type: "ResearchSummary", dataIds: [] })) };
    const unknownType = { layout: "research", components: [{ type: "GeneratedCode", dataIds: [] }] };
    expect(validateUIPlan(tooMany, scholarshipDemo).usedFallback).toBe(true);
    expect(validateUIPlan(unknownType, scholarshipDemo).usedFallback).toBe(true);
  });
});
