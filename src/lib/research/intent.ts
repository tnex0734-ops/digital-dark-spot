import type { IntentCategory, Requirement } from "./schema";

export interface IntentSuggestion {
  category: IntentCategory;
  summary: string;
  timeSensitivity: "high" | "medium" | "low";
  timeReason: string;
  highStakes: boolean;
  topic: string;
  requirements: Requirement[];
  queries: string[];
}

type RequirementTemplate = Omit<Requirement, "id"> & { id: string };

const templates: Record<IntentCategory, RequirementTemplate[]> = {
  scholarship: [
    {
      id: "eligibility",
      title: "Eligibility criteria",
      reason: "Check who can apply, citizenship, GPA, and enrollment thresholds.",
      sourceType: "Current official scholarship notice",
      keywords: ["eligible", "eligibility", "applicant", "criteria", "residency", "enrolment", "gpa", "income"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "current official eligibility criteria",
    },
    {
      id: "award-amount",
      title: "Award amount and duration",
      reason: "Confirm the financial funding amount, coverage period, and renewal terms.",
      sourceType: "Current official award terms",
      keywords: ["award", "amount", "funding", "stipend", "renewal", "duration", "tuition"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "award amount duration funding",
    },
    {
      id: "required-documents",
      title: "Required documents",
      reason: "Identify transcripts, recommendation letters, essays, and proof needed.",
      sourceType: "Current application checklist",
      keywords: ["document", "transcript", "recommendation", "letter", "proof", "required", "essay"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "required documents application checklist notification",
    },
    {
      id: "deadline",
      title: "Current deadline and application cycle",
      reason: "Application deadlines and cycle dates change annually.",
      sourceType: "Current official scholarship notice",
      keywords: ["deadline", "closing", "due date", "application period", "cycle", "cutoff"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "current application deadline cycle official",
    },
    {
      id: "renewal",
      title: "Renewal conditions",
      reason: "Determine GPA, credits, or performance standards required for ongoing support.",
      sourceType: "Official award conditions",
      keywords: ["renewal", "renew", "continued funding", "maintain", "subsequent years"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "official renewal conditions academic progress",
    },
    {
      id: "official-procedure",
      title: "Application steps and official portal",
      reason: "Verify where and how to submit through authorized channels.",
      sourceType: "Official application instructions",
      keywords: ["apply", "application", "submit", "procedure", "steps", "portal", "website"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "official application procedure portal submit",
    },
  ],
  eligibility: [
    {
      id: "eligibility-criteria",
      title: "Core eligibility thresholds",
      reason: "Identify baseline qualifying criteria, income limits, or prerequisite conditions.",
      sourceType: "Current official eligibility rules",
      keywords: ["eligible", "eligibility", "criteria", "qualify", "threshold", "income", "age"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "official qualifying criteria thresholds",
    },
    {
      id: "exceptions",
      title: "Exceptions, exclusions, and waivers",
      reason: "Check whether special circumstances disqualify or exempt applicants.",
      sourceType: "Official rules and exceptions",
      keywords: ["exception", "exclusion", "unless", "waiver", "ineligible", "disqualified"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "official eligibility exclusions exceptions waiver",
    },
    {
      id: "supporting-documents",
      title: "Supporting verification documents",
      reason: "List evidentiary documents required to demonstrate qualification.",
      sourceType: "Official documentation guide",
      keywords: ["document", "proof", "evidence", "transcript", "record", "verification"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "required verification documents proof",
    },
    {
      id: "decision-timing",
      title: "Review process and notification dates",
      reason: "Confirm expected processing timelines and decision notices.",
      sourceType: "Official programme page",
      keywords: ["date", "deadline", "review", "decision", "process", "timeline"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "review process decision dates timeline",
    },
  ],
  policy: [
    {
      id: "policy-authority",
      title: "Issuing authority and jurisdiction",
      reason: "Confirm the governing body, legal jurisdiction, and applicable department.",
      sourceType: "Official policy source",
      keywords: ["authority", "issued", "scope", "applies", "jurisdiction", "department", "agency"],
      impact: 3,
      timeSensitivity: "low",
      searchIntent: "official issuing authority jurisdiction scope",
    },
    {
      id: "effective-date",
      title: "Effective date and version status",
      reason: "A newer amendment, version, or circular may supersede earlier rules.",
      sourceType: "Current official policy page",
      keywords: ["effective", "updated", "version", "current", "date", "supersedes", "amended"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "current effective date updated version status",
    },
    {
      id: "policy-requirements",
      title: "Obligations, rules, and exemptions",
      reason: "Capture the substantive requirements, operational duties, and exemptions.",
      sourceType: "Policy text and official guidance",
      keywords: ["requirement", "must", "exception", "condition", "rule", "duty", "prohibited"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "official policy requirements rules exemptions",
    },
    {
      id: "policy-process",
      title: "Compliance, submission, and appeals",
      reason: "Identify compliance pathways, review channels, and grievance mechanisms.",
      sourceType: "Official procedural guidance",
      keywords: ["process", "review", "appeal", "contact", "submit", "compliance", "dispute"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "official compliance procedure review appeal",
    },
  ],
  comparison: [
    {
      id: "comparison-scope",
      title: "Comparable models and baseline specifications",
      reason: "Ensure devices or options are evaluated on equivalent hardware and software terms.",
      sourceType: "Manufacturer specifications and technical sheets",
      keywords: ["version", "model", "specification", "variant", "generation", "hardware"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "technical specifications sheet comparison",
    },
    {
      id: "key-attributes",
      title: "Performance, display, and core metrics",
      reason: "Compare primary attributes like processor, battery life, screen, and cameras.",
      sourceType: "Public benchmarks and manufacturer documentation",
      keywords: ["processor", "battery", "display", "camera", "performance", "benchmark", "weight"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "performance battery display benchmark comparison",
    },
    {
      id: "pricing-availability",
      title: "Pricing, configurations, and warranties",
      reason: "Account for storage tiers, base price, regional variants, and support terms.",
      sourceType: "Official pricing and product terms",
      keywords: ["price", "cost", "configuration", "warranty", "available", "msrp"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "official pricing configurations warranty comparison",
    },
    {
      id: "differentials",
      title: "Key differentiators and trade-offs",
      reason: "Examine direct trade-offs and verified technical differences.",
      sourceType: "Independent technical reviews and teardowns",
      keywords: ["difference", "advantage", "drawback", "limitation", "tradeoff", "versus"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "differences advantages trade-offs comparison",
    },
  ],
  academic: [
    {
      id: "scientific-breakthroughs",
      title: "Recent technical developments and findings",
      reason: "Identify empirical findings, material discoveries, and published breakthroughs.",
      sourceType: "Peer-reviewed literature and scholarly journals",
      keywords: ["development", "advancement", "breakthrough", "findings", "synthesis", "study"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "recent developments advances research findings",
    },
    {
      id: "methodology-materials",
      title: "Mechanisms, materials, and architectures",
      reason: "Examine chemical compositions, electrolyte architectures, and experimental setups.",
      sourceType: "Academic research papers and technical reviews",
      keywords: ["material", "electrolyte", "mechanism", "architecture", "composition", "conductivity"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "materials architecture mechanisms technical review",
    },
    {
      id: "performance-metrics",
      title: "Benchmark performance and operational limits",
      reason: "Check energy density, cycle life, stability, temperature limits, and degradation.",
      sourceType: "Published experimental results and benchmarks",
      keywords: ["density", "cycle life", "stability", "efficiency", "degradation", "temperature", "impedance"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "energy density cycle life stability performance benchmarks",
    },
    {
      id: "unanswered-questions",
      title: "Open challenges and research gaps",
      reason: "Highlight scaling bottlenecks, interface resistance, and unresolved questions.",
      sourceType: "Scholarly roadmaps and review articles",
      keywords: ["challenge", "bottleneck", "unanswered", "gap", "future", "commercialization", "barrier"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "key challenges open questions commercialization roadmap",
    },
  ],
  general: [
    {
      id: "core-findings",
      title: "Core claims and evidence",
      reason: "Establish the primary verifiable statements and their empirical backing.",
      sourceType: "Authoritative primary sources",
      keywords: ["evidence", "study", "report", "result", "claim", "finding", "overview"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "overview evidence findings primary sources",
    },
    {
      id: "context-scope",
      title: "Context, conditions, and applicability",
      reason: "Determine who, where, and under what conditions the facts hold true.",
      sourceType: "Primary source documentation",
      keywords: ["scope", "applies", "condition", "region", "period", "context", "background"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "context scope conditions background",
    },
    {
      id: "freshness-evolution",
      title: "Freshness and validity over time",
      reason: "Distinguish historical context from current conditions or active guidance.",
      sourceType: "Recent authoritative sources",
      keywords: ["current", "date", "updated", "recent", "trend", "status"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "current status updates recent timeline",
    },
    {
      id: "unanswered-aspects",
      title: "Unanswered questions and information gaps",
      reason: "Identify areas where available sources provide incomplete or ambiguous data.",
      sourceType: "Independent assessments and expert commentary",
      keywords: ["unanswered", "unknown", "gap", "uncertainty", "disputed", "missing"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "unanswered questions limitations knowledge gaps",
    },
  ],
};

const highStakesPattern =
  /\b(legal|lawyer|medical|health|doctor|financial|investment|insurance|tax|immigration|visa|citizenship|asylum|employment eligibility|emergency|urgent|safety critical|lawsuit)\b/i;
const deadlinePattern = /\b(deadline|due date|closing date|expires?|apply by|cutoff|submission date)\b/i;
const academicPattern =
  /\b(battery|solid-state|quantum|physics|chemistry|biology|material|algorithm|genome|paper|journal|breakthrough|developments in|unanswered questions|scientific|clinical|research on|nanotechnology)\b/i;

function cleanTopic(query: string): string {
  return query
    .replace(/^(what (is|are|should I verify before applying for|can I know about)|how (do I|to|can I)|tell me about|research on|compare|compare the latest publicly available specifications of)\s+/i, "")
    .replace(/[?!.]+$/, "")
    .trim()
    .slice(0, 100);
}

export function inferIntent(query: string): IntentSuggestion {
  const lower = query.toLowerCase();
  let category: IntentCategory = "general";

  if (/\b(scholarship|grant|bursary|fellowship|tuition assistance|student aid)\b/.test(lower)) {
    category = "scholarship";
  } else if (/\b(compare|comparison|versus|\bvs\b|alternative|which is better|specifications of two)\b/.test(lower)) {
    category = "comparison";
  } else if (/\b(eligible|eligibility|qualify|qualification|who can apply)\b/.test(lower)) {
    category = "eligibility";
  } else if (/\b(policy|regulation|statute|law|rule|guideline|public service|official requirement)\b/.test(lower)) {
    category = "policy";
  } else if (academicPattern.test(lower)) {
    category = "academic";
  }

  const highStakes = highStakesPattern.test(query);
  const hasDeadline = deadlinePattern.test(query);
  const timeSensitivity =
    hasDeadline || category === "scholarship"
      ? "high"
      : category === "policy" || category === "academic"
        ? "medium"
        : "low";

  const timeReason =
    timeSensitivity === "high"
      ? "Application cycles and official deadlines expire; verify current cycle dates before acting."
      : timeSensitivity === "medium"
        ? "Technical developments or official policies update periodically; check effective publication dates."
        : "No immediate expiration was detected; review date signals in discovered sources.";

  const topic = cleanTopic(query) || query.slice(0, 80);
  const reqTemplates = templates[category] || templates.general;
  const requirements: Requirement[] = reqTemplates.map((t) => ({ ...t }));

  // Generate 3 to 5 targeted queries derived directly from intent and topic
  const queries: string[] = [];

  if (category === "scholarship") {
    queries.push(`official ${topic} eligibility criteria requirements`);
    queries.push(`${topic} application deadline cycle`);
    queries.push(`${topic} required documents checklist`);
    queries.push(`official ${topic} renewal conditions award terms`);
  } else if (category === "academic") {
    queries.push(`recent developments in ${topic}`);
    queries.push(`${topic} roadmap performance benchmarks`);
    queries.push(`${topic} challenges open questions research`);
  } else if (category === "comparison") {
    queries.push(`${topic} technical specifications comparison`);
    queries.push(`${topic} benchmarks display battery performance`);
    queries.push(`${topic} official prices configurations comparison`);
  } else if (category === "policy") {
    queries.push(`official ${topic} requirements guidelines`);
    queries.push(`${topic} current effective date latest version`);
    queries.push(`${topic} issuing authority scope exceptions`);
  } else if (category === "eligibility") {
    queries.push(`official ${topic} eligibility criteria qualify`);
    queries.push(`${topic} exceptions disqualifications requirements`);
    queries.push(`${topic} required verification documents`);
  } else {
    queries.push(`${topic} overview evidence`);
    queries.push(`${topic} key findings analysis`);
    queries.push(`${topic} open questions research`);
  }

  return {
    category,
    summary: query.trim(),
    timeSensitivity,
    timeReason,
    highStakes,
    topic,
    requirements,
    queries,
  };
}

export function requirementsFromLabels(labels: string[], category: IntentCategory): Requirement[] {
  return labels
    .map((label) => label.trim().slice(0, 160))
    .filter(Boolean)
    .slice(0, 12)
    .map((title, index) => ({
      id: `custom-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "item"}`,
      title,
      reason: "Requirement suggested for this review. Edit it to match your question.",
      sourceType: category === "scholarship" ? "Current official scholarship source" : "Relevant primary source",
      keywords: title.toLowerCase().split(/\W+/).filter((word) => word.length > 2).slice(0, 10),
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: title,
    }));
}
