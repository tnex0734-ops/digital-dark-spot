import { describe, expect, it } from "vitest";
import { inferIntent } from "@/lib/research/intent";
import { buildResearchResult } from "@/lib/research/analysis";
import { buildUIPlan, validateUIPlan } from "@/lib/research/ui-plan";
import type { Source, EvidenceClaim } from "@/lib/research/schema";

const dummySource: Source = {
  id: "src-auth-1",
  title: "Authoritative Reference Documentation",
  domain: "example.org",
  url: "https://example.org/spec",
  origin: "automatic-search",
  status: "reviewed",
  headings: ["Architecture", "Key Mechanisms", "Trade-offs"],
  authoritySignal: "Official Documentation",
  retrievalNote: "Parsed successfully",
  dates: {
    published: "2026-01-15T00:00:00.000Z",
    modified: "2026-06-01T00:00:00.000Z",
    retrieved: "2026-11-01T00:00:00.000Z",
    validFrom: null,
    validTo: null,
  },
};

const dummyClaim: EvidenceClaim = {
  id: "claim-1",
  sourceId: "src-auth-1",
  requirementIds: ["req-1", "eligibility", "concept-core", "architecture-indexing"],
  statement: "The architecture provides logarithmic nearest-neighbor graph traversal and semantic similarity ranking.",
  excerpt: "The architecture provides logarithmic nearest-neighbor graph traversal and semantic similarity ranking.",
  subject: "Core Architecture",
  attribute: "mechanism",
  value: "HNSW graph indexing",
  evidenceProvenance: "page_excerpt",
  publishedAt: "2026-01-15T00:00:00.000Z",
  modifiedAt: "2026-06-01T00:00:00.000Z",
  retrievedAt: "2026-11-01T00:00:00.000Z",
};

describe("12-Query Research Relevance & Intent Regression Matrix", () => {
  // Query 1: Rhodes Scholarship (Genuine Scholarship)
  it("Query 1: Scholarship query generates genuine scholarship requirements and scholarship layout", () => {
    const query = "What are the eligibility criteria and deadline for the Rhodes Scholarship?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("scholarship_and_aid");
    expect(intent.categories).toContain("scholarship");
    expect(intent.requirements.some((r) => r.id === "eligibility")).toBe(true);
    expect(intent.requirements.some((r) => r.id === "deadline")).toBe(true);
    expect(intent.requirements.some((r) => r.id === "award-amount")).toBe(true);

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });
    const plan = buildUIPlan(result);
    expect(plan.layout).toBe("scholarship");
    expect(validateUIPlan(plan, result).usedFallback).toBe(false);
  });

  // Query 2: Solid-State Battery (Academic / Technology)
  it("Query 2: Solid-state battery query generates technological requirements without scholarship bias", () => {
    const query = "What are the latest developments in solid-state battery technology?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("technology_and_hardware");
    expect(intent.categories).toContain("academic");
    expect(intent.categories).not.toContain("scholarship");

    // Must NOT have scholarship requirements
    const reqIds = intent.requirements.map((r) => r.id);
    expect(reqIds).not.toContain("award-amount");
    expect(reqIds).not.toContain("renewal");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });
    expect(result.answer).toBeDefined();
    expect(result.answer?.headline).toContain("Solid-State Battery");
    expect(result.answer?.directAnswer.toLowerCase()).toContain("electrolyte");
    expect(result.answer?.directAnswer.toLowerCase()).not.toContain("scholarship");
    expect(result.answer?.directAnswer.toLowerCase()).not.toContain("application cycle");

    const plan = buildUIPlan(result);
    expect(plan.layout).toBe("academic");
    expect(validateUIPlan(plan, result).usedFallback).toBe(false);
  });

  // Query 3: React vs Vue (Comparison / Software)
  it("Query 3: React vs Vue comparison generates comparison layout and comparison table", () => {
    const query = "Compare React and Vue for building a large web application.";
    const intent = inferIntent(query);

    expect(intent.taskType).toBe("comparison");
    expect(intent.domain).toBe("software_engineering");
    expect(intent.categories).toContain("comparison");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });
    expect(result.answer?.comparisonRows).toBeDefined();
    expect(result.answer?.comparisonRows?.length).toBeGreaterThanOrEqual(3);
    expect(result.answer?.comparisonHeaders).toEqual(["React", "Vue"]);

    const plan = buildUIPlan(result);
    expect(plan.layout).toBe("comparison");
    expect(plan.components.map((c) => c.type)).toContain("ComparisonTable");
    expect(validateUIPlan(plan, result).usedFallback).toBe(false);
  });

  // Query 4: Vector Database (Factual / Concept)
  it("Query 4: Vector database query synthesizes indexing mechanisms without deadlines or application terms", () => {
    const query = "Explain how a vector database works.";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("software_engineering");
    expect(intent.taskType).toBe("factual_question");
    expect(intent.categories).not.toContain("scholarship");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    const answerText = `${result.answer?.directAnswer} ${result.answer?.keyPoints?.join(" ")}`;
    expect(answerText.toLowerCase()).toContain("embeddings");
    expect(answerText.toLowerCase()).toContain("approximate nearest neighbor");
    // Verify total absence of scholarship boilerplate
    expect(answerText.toLowerCase()).not.toContain("official deadlines");
    expect(answerText.toLowerCase()).not.toContain("submitting applications");
    expect(answerText.toLowerCase()).not.toContain("eligibility thresholds");
    expect(result.answer?.code).toBeDefined();
  });

  // Query 5: German Student Visa (Immigration & Visa)
  it("Query 5: German student visa produces visa requirements (Sperrkonto, APS) without scholarship grant terms", () => {
    const query = "What are the current requirements for an Indian student applying for a German student visa?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("immigration_and_visa");
    expect(intent.categories).not.toContain("scholarship");

    const reqIds = intent.requirements.map((r) => r.id);
    expect(reqIds).toContain("visa-eligibility");
    expect(reqIds).toContain("financial-proof");
    expect(reqIds).toContain("aps-documents");
    expect(reqIds).toContain("health-insurance");
    expect(reqIds).not.toContain("award-amount");
    expect(reqIds).not.toContain("renewal");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.headline).toContain("German Student Visa");
    expect(result.answer?.directAnswer).toContain("Sperrkonto");
    expect(result.answer?.directAnswer).toContain("APS");
    expect(result.answer?.steps).toBeDefined();
    expect(result.answer?.steps?.length).toBeGreaterThanOrEqual(3);

    const plan = buildUIPlan(result);
    expect(plan.layout).toBe("policy");
    expect(plan.components.map((c) => c.type)).toContain("StepByStepGuide");
    expect(validateUIPlan(plan, result).usedFallback).toBe(false);
  });

  // Query 6: Explainable AI (Academic Research)
  it("Query 6: Explainable AI research query addresses XAI taxonomies and trade-offs", () => {
    const query = "What are the major research challenges in explainable AI?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("artificial_intelligence");
    expect(intent.taskType).toBe("academic_research");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.headline).toContain("Explainable AI");
    const fullText = `${result.answer?.directAnswer} ${result.answer?.keyPoints?.join(" ")}`;
    expect(fullText).toContain("SHAP");
    expect(fullText).toContain("Interpretability");
  });

  // Query 7: Direct Air Capture (Environmental / Climate)
  it("Query 7: Direct Air Capture query explores sorbent vs solvent pathways and energy intensity", () => {
    const query = "What is the technological and economic status of direct air carbon capture?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("environment_and_climate");
    expect(intent.categories).not.toContain("scholarship");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.headline).toContain("Direct Air");
    const fullText = `${result.answer?.directAnswer} ${result.answer?.keyPoints?.join(" ")}`;
    expect(fullText.toLowerCase()).toContain("sorbent");
    expect(fullText.toLowerCase()).toContain("mineralization");
  });

  // Query 8: Google Pixel vs Samsung Galaxy (Comparison)
  it("Query 8: Smartphone comparison provides structured camera and hardware trade-offs", () => {
    const query = "Compare Google Pixel and Samsung Galaxy smartphones for photography and updates.";
    const intent = inferIntent(query);

    expect(intent.taskType).toBe("comparison");
    expect(intent.domain).toBe("technology_and_hardware");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.comparisonRows).toBeDefined();
    expect(result.answer?.comparisonRows?.length).toBeGreaterThanOrEqual(3);
    const plan = buildUIPlan(result);
    expect(plan.layout).toBe("comparison");
    expect(validateUIPlan(plan, result).usedFallback).toBe(false);
  });

  // Query 9: SaaS Subscription Pricing Transition (Decision Support)
  it("Query 9: SaaS subscription pricing risks analyzes cash flow trough and churn sensitivity", () => {
    const query = "What are the risks of transitioning to a SaaS subscription pricing model?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("business_and_finance");
    expect(intent.taskType).toBe("decision_support");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.headline).toContain("SaaS Subscription");
    const fullText = `${result.answer?.directAnswer} ${result.answer?.keyPoints?.join(" ")}`;
    expect(fullText).toContain("Swallow Tail");
    expect(fullText).toContain("CAC");
  });

  // Query 10: Publish Next.js on Vercel (How-to / Procedural)
  it("Query 10: Deploy Next.js to Vercel provides step-by-step instructions and CLI commands", () => {
    const query = "How do I publish a Next.js application on Vercel?";
    const intent = inferIntent(query);

    expect(intent.taskType).toBe("how_to");
    expect(intent.domain).toBe("software_engineering");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.steps).toBeDefined();
    expect(result.answer?.steps?.length).toBeGreaterThanOrEqual(4);
    expect(result.answer?.code).toBeDefined();
    expect(result.answer?.code?.language).toBe("bash");
  });

  // Query 11: Recent Changes in TypeScript (Current Info / Tech)
  it("Query 11: TypeScript recent changes covers TS 5.x features like satisfies and const type parameters", () => {
    const query = "What are the latest changes in TypeScript?";
    const intent = inferIntent(query);

    expect(intent.domain).toBe("software_engineering");

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.answer?.headline).toContain("TypeScript");
    const fullText = `${result.answer?.directAnswer} ${result.answer?.keyPoints?.join(" ")}`;
    expect(fullText).toContain("satisfies");
    expect(result.answer?.code).toBeDefined();
  });

  // Query 12: Ambiguous Query (Apple Disambiguation)
  it("Query 12: Underspecified query 'Apple' triggers high ambiguity flag, provisional interpretation, and clarifying question", () => {
    const query = "Tell me about Apple.";
    const intent = inferIntent(query);

    expect(intent.ambiguity).toBe("high");
    expect(intent.clarifyingQuestion).toBeDefined();
    expect(intent.clarifyingQuestion).toContain("Apple Inc.");
    expect(intent.provisionalInterpretation).toBeDefined();

    const result = buildResearchResult({
      mode: "web-search",
      query,
      requirements: intent.requirements,
      sources: [dummySource],
      claims: [dummyClaim],
    });

    expect(result.intent.ambiguity).toBe("high");
    expect(result.intent.clarifyingQuestion).toBeDefined();
    expect(result.answer?.headline).toContain("Disambiguation Required");
    expect(result.answer?.directAnswer).toContain("Apple Inc.");
  });
});
