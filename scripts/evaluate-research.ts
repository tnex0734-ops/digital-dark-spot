import { inferIntent } from "../src/lib/research/intent";
import { buildResearchResult } from "../src/lib/research/analysis";
import { buildUIPlan, validateUIPlan } from "../src/lib/research/ui-plan";
import type { EvidenceClaim, Source } from "../src/lib/research/schema";

interface BenchmarkTestCase {
  id: string;
  query: string;
  expectedTaskType: string;
  expectedDomain: string;
  expectedLayout: string;
  scholarshipForbidden: boolean;
  expectedContentTerms: string[];
  requiresAmbiguityCheck?: boolean;
}

const testCases: BenchmarkTestCase[] = [
  {
    id: "TC-01",
    query: "What are the eligibility criteria and deadline for the Rhodes Scholarship?",
    expectedTaskType: "requirements_check",
    expectedDomain: "scholarship_and_aid",
    expectedLayout: "scholarship",
    scholarshipForbidden: false,
    expectedContentTerms: ["eligibility", "deadline", "award"],
  },
  {
    id: "TC-02",
    query: "What are the latest developments in solid-state battery technology?",
    expectedTaskType: "current_information",
    expectedDomain: "technology_and_hardware",
    expectedLayout: "academic",
    scholarshipForbidden: true,
    expectedContentTerms: ["electrolyte", "dendrite", "lithium"],
  },
  {
    id: "TC-03",
    query: "Compare React and Vue for building a large web application.",
    expectedTaskType: "comparison",
    expectedDomain: "software_engineering",
    expectedLayout: "comparison",
    scholarshipForbidden: true,
    expectedContentTerms: ["react", "vue", "jsx", "composition api"],
  },
  {
    id: "TC-04",
    query: "Explain how a vector database works.",
    expectedTaskType: "factual_question",
    expectedDomain: "software_engineering",
    expectedLayout: "research",
    scholarshipForbidden: true,
    expectedContentTerms: ["embeddings", "approximate nearest neighbor", "cosine similarity"],
  },
  {
    id: "TC-05",
    query: "What are the current requirements for an Indian student applying for a German student visa?",
    expectedTaskType: "requirements_check",
    expectedDomain: "immigration_and_visa",
    expectedLayout: "policy",
    scholarshipForbidden: true,
    expectedContentTerms: ["sperrkonto", "aps", "zulassungsbescheid"],
  },
  {
    id: "TC-06",
    query: "What are the major research challenges in explainable AI?",
    expectedTaskType: "academic_research",
    expectedDomain: "artificial_intelligence",
    expectedLayout: "academic",
    scholarshipForbidden: true,
    expectedContentTerms: ["shap", "interpretability", "adversarial"],
  },
  {
    id: "TC-07",
    query: "What is the technological and economic status of direct air carbon capture?",
    expectedTaskType: "factual_question",
    expectedDomain: "environment_and_climate",
    expectedLayout: "research",
    scholarshipForbidden: true,
    expectedContentTerms: ["sorbent", "mineralization", "co2"],
  },
  {
    id: "TC-08",
    query: "Compare Google Pixel and Samsung Galaxy smartphones for photography and updates.",
    expectedTaskType: "comparison",
    expectedDomain: "technology_and_hardware",
    expectedLayout: "comparison",
    scholarshipForbidden: true,
    expectedContentTerms: ["pixel", "galaxy", "camera", "tensor"],
  },
  {
    id: "TC-09",
    query: "What are the risks of transitioning to a SaaS subscription pricing model?",
    expectedTaskType: "decision_support",
    expectedDomain: "business_and_finance",
    expectedLayout: "research",
    scholarshipForbidden: true,
    expectedContentTerms: ["swallow tail", "churn", "cac"],
  },
  {
    id: "TC-10",
    query: "How do I publish a Next.js application on Vercel?",
    expectedTaskType: "how_to",
    expectedDomain: "software_engineering",
    expectedLayout: "research",
    scholarshipForbidden: true,
    expectedContentTerms: ["vercel", "build", "deployment", "git"],
  },
  {
    id: "TC-11",
    query: "What are the latest changes in TypeScript?",
    expectedTaskType: "current_information",
    expectedDomain: "software_engineering",
    expectedLayout: "research",
    scholarshipForbidden: true,
    expectedContentTerms: ["satisfies", "const", "typescript"],
  },
  {
    id: "TC-12",
    query: "Tell me about Apple.",
    expectedTaskType: "open_ended_topic",
    expectedDomain: "general_knowledge",
    expectedLayout: "research",
    scholarshipForbidden: true,
    expectedContentTerms: ["apple inc", "malus domestica", "disambiguation"],
    requiresAmbiguityCheck: true,
  },
];

const mockSource: Source = {
  id: "src-eval-1",
  title: "Authoritative Reference Specification",
  domain: "standard.org",
  url: "https://standard.org/ref",
  origin: "automatic-search",
  status: "reviewed",
  headings: ["Overview", "Technical Specifications", "Evaluation"],
  authoritySignal: "Standard Specification",
  retrievalNote: "Full text retrieved",
  dates: {
    published: "2026-03-01T00:00:00.000Z",
    modified: "2026-08-15T00:00:00.000Z",
    retrieved: "2026-11-01T00:00:00.000Z",
    validFrom: null,
    validTo: null,
  },
};

const mockClaim: EvidenceClaim = {
  id: "claim-eval-1",
  sourceId: "src-eval-1",
  requirementIds: ["eligibility", "concept-core", "architecture-indexing", "visa-eligibility"],
  statement: "The system implements rigorous empirical evaluation standards across distributed nodes.",
  excerpt: "The system implements rigorous empirical evaluation standards across distributed nodes.",
  subject: "System Architecture",
  attribute: "performance",
  value: "Empirical standard compliance",
  evidenceProvenance: "page_excerpt",
  publishedAt: "2026-03-01T00:00:00.000Z",
  modifiedAt: "2026-08-15T00:00:00.000Z",
  retrievedAt: "2026-11-01T00:00:00.000Z",
};

function runEvaluation() {
  console.log("\n==========================================================================");
  console.log("   DIGITAL DARK SPOT — RESEARCH RELEVANCE & ACCURACY EVALUATION HARNESS   ");
  console.log("==========================================================================\n");

  let passedCount = 0;
  const resultsTable: Array<{
    ID: string;
    Query: string;
    "Task Type": string;
    Domain: string;
    Layout: string;
    "Bias Free?": string;
    "Content Match?": string;
    Status: string;
  }> = [];

  for (const tc of testCases) {
    const intent = inferIntent(tc.query);
    const result = buildResearchResult({
      mode: "web-search",
      query: tc.query,
      requirements: intent.requirements,
      sources: [mockSource],
      claims: [mockClaim],
    });
    const plan = buildUIPlan(result);
    const planValidation = validateUIPlan(plan, result);

    const isTaskTypeMatch = intent.taskType === tc.expectedTaskType;
    const isDomainMatch = intent.domain === tc.expectedDomain;
    const isLayoutMatch = plan.layout === tc.expectedLayout;

    // Check scholarship bias: non-scholarship queries must NOT contain scholarship requirements
    const reqIds = intent.requirements.map((r) => r.id);
    const hasScholarshipLeak =
      tc.scholarshipForbidden &&
      (reqIds.includes("award-amount") ||
        reqIds.includes("renewal") ||
        intent.categories.includes("scholarship") ||
        result.answer?.directAnswer.toLowerCase().includes("submitting applications") ||
        result.answer?.directAnswer.toLowerCase().includes("scholarship"));

    // Check content relevance terms
    const answerContent = `${result.answer?.headline} ${result.answer?.directAnswer} ${result.answer?.keyPoints?.join(" ")}`.toLowerCase();
    const matchesContent = tc.expectedContentTerms.every((term) => answerContent.includes(term.toLowerCase()));

    // Ambiguity check if required
    let ambiguityPassed = true;
    if (tc.requiresAmbiguityCheck) {
      ambiguityPassed = intent.ambiguity === "high" && !!intent.clarifyingQuestion;
    }

    const testPassed =
      isTaskTypeMatch &&
      isDomainMatch &&
      isLayoutMatch &&
      !hasScholarshipLeak &&
      matchesContent &&
      ambiguityPassed &&
      !planValidation.usedFallback;

    if (testPassed) passedCount++;

    resultsTable.push({
      ID: tc.id,
      Query: tc.query.length > 38 ? `${tc.query.slice(0, 35)}...` : tc.query,
      "Task Type": `${intent.taskType} ${isTaskTypeMatch ? "✓" : "✗"}`,
      Domain: `${intent.domain} ${isDomainMatch ? "✓" : "✗"}`,
      Layout: `${plan.layout} ${isLayoutMatch ? "✓" : "✗"}`,
      "Bias Free?": hasScholarshipLeak ? "FAIL (Leak)" : "PASS (Clean)",
      "Content Match?": matchesContent ? "YES" : "NO",
      Status: testPassed ? "PASS ✓" : "FAIL ✗",
    });
  }

  console.table(resultsTable);

  const scorePercentage = Math.round((passedCount / testCases.length) * 100);
  console.log(`\nResults: ${passedCount} / ${testCases.length} Passed (${scorePercentage}% Accuracy Score)`);

  if (passedCount === testCases.length) {
    console.log("\n[SUCCESS] All 12 benchmark test cases met 100% of relevance, bias-free, and schema criteria.\n");
  } else {
    console.error(`\n[WARNING] ${testCases.length - passedCount} test cases did not pass all criteria.\n`);
    process.exit(1);
  }
}

runEvaluation();
