import { describe, expect, it } from "vitest";
import { scholarshipDemo } from "@/lib/research/demo-data";
import { buildUIPlan, UIPlanSchema, validateUIPlan } from "@/lib/research/ui-plan";

describe("controlled results plans", () => {
  it("selects only approved components and known IDs", () => {
    const plan = buildUIPlan(scholarshipDemo);
    expect(UIPlanSchema.parse(plan)).toEqual(plan);
    expect(plan.components.length).toBeLessThanOrEqual(9);
    expect(plan.components.map((item) => item.type)).toContain("VerificationChecklist");
    expect(validateUIPlan(plan, scholarshipDemo).usedFallback).toBe(false);
  });

  it("uses the fixed fallback when a plan references unknown data", () => {
    const invalid = { layout: "scholarship", components: [{ type: "EvidenceCard", dataIds: ["invented-evidence"] }] };
    const result = validateUIPlan(invalid, scholarshipDemo);
    expect(result.usedFallback).toBe(true);
    expect(result.plan.components.map((item) => item.type)).toEqual(["ResearchSummary", "CoverageMatrix", "SourceList"]);
  });

  it("uses the fixed fallback when component counts or names are outside the registry", () => {
    const tooMany = { layout: "research", components: Array.from({ length: 10 }, () => ({ type: "ResearchSummary", dataIds: [] })) };
    const unknownType = { layout: "research", components: [{ type: "GeneratedCode", dataIds: [] }] };
    expect(validateUIPlan(tooMany, scholarshipDemo).usedFallback).toBe(true);
    expect(validateUIPlan(unknownType, scholarshipDemo).usedFallback).toBe(true);
  });
});
