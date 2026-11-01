import type { IntentCategory, Requirement } from "./schema";

export interface IntentSuggestion {
  category: IntentCategory;
  categories: IntentCategory[];
  summary: string;
  timeSensitivity: "high" | "medium" | "low";
  timeReason: string;
  highStakes: boolean;
  topic: string;
  resolvedQuery: string;
  requirements: Requirement[];
  queries: string[];
}

type RequirementTemplate = Omit<Requirement, "id"> & { id: string };

const domainTemplates: Partial<Record<IntentCategory, RequirementTemplate[]>> = {
  scholarship: [
    {
      id: "eligibility",
      title: "Eligibility criteria & thresholds",
      reason: "Check who can apply, residency/enrolment requirements, and GPA thresholds.",
      sourceType: "Current official scholarship notice",
      keywords: ["eligible", "eligibility", "criteria", "threshold", "qualify", "gpa", "enrolment"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "official scholarship eligibility criteria",
    },
    {
      id: "deadline",
      title: "Current application deadline",
      reason: "Cutoff dates vary by application cycle and must be verified for the active year.",
      sourceType: "Current official notice",
      keywords: ["deadline", "closing", "due date", "cutoff", "cycle"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "current scholarship application deadline official",
    },
    {
      id: "required-documents",
      title: "Required documents & proof",
      reason: "Verify all transcripts, essays, recommendation letters, and submission formats.",
      sourceType: "Current application checklist",
      keywords: ["document", "transcript", "proof", "recommendation", "letter", "required"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "required documents scholarship checklist",
    },
    {
      id: "award-amount",
      title: "Award amount & duration",
      reason: "Confirm financial award scope, duration, and whether it covers tuition or stipend.",
      sourceType: "Current official award terms",
      keywords: ["award", "amount", "funding", "stipend", "renewal", "duration"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "scholarship award amount stipend details",
    },
    {
      id: "renewal",
      title: "Renewal & maintenance conditions",
      reason: "Check whether continuation requires a minimum GPA, full-time credits, or reapplication.",
      sourceType: "Official award terms",
      keywords: ["renewal", "maintain", "continued funding", "gpa renewal"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "scholarship renewal conditions requirements",
    },
    {
      id: "application-steps",
      title: "Application submission process",
      reason: "Understand the portal, forms, and submission sequence.",
      sourceType: "Official application instructions",
      keywords: ["apply", "application", "portal", "submit", "steps"],
      impact: 2,
      timeSensitivity: "high",
      searchIntent: "scholarship application procedure steps",
    },
    {
      id: "official-link",
      title: "Official programme portal link",
      reason: "Verify legitimate application domain before submitting personal details.",
      sourceType: "Official programme website",
      keywords: ["portal", "official website", "application link"],
      impact: 3,
      timeSensitivity: "low",
      searchIntent: "official scholarship programme portal website",
    },
  ],
  application_or_eligibility: [
    {
      id: "eligibility-rules",
      title: "Core eligibility criteria & thresholds",
      reason: "Establish who qualifies, prerequisite conditions, and explicit thresholds.",
      sourceType: "Current official notice or terms",
      keywords: ["eligible", "eligibility", "criteria", "qualify", "threshold", "residency", "enrolment"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "official eligibility criteria requirements",
    },
    {
      id: "required-docs",
      title: "Required documentation & proof",
      reason: "List evidentiary documents, certificates, and submission formats required.",
      sourceType: "Official application checklist",
      keywords: ["document", "transcript", "proof", "certificate", "id", "required", "letter"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "required documents submission checklist",
    },
    {
      id: "cycle-deadline",
      title: "Current cycle deadline & timeline",
      reason: "Application cutoff dates change annually and must be confirmed for the active cycle.",
      sourceType: "Current official notice",
      keywords: ["deadline", "closing", "due date", "cutoff", "cycle", "period", "timeline"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "current application deadline cycle official",
    },
    {
      id: "renewal-exceptions",
      title: "Renewal terms, conditions & exceptions",
      reason: "Check ongoing maintenance requirements, GPA thresholds, and exemptions.",
      sourceType: "Official award terms",
      keywords: ["renewal", "maintain", "exception", "waiver", "continued funding", "disqualification"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "official renewal conditions academic progress terms",
    },
  ],
  comparison: [
    {
      id: "comparison-scope",
      title: "Scope & baseline comparison",
      reason: "Establish the exact scope, target audience, and architecture being compared.",
      sourceType: "Official technical documentation or specifications",
      keywords: ["specification", "model", "scope", "architecture", "overview", "comparison"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "specifications overview comparison",
    },
    {
      id: "key-attributes",
      title: "Key attributes & feature matrix",
      reason: "Compare specifications, performance benchmarks, battery, or runtime metrics.",
      sourceType: "Public benchmarks & technical reviews",
      keywords: ["specifications", "performance", "battery", "features", "attributes", "benchmarks"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "specifications benchmarks feature comparison",
    },
    {
      id: "tradeoffs-limitations",
      title: "Trade-offs, pricing & ecosystem",
      reason: "Identify trade-offs, pricing differences, limitations, and user considerations.",
      sourceType: "Comparative analyses & expert reviews",
      keywords: ["tradeoff", "pricing", "cost", "limitation", "ecosystem", "drawback"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "trade-offs limitations pricing review",
    },
  ],
  academic: [
    {
      id: "research-state",
      title: "Current state of research & evidence",
      reason: "Establish empirical consensus and published scientific findings.",
      sourceType: "Peer-reviewed literature & review journals",
      keywords: ["study", "evidence", "findings", "consensus", "experiments", "data", "developments"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "recent research developments findings literature review",
    },
    {
      id: "research-challenges",
      title: "Key bottlenecks & open questions",
      reason: "Highlight technical bottlenecks, contradictory theories, and unanswered gaps.",
      sourceType: "Academic roadmaps & expert reviews",
      keywords: ["challenge", "bottleneck", "unanswered", "gap", "barrier", "unresolved"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "open challenges research gaps future roadmap",
    },
    {
      id: "commercial-maturity",
      title: "Commercialization & technology readiness level (TRL)",
      reason: "Distinguish lab-scale prototypes from commercially viable production.",
      sourceType: "Industry reports & roadmap papers",
      keywords: ["commercialization", "readiness", "production", "scale", "timeline", "market"],
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: "commercialization readiness timeline production",
    },
  ],
  research_question: [
    {
      id: "research-state",
      title: "Current state of research & evidence",
      reason: "Establish empirical consensus and published scientific findings.",
      sourceType: "Peer-reviewed literature & review journals",
      keywords: ["study", "evidence", "findings", "consensus", "experiments", "data"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "recent research findings evidence review",
    },
    {
      id: "research-challenges",
      title: "Key bottlenecks & open questions",
      reason: "Highlight technical bottlenecks, contradictory theories, and unanswered gaps.",
      sourceType: "Academic roadmaps & expert reviews",
      keywords: ["challenge", "bottleneck", "unanswered", "gap", "barrier", "unresolved"],
      impact: 3,
      timeSensitivity: "medium",
      searchIntent: "open challenges research gaps future roadmap",
    },
  ],
  policy: [
    {
      id: "policy-eligibility",
      title: "Statutory & regulatory eligibility criteria",
      reason: "Determine mandated qualifications, income thresholds, or residency requirements.",
      sourceType: "Official government policy notice",
      keywords: ["eligibility", "statutory", "criteria", "subsidy", "qualify", "threshold"],
      impact: 3,
      timeSensitivity: "high",
      searchIntent: "official policy statutory eligibility criteria",
    },
    {
      id: "statutory-basis",
      title: "Statutory authority & governing rules",
      reason: "Establish the governing law, regulation code, or public subsidy policy schedule.",
      sourceType: "Public register or legislative gazette",
      keywords: ["statutory", "regulation", "law", "policy", "gazette", "authority"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "statutory authority regulatory framework policy",
    },
  ],
  general_explanation: [
    {
      id: "concept-core",
      title: "Operating principles & definition",
      reason: "Explain the fundamental mechanism and physical or logical laws involved.",
      sourceType: "Authoritative reference & educational sources",
      keywords: ["principle", "mechanism", "definition", "how it works", "process"],
      impact: 2,
      timeSensitivity: "low",
      searchIntent: "operating principle mechanism explanation",
    },
  ],
};

const highStakesRegex =
  /\b(medical|doctor|treatment|illness|disease|dosage|drug|legal|lawyer|court|lawsuit|immigration|visa|asylum|citizenship|tax|audit|financial advice|invest|investment|emergency|safety critical)\b/i;

const pronounRegex = /\b(their|theirs|them|it|its|this|these|those)\b/i;

export function resolveFollowUpContext(
  currentQuery: string,
  previousContext?: { query: string; topic?: string },
): { resolvedQuery: string; topic: string } {
  const query = currentQuery.trim();
  if (!previousContext || !previousContext.topic) {
    const topic = cleanTopic(query) || query.slice(0, 80);
    return { resolvedQuery: query, topic };
  }

  const prevTopic = previousContext.topic;
  if (pronounRegex.test(query)) {
    // Replace pronoun reference with previous topic
    let resolved = query;
    if (/\btheir\b/i.test(resolved)) {
      resolved = resolved.replace(/\btheir\b/gi, `${prevTopic}'s`);
    } else if (/\bthem\b/i.test(resolved)) {
      resolved = resolved.replace(/\bthem\b/gi, prevTopic);
    } else if (/\bits\b/i.test(resolved)) {
      resolved = resolved.replace(/\bits\b/gi, `${prevTopic}'s`);
    } else if (/\bit\b/i.test(resolved)) {
      resolved = resolved.replace(/\bit\b/gi, prevTopic);
    }
    const topic = `${prevTopic} (${cleanTopic(query)})`;
    return { resolvedQuery: resolved, topic };
  }

  const topic = cleanTopic(query) || prevTopic;
  return { resolvedQuery: query, topic };
}

function cleanTopic(query: string): string {
  return query
    .replace(
      /^(what (is|are|should i verify before applying for|should i check before applying for|can i know about|were|do)|how (do i|to|can i|does a|does an|does)|tell me about|explain (how|what|the)|research on|compare|compare the latest publicly available specifications of|write a program to|write a python program to|summarize)\s+/i,
      "",
    )
    .replace(/^(the\s+)?latest developments in\s+/i, "")
    .replace(/^(the\s+)?official policy requirements for\s+/i, "")
    .replace(/^(a\s+|an\s+|the\s+)/i, "")
    .replace(/[?!.]+$/, "")
    .trim()
    .slice(0, 100);
}

export function inferIntent(
  query: string,
  previousContext?: { query: string; topic?: string },
): IntentSuggestion {
  const { resolvedQuery, topic } = resolveFollowUpContext(query, previousContext);
  const lower = resolvedQuery.toLowerCase();
  const categories: IntentCategory[] = [];

  // Check categories with priority
  if (/\b(compare|comparison|versus|\bvs\b|difference between|better than|alternative to)\b/.test(lower)) {
    categories.push("comparison");
  }

  if (/\b(scholarship|grant|bursary|fellowship|tuition assistance)\b/.test(lower)) {
    categories.push("scholarship");
    categories.push("application_or_eligibility");
  }

  if (/\b(solid-state battery|battery technology|scientific|research paper|breakthrough|peer-reviewed|academic|clinical trial)\b/.test(lower)) {
    categories.push("academic");
    categories.push("research_question");
  }

  if (/\b(policy|healthcare subsidy|government scheme|statutory|regulation|mandate)\b/.test(lower)) {
    categories.push("policy");
  }

  if (/\b(python|javascript|typescript|c\+\+|rust|code|algorithm|binary search|sort a list|function|debugging|regex|sql|pointer|class|compile|syntax)\b/.test(lower)) {
    categories.push("technical_help");
  }

  if (/\b(pros and cons|arguments for and against|advantages and disadvantages|benefits and drawbacks)\b/.test(lower)) {
    categories.push("pros_cons");
  }

  if (/\b(how (to|do i|can i)|step-by-step|guide to|instructions for)\b/.test(lower)) {
    categories.push("how_to");
  }

  if (/^(what is|define|definition of|meaning of)\b/.test(lower)) {
    categories.push("definition");
  }

  if (/\b(admissions|apply for|application deadline|eligibility criteria)\b/.test(lower) && !categories.includes("scholarship")) {
    categories.push("application_or_eligibility");
  }

  if (/\b(latest developments|recent updates|current status|new in 202|what happened|news on)\b/.test(lower) && !categories.includes("academic")) {
    categories.push("current_information");
  }

  if (/\b(research|scientific|breakthrough|challenges in|unanswered questions|studies on|climate change)\b/.test(lower)) {
    if (!categories.includes("academic") && !categories.includes("research_question")) {
      categories.push("academic");
      categories.push("research_question");
    }
  }

  if (/\b(explain (how|why|what)|how does|mechanism of|principles of|causes and effects)\b/.test(lower)) {
    categories.push("general_explanation");
  }

  if (highStakesRegex.test(lower)) {
    categories.push("high_impact_information");
  }

  if (!categories.length) {
    categories.push("unknown_or_mixed");
  }

  // Primary category selection
  const primaryCategory = categories[0];

  const highStakes = categories.includes("high_impact_information") || highStakesRegex.test(lower);
  const timeSensitivity: "high" | "medium" | "low" =
    categories.includes("scholarship") || categories.includes("application_or_eligibility") || categories.includes("current_information")
      ? "high"
      : categories.includes("academic") || categories.includes("research_question") || categories.includes("comparison")
        ? "medium"
        : "low";

  const timeReason =
    timeSensitivity === "high"
      ? "Deadlines, cycles, or recent updates can change; verify active dates against official sources."
      : timeSensitivity === "medium"
        ? "Technical developments and standards evolve over time; check publication dates."
        : "Foundational conceptual knowledge; not strictly dependent on immediate calendar dates.";

  // Requirements generation based on domain
  let reqTemplates: RequirementTemplate[] = [];
  if (primaryCategory === "scholarship") {
    reqTemplates = domainTemplates.scholarship || [];
  } else if (primaryCategory === "application_or_eligibility") {
    reqTemplates = domainTemplates.scholarship || domainTemplates.application_or_eligibility || [];
  } else if (primaryCategory === "comparison" || primaryCategory === "pros_cons") {
    reqTemplates = domainTemplates.comparison || [];
  } else if (primaryCategory === "academic") {
    reqTemplates = domainTemplates.academic || [];
  } else if (primaryCategory === "research_question" || primaryCategory === "current_information") {
    reqTemplates = domainTemplates.academic || domainTemplates.research_question || [];
  } else if (primaryCategory === "policy") {
    reqTemplates = domainTemplates.policy || [];
  } else {
    reqTemplates = domainTemplates.general_explanation || [];
  }

  const requirements: Requirement[] = reqTemplates.map((t) => ({ ...t }));

  // Generate targeted queries
  const queries: string[] = [];
  if (primaryCategory === "scholarship") {
    queries.push(`official ${topic} eligibility criteria`);
    queries.push(`${topic} application deadline cycle`);
    queries.push(`${topic} required documents checklist`);
    queries.push(`${topic} terms award funding`);
  } else if (primaryCategory === "academic") {
    queries.push(`latest developments in ${topic}`);
    queries.push(`${topic} research challenges advances`);
    queries.push(`${topic} peer-reviewed scientific overview`);
  } else if (primaryCategory === "comparison" || primaryCategory === "pros_cons") {
    queries.push(`${topic} comparison review`);
    queries.push(`${topic} performance benchmarks trade-offs`);
  } else if (primaryCategory === "policy") {
    queries.push(`official ${topic} eligibility requirements`);
    queries.push(`${topic} government policy guidelines`);
  } else if (primaryCategory === "technical_help") {
    queries.push(`${topic} implementation documentation`);
    queries.push(`${topic} complexity best practices`);
  } else if (primaryCategory === "application_or_eligibility") {
    queries.push(`official ${topic} eligibility criteria`);
    queries.push(`${topic} application deadline cycle`);
    queries.push(`${topic} required documents checklist`);
  } else if (primaryCategory === "current_information" || primaryCategory === "research_question") {
    queries.push(`latest developments in ${topic}`);
    queries.push(`${topic} research challenges advances`);
  } else {
    queries.push(`${topic} overview explanation`);
    queries.push(`${topic} mechanism principles`);
  }

  return {
    category: primaryCategory,
    categories,
    summary: resolvedQuery,
    timeSensitivity,
    timeReason,
    highStakes,
    topic,
    resolvedQuery,
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
      reason: "Information requirement defined for this research session.",
      sourceType:
        category === "application_or_eligibility" || category === "scholarship"
          ? "Official primary notice"
          : "Authoritative technical or reference source",
      keywords: title.toLowerCase().split(/\W+/).filter((word) => word.length > 2).slice(0, 10),
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: title,
    }));
}
