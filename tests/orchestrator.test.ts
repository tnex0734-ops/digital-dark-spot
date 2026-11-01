import { describe, expect, it } from "vitest";
import { inferIntent } from "@/lib/research/intent";
import { ResearchOrchestrator } from "@/lib/research/orchestrator";
import { MultiProviderOrchestrator } from "@/lib/research/providers/orchestrator";
import type { SearchProvider, SearchResult } from "@/lib/research/providers/types";
import { buildUIPlan, validateUIPlan } from "@/lib/research/ui-plan";
import { scholarshipDemo } from "@/lib/research/demo-data";
import { classifyFreshness, findPossibleConflicts } from "@/lib/research/analysis";
import type { EvidenceClaim } from "@/lib/research/schema";

class MockSearchProvider implements SearchProvider {
  constructor(
    public readonly name: string,
    private results: SearchResult[] = [],
    private available = true,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.available) throw new Error("Provider unavailable");
    return this.results.map((r) => ({ ...r, query }));
  }
}

describe("Acceptance Tests A through F", () => {
  // Test A — Autonomous scholarship research
  it("Test A: converts scholarship question into intent requirements, queries, and workspace without mandatory URLs", async () => {
    const question = "What should I verify before applying for a scholarship?";
    const intent = inferIntent(question);

    expect(intent.category).toBe("scholarship");
    expect(intent.timeSensitivity).toBe("high");
    expect(intent.requirements.length).toBeGreaterThanOrEqual(4);
    expect(intent.requirements.map((r) => r.id)).toContain("deadline");
    expect(intent.requirements.map((r) => r.id)).toContain("eligibility");
    expect(intent.queries.length).toBeGreaterThanOrEqual(3);

    // Mock live search with discovered sources
    const mockResults: SearchResult[] = [
      {
        title: "Official State Scholarship Portal Notice",
        url: "https://example.gov/scholarship-notice",
        domain: "example.gov",
        snippet: "Eligible applicants must maintain a 3.5 GPA and submit two recommendation letters.",
        query: intent.queries[0],
        provider: "Mock Government Index",
        publishedDate: "2026-08-01T00:00:00.000Z",
      },
      {
        title: "Higher Education Grant Guidelines",
        url: "https://example.edu/grants",
        domain: "example.edu",
        snippet: "Application deadline is March 15. Award covers full tuition.",
        query: intent.queries[1],
        provider: "Mock Academic Index",
        publishedDate: "2026-09-01T00:00:00.000Z",
      },
    ];

    const mockProvider = new MockSearchProvider("Mock Provider", mockResults);
    const mockDiscovery = new MultiProviderOrchestrator([mockProvider]);
    const orchestrator = new ResearchOrchestrator(mockDiscovery);

    // Run without manual URLs
    const result = await orchestrator.run({ question });

    expect(result.mode).toBe("web-search");
    expect(result.query).toBe(question);
    expect(result.requirements.length).toBeGreaterThanOrEqual(4);
    expect(result.discoveredSources?.length).toBeGreaterThanOrEqual(2);
    expect(result.coverage.length).toBe(result.requirements.length);

    // Verify scholarship Generative UI layout is selected
    const plan = buildUIPlan(result);
    expect(plan.layout).toBe("scholarship");
    expect(plan.components.map((c) => c.type)).toContain("CoverageMatrix");
    expect(plan.components.map((c) => c.type)).toContain("VerificationChecklist");
    expect(validateUIPlan(plan, result).usedFallback).toBe(false);
  });

  // Test B — Current technical research
  it("Test B: recognizes technical/academic intent, produces targeted queries, tracks dates and freshness basis", () => {
    const question = "What are the latest developments in solid-state battery technology?";
    const intent = inferIntent(question);

    expect(intent.category).toBe("academic");
    expect(intent.timeSensitivity).toBe("medium");
    expect(intent.queries.some((q) => q.includes("solid-state battery"))).toBe(true);

    // Freshness radar explains exact date basis
    const recentSource = {
      id: "src-recent",
      title: "Solid-state electrolyte paper",
      domain: "nature.com",
      url: "https://nature.com/articles/s123",
      origin: "automatic-search" as const,
      status: "reviewed" as const,
      headings: [],
      authoritySignal: "Academic",
      retrievalNote: "Test",
      dates: { published: "2026-05-10T00:00:00.000Z", modified: null, retrieved: "2026-11-01T00:00:00.000Z", validFrom: null, validTo: null },
    };

    const freshness = classifyFreshness(recentSource, new Date("2026-11-01T00:00:00.000Z"));
    expect(freshness.basisField).toBe("published");
    expect(freshness.warning).toBe(false);

    const oldSource = {
      ...recentSource,
      dates: { ...recentSource.dates, published: "2023-01-01T00:00:00.000Z" },
    };
    const oldFreshness = classifyFreshness(oldSource, new Date("2026-11-01T00:00:00.000Z"));
    expect(oldFreshness.basisField).toBe("published");
    expect(oldFreshness.warning).toBe(true);
    expect(oldFreshness.detail).toContain("Publication age alone does not prove information is invalid");
  });

  // Test C — Product comparison
  it("Test C: creates comparison intent, compares only contextual matches, avoids false contradictions", () => {
    const question = "Compare the latest publicly available specifications of two smartphones.";
    const intent = inferIntent(question);

    expect(intent.category).toBe("comparison");
    expect(intent.requirements.map((r) => r.id)).toContain("comparison-scope");
    expect(intent.requirements.map((r) => r.id)).toContain("key-attributes");

    // Two claims with DIFFERENT periods are not contradictions
    const claim2024: EvidenceClaim = {
      id: "c-1",
      sourceId: "s-1",
      requirementIds: ["key-attributes"],
      statement: "Battery capacity statement",
      excerpt: "The 2024 model features a 4500 mAh battery.",
      method: "keyword-match",
      directness: "direct",
      subject: "Phone Model",
      attribute: "battery capacity",
      value: "4500",
      unit: "mAh",
      period: "2024",
    };

    const claim2026: EvidenceClaim = {
      id: "c-2",
      sourceId: "s-2",
      requirementIds: ["key-attributes"],
      statement: "Battery capacity statement",
      excerpt: "The 2026 model upgrades to a 5200 mAh battery.",
      method: "keyword-match",
      directness: "direct",
      subject: "Phone Model",
      attribute: "battery capacity",
      value: "5200",
      unit: "mAh",
      period: "2026",
    };

    // Because periods differ, findPossibleConflicts should NOT declare a conflict
    expect(findPossibleConflicts([claim2024, claim2026])).toHaveLength(0);

    // If both refer to 2026 with different values, it IS a conflict
    const conflicting2026: EvidenceClaim = {
      ...claim2026,
      id: "c-3",
      value: "4800",
    };
    expect(findPossibleConflicts([claim2026, conflicting2026])).toHaveLength(1);
  });

  // Test E — Search provider failure
  it("Test E: simulates all live search providers failing without inventing results and preserving demo mode", async () => {
    const failingProvider = new MockSearchProvider("Failing Provider", [], false);
    const failingDiscovery = new MultiProviderOrchestrator([failingProvider]);
    const orchestrator = new ResearchOrchestrator(failingDiscovery);

    // Live search fails honestly with error, no fabricated results
    await expect(
      orchestrator.run({ question: "Research on an unsupported secret topic" }),
    ).rejects.toThrow();

    // But scholarship Demo Mode remains fully functional and isolated!
    expect(scholarshipDemo.mode).toBe("demo");
    expect(scholarshipDemo.requirements.length).toBeGreaterThan(0);
    expect(scholarshipDemo.sources.length).toBeGreaterThan(0);
    expect(scholarshipDemo.conflicts.length).toBeGreaterThan(0);
  });
});

