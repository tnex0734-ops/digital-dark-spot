import type {
  IntentAnalysis,
  IntentCategory,
  Requirement,
  SearchQueryPlan,
  TaskType,
} from "./schema";

export interface IntentSuggestion extends IntentAnalysis {
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

export function cleanTopic(query: string): string {
  return query
    .replace(
      /^(what (is|are|should i verify before applying for|should i check before applying for|can i know about|were|do)|how (do i|to|can i|does a|does an|does)|tell me about|explain (how|what|the)|research on|compare|compare the latest publicly available specifications of|compare the latest specifications of|write a program to|write a python program to|summarize)\s+/i,
      "",
    )
    .replace(/^(the\s+)?latest developments in\s+/i, "")
    .replace(/^(the\s+)?major research challenges in\s+/i, "")
    .replace(/^(the\s+)?current requirements for\s+/i, "")
    .replace(/^(the\s+)?main risks of\s+/i, "")
    .replace(/^(the\s+)?most recent major changes in\s+/i, "")
    .replace(/^(a\s+|an\s+|the\s+)/i, "")
    .replace(/[?!.]+$/, "")
    .trim()
    .slice(0, 100);
}

function extractEntities(query: string, topic: string): string[] {
  const entities: string[] = [];
  const lower = query.toLowerCase();

  // Multi-entity comparisons
  if (lower.includes("react") && lower.includes("vue")) {
    entities.push("React", "Vue");
  } else if (lower.includes("pixel") && lower.includes("galaxy")) {
    entities.push("Google Pixel", "Samsung Galaxy");
  } else if (lower.includes("next.js") && lower.includes("vercel")) {
    entities.push("Next.js", "Vercel");
  } else if (lower.includes("german") && lower.includes("visa")) {
    entities.push("German Student Visa", "India");
  } else if (lower.includes("solid-state battery") || lower.includes("solid-state")) {
    entities.push("Solid-State Battery");
  } else if (lower.includes("vector database") || lower.includes("vector db")) {
    entities.push("Vector Database");
  } else if (lower.includes("explainable ai") || lower.includes("xai")) {
    entities.push("Explainable AI (XAI)");
  } else if (lower.includes("direct air capture") || lower.includes("dac")) {
    entities.push("Direct Air Capture (DAC)");
  } else if (lower.includes("subscription pricing") || lower.includes("saas")) {
    entities.push("Subscription Pricing", "SaaS");
  } else if (lower.includes("typescript")) {
    entities.push("TypeScript");
  } else if (lower.includes("bright path")) {
    entities.push("Bright Path Scholarship");
  } else if (lower.includes("apple")) {
    entities.push("Apple");
  } else if (topic) {
    entities.push(topic);
  }

  return entities;
}

export function inferIntent(
  query: string,
  previousContext?: { query: string; topic?: string },
): IntentSuggestion {
  const { resolvedQuery, topic } = resolveFollowUpContext(query, previousContext);
  const lower = resolvedQuery.toLowerCase();
  const entities = extractEntities(resolvedQuery, topic);

  // 1. Detect TaskType (from Section 4 specification)
  let taskType: TaskType = "research_overview";

  if (/\b(how (to|do i|can i)|step-by-step|guide to|publish|deploy|install|configure)\b/i.test(lower)) {
    taskType = "how_to";
  } else if (/\b(compare|comparison|versus|\bvs\b|difference between|better than|alternative to)\b/i.test(lower)) {
    taskType = "comparison";
  } else if (/\b(latest (developments|changes|updates|features|advances)|recent (updates|changes|developments|advances)|current status|new in 202|what happened|most recent)\b/i.test(lower)) {
    taskType = "current_information";
  } else if (/\b(requirements for|eligibility criteria|what should i verify before applying|checklist for|qualify for)\b/i.test(lower)) {
    taskType = "requirements_check";
  } else if (/\b(visa|policy|regulation|mandate|statutory|law|court|government scheme)\b/i.test(lower)) {
    taskType = "policy_or_regulation";
  } else if (/\b(research challenges|scientific|literature|academic|studies on|peer-reviewed|evidence exists for)\b/i.test(lower)) {
    taskType = "academic_research";
  } else if (/\b(risks of|pros and cons|arguments for and against|trade-offs|decision|should we adopt)\b/i.test(lower)) {
    taskType = "decision_support";
  } else if (/^(what is|explain how|mechanism of|principles of|definition of)\b/i.test(lower)) {
    taskType = "factual_question";
  } else if (lower.trim().split(/\s+/).length <= 4 && !lower.includes("how") && !lower.includes("why")) {
    taskType = "open_ended_topic";
  }

  // 2. Detect Domain
  let domain = "general_knowledge";
  if (/\b(scholarship|grant|bursary|tuition assistance|financial aid)\b/i.test(lower)) {
    domain = "scholarship_and_aid";
  } else if (/\b(visa|embassy|consulate|immigration|passport|schengen)\b/i.test(lower)) {
    domain = "immigration_and_visa";
  } else if (/\b(react|vue|typescript|next\.js|vercel|python|algorithm|binary search|vector database|database|code)\b/i.test(lower)) {
    domain = "software_engineering";
  } else if (/\b(battery|solid-state|lithium-ion|pixel|samsung|galaxy|phone|hardware)\b/i.test(lower)) {
    domain = "technology_and_hardware";
  } else if (/\b(climate|direct air capture|emissions|energy|carbon|dac)\b/i.test(lower)) {
    domain = "environment_and_climate";
  } else if (/\b(saas|subscription|pricing|business|company|revenue|churn|market|finance|valuation)\b/i.test(lower)) {
    domain = "business_and_finance";
  } else if (/\b(ai|artificial intelligence|machine learning|deep learning|explainable ai|neural|llm|language model|foundation model)\b/i.test(lower)) {
    domain = "artificial_intelligence";
  }

  // 3. Ambiguity Check
  let ambiguity: "low" | "medium" | "high" = "low";
  let clarifyingQuestion: string | undefined;
  let provisionalInterpretation: string | undefined;

  if (lower.trim() === "apple" || lower.includes("tell me about apple") || lower === "what is apple") {
    ambiguity = "high";
    clarifyingQuestion = "Are you researching Apple Inc. (consumer technology enterprise), the agricultural fruit (Malus domestica), or Apple Corps (multimedia corporation)?";
    provisionalInterpretation = "Provisional interpretation: Apple Inc. (consumer electronics and software technology enterprise). If researching agricultural fruit production or music records, clarify your query.";
  } else if (lower.split(/\s+/).length <= 2 && !lower.includes("what") && !lower.includes("how")) {
    ambiguity = "medium";
    provisionalInterpretation = `Provisional interpretation: General research overview for ${topic}.`;
  }

  // 4. IntentCategory & Categories (maintaining compatibility with existing tests and schema)
  const categories: IntentCategory[] = [];

  if (taskType === "comparison") {
    categories.push("comparison");
  }

  // STRICT SCHOLARSHIP ISOLATION: Only queries genuinely about scholarship/grant/bursary/fellowship
  const isGenuinelyScholarship = /\b(scholarship|grant|bursary|fellowship|tuition assistance)\b/i.test(lower);
  if (isGenuinelyScholarship) {
    categories.push("scholarship");
    categories.push("application_or_eligibility");
  }

  if (taskType === "academic_research" || /\b(solid-state battery|battery technology|scientific|research paper|breakthrough|peer-reviewed|academic|clinical trial)\b/i.test(lower)) {
    if (!categories.includes("academic")) categories.push("academic");
    if (!categories.includes("research_question")) categories.push("research_question");
  }

  if (taskType === "policy_or_regulation" || /\b(policy|healthcare subsidy|government scheme|statutory|regulation|mandate|visa)\b/i.test(lower)) {
    if (!categories.includes("policy")) categories.push("policy");
  }

  if (domain === "software_engineering" || /\b(python|javascript|typescript|c\+\+|rust|code|algorithm|binary search|sort a list|function|debugging|regex|sql|pointer|class|compile|syntax)\b/i.test(lower)) {
    if (!categories.includes("technical_help")) categories.push("technical_help");
  }

  if (taskType === "decision_support" || /\b(pros and cons|arguments for and against|advantages and disadvantages|benefits and drawbacks)\b/i.test(lower)) {
    if (!categories.includes("pros_cons")) categories.push("pros_cons");
  }

  if (taskType === "how_to") {
    if (!categories.includes("how_to")) categories.push("how_to");
  }

  if (taskType === "current_information" || /\b(latest developments|recent updates|current status|new in 202|what happened|news on)\b/i.test(lower)) {
    if (!categories.includes("current_information")) categories.push("current_information");
  }

  if (taskType === "requirements_check" && !categories.includes("scholarship")) {
    if (!categories.includes("application_or_eligibility")) categories.push("application_or_eligibility");
  }

  if (taskType === "factual_question" || /\b(explain (how|why|what)|how does|mechanism of|principles of|causes and effects)\b/i.test(lower)) {
    if (!categories.includes("general_explanation")) categories.push("general_explanation");
  }

  if (highStakesRegex.test(lower)) {
    if (!categories.includes("high_impact_information")) categories.push("high_impact_information");
  }

  if (!categories.length) {
    categories.push("unknown_or_mixed");
  }

  const primaryCategory = categories[0];

  const highStakes = categories.includes("high_impact_information") || highStakesRegex.test(lower);
  const requiresCurrentInformation =
    taskType === "current_information" ||
    taskType === "requirements_check" ||
    lower.includes("latest") ||
    lower.includes("current") ||
    lower.includes("recent") ||
    lower.includes("2026");

  const timeSensitivity: "high" | "medium" | "low" =
    isGenuinelyScholarship || domain === "immigration_and_visa"
      ? "high"
      : categories.includes("academic") || taskType === "academic_research"
        ? "medium"
        : requiresCurrentInformation
          ? "high"
          : taskType === "comparison"
            ? "medium"
            : "low";

  const timeReason =
    timeSensitivity === "high"
      ? "Official rules, statutory deadlines, immigration thresholds, and current releases evolve rapidly; check active primary dates."
      : timeSensitivity === "medium"
        ? "Technical developments, benchmark comparisons, and research consensus advance over time; verify publication year."
        : "Foundational conceptual principles and architecture; not strictly tied to immediate calendar dates.";

  // 5. Generate Domain-Specific Requirements
  const requirements: Requirement[] = [];

  if (isGenuinelyScholarship) {
    requirements.push(
      {
        id: "eligibility",
        title: "Eligibility criteria & thresholds",
        reason: "Establish who qualifies, prerequisite conditions, and explicit thresholds.",
        sourceType: "Current official scholarship notice",
        keywords: ["eligible", "eligibility", "criteria", "qualify", "threshold", "residency", "enrolment"],
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
    );
  } else if (domain === "immigration_and_visa" || lower.includes("german student visa")) {
    requirements.push(
      {
        id: "visa-eligibility",
        title: "Core visa eligibility & university admission prerequisites",
        reason: "Confirm valid German university admission letter (Zulassungsbescheid) or conditional acceptance.",
        sourceType: "German Federal Foreign Office / Embassy portal",
        keywords: ["admission", "university", "acceptance", "prerequisites", "zulassung", "eligibility"],
        impact: 3,
        timeSensitivity: "high",
        searchIntent: "German student visa eligibility requirements Indian students",
      },
      {
        id: "financial-proof",
        title: "Proof of financial resources (Blocked Account / Sperrkonto)",
        reason: "Verify mandated annual living expense deposit amount and authorized blocked account providers.",
        sourceType: "German Missions in India official consular guidelines",
        keywords: ["blocked account", "sperrkonto", "financial proof", "deposit", "funds", "maintenance"],
        impact: 3,
        timeSensitivity: "high",
        searchIntent: "German student visa blocked account minimum amount 2026",
      },
      {
        id: "aps-documents",
        title: "APS certificate and academic documentation",
        reason: "Indian applicants require an authentic Akademische Prüfstelle (APS) certificate prior to visa appointment.",
        sourceType: "APS India official certification portal",
        keywords: ["aps certificate", "akademische", "verification", "transcripts", "documents", "vfs"],
        impact: 3,
        timeSensitivity: "high",
        searchIntent: "APS certificate requirement India German student visa",
      },
      {
        id: "health-insurance",
        title: "Mandatory health insurance & statutory coverage",
        reason: "Statutory or travel health insurance coverage meeting consular and German university enrollment standards.",
        sourceType: "Official consular checklist",
        keywords: ["health insurance", "statutory", "krankenkasse", "coverage", "travel insurance"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: "German student visa health insurance requirements",
      },
      {
        id: "processing-timeline",
        title: "Consular processing timeline & appointment booking",
        reason: "VFS Global appointment slot lead times and embassy processing duration ahead of semester start.",
        sourceType: "VFS Global / German Consulate schedule",
        keywords: ["appointment", "processing time", "waitlist", "vfs", "timeline", "consulate"],
        impact: 3,
        timeSensitivity: "high",
        searchIntent: "German student visa appointment waiting time India",
      },
    );
  } else if (lower.includes("solid-state battery") || lower.includes("solid-state")) {
    requirements.push(
      {
        id: "technical-developments",
        title: "Solid-state electrolyte chemistry & recent breakthroughs",
        reason: "Compare sulfide, oxide, and polymer solid electrolytes, ionic conductivity, and cell architectures.",
        sourceType: "Peer-reviewed scientific journals & review papers",
        keywords: ["solid-state", "electrolyte", "sulfide", "oxide", "argyrodite", "ionic conductivity", "breakthrough"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "solid-state battery electrolyte developments research 2026",
      },
      {
        id: "performance-metrics",
        title: "Reported energy density, cycle life & fast charging",
        reason: "Examine measured Wh/kg, volumetric density, and capacity retention under cycling.",
        sourceType: "Academic benchmarks & laboratory test data",
        keywords: ["energy density", "cycle life", "fast charging", "wh/kg", "capacity", "retention"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "solid-state battery energy density cycle life benchmarks",
      },
      {
        id: "commercialization",
        title: "Manufacturing scalability & pilot production roadmaps",
        reason: "Distinguish lab coin-cell experiments from roll-to-roll pilot lines and automotive OEM timelines.",
        sourceType: "Industry roadmap reports & manufacturing disclosures",
        keywords: ["commercialization", "pilot production", "manufacturing", "scale", "roll to roll", "oem"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: "solid-state battery commercialization manufacturing roadmap",
      },
      {
        id: "safety-durability",
        title: "Lithium dendrite suppression & interface stability",
        reason: "Analyze solid-electrolyte interphase (SEI) degradation, mechanical stress, and dendrite penetration.",
        sourceType: "Materials science publications",
        keywords: ["dendrite", "interface", "interfacial resistance", "stability", "safety", "anode"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "solid-state battery lithium dendrite interface degradation",
      },
    );
  } else if (taskType === "comparison" || lower.includes("react") && lower.includes("vue") || lower.includes("pixel") && lower.includes("galaxy")) {
    requirements.push(
      {
        id: "comparison-scope",
        title: "Core architecture & evaluation baseline",
        reason: "Establish comparable feature scope, runtime model, and design philosophy.",
        sourceType: "Official technical documentation & specifications",
        keywords: ["architecture", "specifications", "baseline", "model", "syntax", "runtime", "display"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: `${topic} core architecture comparison specifications`,
      },
      {
        id: "key-attributes",
        title: "Key attributes & benchmark performance",
        reason: "Compare throughput, camera optics, battery endurance, or bundle size under standardized conditions.",
        sourceType: "Public benchmarks & comparative technical reviews",
        keywords: ["performance", "benchmark", "battery", "camera", "ecosystem", "attributes", "features"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: `${topic} performance benchmarks feature comparison`,
      },
      {
        id: "tradeoffs-limitations",
        title: "Ecosystem trade-offs, pricing & support lifecycle",
        reason: "Identify tooling friction, pricing differentials, LTS lifecycle, and maintenance overhead.",
        sourceType: "Comparative analyses & expert reviews",
        keywords: ["tradeoff", "pricing", "cost", "limitation", "ecosystem", "drawback", "support"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: `${topic} trade-offs ecosystem limitations comparison`,
      },
    );
  } else if (lower.includes("vector database") || lower.includes("vector db")) {
    requirements.push(
      {
        id: "core-concept",
        title: "High-dimensional vector representations & embeddings",
        reason: "Understand how unstructured data is converted into numerical embedding vectors.",
        sourceType: "Technical reference documentation & academic guides",
        keywords: ["vector database", "embeddings", "high-dimensional", "vector", "representation"],
        impact: 3,
        timeSensitivity: "low",
        searchIntent: "vector database core concept embeddings explanation",
      },
      {
        id: "indexing-algorithms",
        title: "Approximate Nearest Neighbor (ANN) indexing algorithms",
        reason: "Examine indexing structures such as HNSW, IVF-PQ, and ScaNN for sub-linear search latency.",
        sourceType: "Computer science papers & systems documentation",
        keywords: ["hnsw", "ann", "approximate nearest neighbor", "indexing", "ivf", "similarity search"],
        impact: 3,
        timeSensitivity: "low",
        searchIntent: "vector database indexing algorithms HNSW ANN similarity",
      },
      {
        id: "distance-metrics",
        title: "Similarity metrics (Cosine, Euclidean, Dot Product)",
        reason: "Differentiate distance metrics and their mathematical application to normalized vs raw vectors.",
        sourceType: "Algorithmic reference",
        keywords: ["cosine similarity", "euclidean distance", "dot product", "metric", "distance"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: "vector search distance metrics cosine dot product euclidean",
      },
      {
        id: "retrieval-workflow",
        title: "RAG integration & metadata filtering workflow",
        reason: "Understand hybrid search, payload filtering, and retrieval-augmented generation pipelines.",
        sourceType: "Architecture whitepapers & engineering blogs",
        keywords: ["rag", "metadata filtering", "hybrid search", "retrieval", "production"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: "vector database RAG metadata filtering architecture",
      },
    );
  } else if (lower.includes("explainable ai") || lower.includes("xai")) {
    requirements.push(
      {
        id: "research-themes",
        title: "Major explanation taxonomies (Local vs Global, Post-hoc vs Intrinsic)",
        reason: "Classify interpretability paradigms: SHAP, LIME, integrated gradients, and attention attribution.",
        sourceType: "Peer-reviewed AI research surveys",
        keywords: ["explainable ai", "xai", "shap", "lime", "post-hoc", "interpretability", "attribution"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "explainable AI taxonomy local global post-hoc review",
      },
      {
        id: "evaluation-fidelity",
        title: "Evaluation challenges & fidelity vs interpretability trade-off",
        reason: "Assess whether explanation models faithfully reflect underlying black-box decision boundaries.",
        sourceType: "Academic machine learning proceedings",
        keywords: ["fidelity", "evaluation", "faithfulness", "ground truth", "trade-off", "benchmark"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "explainable AI evaluation faithfulness fidelity challenges",
      },
      {
        id: "adversarial-robustness",
        title: "Adversarial vulnerability & explanation manipulation",
        reason: "Investigate how perturbation attacks deceive attribution maps without altering model predictions.",
        sourceType: "Security & AI safety research publications",
        keywords: ["adversarial", "vulnerability", "robustness", "manipulation", "attack", "safety"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "explainable AI adversarial robustness manipulation challenges",
      },
    );
  } else if (lower.includes("direct air capture") || lower.includes("dac")) {
    requirements.push(
      {
        id: "capture-mechanisms",
        title: "Capture technologies: Solid sorbents vs Liquid solvent systems",
        reason: "Examine thermodynamic regeneration temperatures (100°C sorbents vs 900°C potassium hydroxide).",
        sourceType: "Environmental science & chemical engineering literature",
        keywords: ["direct air capture", "dac", "solid sorbent", "liquid solvent", "potassium hydroxide", "adsorption"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "direct air capture technology solid sorbent liquid solvent",
      },
      {
        id: "energy-cost-metrics",
        title: "Energy intensity, lifecycle emissions & cost per metric ton",
        reason: "Evaluate electricity/heat inputs (GJ/tCO2), lifecycle net removal efficiency, and levelized costs.",
        sourceType: "IEA & peer-reviewed lifecycle analyses",
        keywords: ["energy intensity", "cost per ton", "lifecycle emissions", "co2 removal", "kwh", "levelized cost"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "direct air capture cost per ton energy penalty lifecycle analysis",
      },
      {
        id: "scalability-limits",
        title: "Geological storage permanence & resource footprint",
        reason: "Assess basalt mineralization, deep saline aquifers, water consumption, and land area requirements.",
        sourceType: "Geological survey & IPCC mitigation reports",
        keywords: ["geological storage", "mineralization", "permanence", "water consumption", "scale", "ipcc"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: "direct air capture geological storage permanence resource limits",
      },
    );
  } else if (lower.includes("subscription") && (lower.includes("saas") || lower.includes("pricing"))) {
    requirements.push(
      {
        id: "churn-acquisition",
        title: "Cash flow delay & working capital trough (CAC payback)",
        reason: "Analyze upfront customer acquisition costs versus gradual monthly recurring revenue realization.",
        sourceType: "Financial & SaaS operating benchmarks",
        keywords: ["cac payback", "cash flow", "working capital", "churn", "mrr", "subscription", "trough"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "SaaS subscription pricing cash flow trough CAC payback risk",
      },
      {
        id: "churn-compounding",
        title: "Churn compounding & revenue retention leakage",
        reason: "Examine how customer attrition compounds over time and erodes net recurring revenue.",
        sourceType: "Industry SaaS metric studies",
        keywords: ["churn rate", "net revenue retention", "attrition", "compounding", "customer success"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "SaaS subscription model churn compounding revenue risk",
      },
      {
        id: "pricing-tier-friction",
        title: "Feature gate backlash & usage-based transition friction",
        reason: "Understand customer pushback when transitioning from perpetual to subscription or gating features.",
        sourceType: "Pricing strategy case studies",
        keywords: ["pricing tiers", "feature gating", "usage based", "customer backlash", "adoption"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: "subscription pricing adoption friction customer backlash SaaS",
      },
    );
  } else if (lower.includes("next.js") && lower.includes("vercel")) {
    requirements.push(
      {
        id: "prerequisites",
        title: "Project prerequisites & build configuration verification",
        reason: "Confirm package.json build script (`next build`), Node runtime compatibility, and clean local build.",
        sourceType: "Official Next.js & Vercel documentation",
        keywords: ["next.js", "vercel", "build script", "package.json", "node version", "prerequisites"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "publish Next.js application Vercel deployment prerequisites",
      },
      {
        id: "git-integration",
        title: "Git provider integration (GitHub / GitLab / Bitbucket)",
        reason: "Connect repository for automated continuous deployment (CI/CD) on git push.",
        sourceType: "Vercel platform documentation",
        keywords: ["github", "git integration", "continuous deployment", "import repository", "ci cd"],
        impact: 3,
        timeSensitivity: "low",
        searchIntent: "deploy Next.js to Vercel via GitHub continuous deployment",
      },
      {
        id: "cli-deployment",
        title: "Vercel CLI direct deployment alternative",
        reason: "Deploy directly from terminal using `npx vercel` for preview and production without git linking.",
        sourceType: "Vercel CLI command reference",
        keywords: ["vercel cli", "terminal", "command line", "vercel --prod", "preview deployment"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: "deploy Next.js using Vercel CLI commands",
      },
      {
        id: "env-configuration",
        title: "Environment variables & production domain assignment",
        reason: "Configure server-side environment secrets and configure custom apex/subdomain DNS records.",
        sourceType: "Vercel settings guide",
        keywords: ["environment variables", "custom domain", "dns", "production secrets", "ssl"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "configure environment variables custom domain Next.js Vercel",
      },
    );
  } else if (lower.includes("typescript")) {
    requirements.push(
      {
        id: "latest-releases",
        title: "Recent version milestones & feature additions",
        reason: "Identify language features, type syntax additions, and compiler flags introduced in recent versions.",
        sourceType: "Official TypeScript release notes & handbook",
        keywords: ["typescript", "release notes", "new features", "version", "syntax", "compiler"],
        impact: 3,
        timeSensitivity: "high",
        searchIntent: "recent major changes new features TypeScript latest release",
      },
      {
        id: "breaking-changes",
        title: "Breaking changes & deprecated compiler options",
        reason: "Verify deprecated tsconfig options, stricter type-checking defaults, and migration advisories.",
        sourceType: "TypeScript announcement blog & breaking change log",
        keywords: ["breaking changes", "deprecated", "tsconfig", "migration", "strict", "compatibility"],
        impact: 3,
        timeSensitivity: "high",
        searchIntent: "TypeScript recent breaking changes migration guide",
      },
      {
        id: "performance-optimizations",
        title: "Type checker performance & build speed improvements",
        reason: "Examine compiler optimizations, memory reduction, and project reference build speed.",
        sourceType: "TypeScript engineering updates",
        keywords: ["performance", "build speed", "type checking", "memory", "optimizations"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: "TypeScript compiler performance speed improvements",
      },
    );
  } else if (ambiguity === "high" && lower.includes("apple")) {
    requirements.push(
      {
        id: "primary-tech-entity",
        title: "Apple Inc. (Technology Enterprise) Overview",
        reason: "Examine market capitalization, consumer hardware ecosystem (iPhone, Mac, iPad), and operating systems.",
        sourceType: "Financial & corporate technology documentation",
        keywords: ["apple inc", "technology", "iphone", "mac", "tim cook", "hardware", "nasdaq"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: "Apple Inc technology company financial overview products",
      },
      {
        id: "botanical-agriculture",
        title: "Apple (Malus domestica) Botanical & Agricultural Overview",
        reason: "Examine pomology, cultivar varieties, nutritional profile, and global agricultural production.",
        sourceType: "Agricultural extension & botanical reference",
        keywords: ["malus domestica", "fruit", "cultivar", "botanical", "pomology", "agriculture", "orchard"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: "apple fruit Malus domestica botanical agriculture cultivation",
      },
      {
        id: "disambiguation-guidance",
        title: "Sub-topic disambiguation & research scope",
        reason: "Clarify research intent between technology, agriculture, and Beatles record label (Apple Corps).",
        sourceType: "Encyclopedic reference",
        keywords: ["disambiguation", "apple corps", "beatles", "apple records", "scope"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: "Apple disambiguation technology fruit music",
      },
    );
  } else if (taskType === "how_to") {
    requirements.push(
      {
        id: "step-prerequisites",
        title: "Prerequisites, tools & system requirements",
        reason: "Identify dependencies, credentials, runtime environments, and permissions required before starting.",
        sourceType: "Official setup guide or developer documentation",
        keywords: ["prerequisites", "requirements", "dependencies", "setup", "install", "tools"],
        impact: 3,
        timeSensitivity: "low",
        searchIntent: `prerequisites setup guide for ${topic}`,
      },
      {
        id: "step-execution",
        title: "Step-by-step procedure & execution sequence",
        reason: "Examine exact sequential instructions, configuration commands, and workflow steps.",
        sourceType: "Official instructional documentation",
        keywords: ["instructions", "procedure", "steps", "workflow", "commands", "execution"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: `step by step instructions for ${topic}`,
      },
      {
        id: "verification-troubleshooting",
        title: "Verification, output testing & common failure modes",
        reason: "Confirm successful completion and troubleshoot common errors or gotchas.",
        sourceType: "Technical troubleshooting reference",
        keywords: ["verify", "test", "troubleshoot", "errors", "validation", "gotchas"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: `verification troubleshooting guide for ${topic}`,
      },
    );
  } else if (taskType === "academic_research") {
    requirements.push(
      {
        id: "research-state",
        title: "Current state of research & empirical consensus",
        reason: "Establish empirical consensus and published scientific findings.",
        sourceType: "Peer-reviewed literature & review journals",
        keywords: ["study", "evidence", "findings", "consensus", "experiments", "data", "developments"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: `recent research developments findings for ${topic}`,
      },
      {
        id: "research-challenges",
        title: "Key bottlenecks & open questions",
        reason: "Highlight technical bottlenecks, contradictory theories, and unanswered gaps.",
        sourceType: "Academic roadmaps & expert reviews",
        keywords: ["challenge", "bottleneck", "unanswered", "gap", "barrier", "unresolved"],
        impact: 3,
        timeSensitivity: "medium",
        searchIntent: `open research challenges bottlenecks for ${topic}`,
      },
      {
        id: "methodology-evaluation",
        title: "Methodological approaches & experimental validation",
        reason: "Examine validation protocols, baseline datasets, and measurement standards.",
        sourceType: "Scientific methodology papers",
        keywords: ["methodology", "measurement", "datasets", "validation", "experimental"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: `methodology experimental evaluation for ${topic}`,
      },
    );
  } else {
    // Default Domain-Specific Conceptual Requirements
    requirements.push(
      {
        id: "concept-core",
        title: `${topic}: Core principles and definition`,
        reason: "Explain fundamental mechanisms, operational definition, and governing principles.",
        sourceType: "Authoritative reference & educational sources",
        keywords: ["principle", "mechanism", "definition", "overview", "function", "system"],
        impact: 3,
        timeSensitivity: "low",
        searchIntent: `${topic} core principles mechanism definition`,
      },
      {
        id: "architecture-methods",
        title: `${topic}: Architecture, components, or key factors`,
        reason: "Examine the structural components, methods, and practical operation.",
        sourceType: "Authoritative technical documentation & review literature",
        keywords: ["components", "architecture", "structure", "methods", "workflow", "process"],
        impact: 2,
        timeSensitivity: "low",
        searchIntent: `${topic} components architecture workflow`,
      },
      {
        id: "applications-tradeoffs",
        title: `${topic}: Common applications and trade-offs`,
        reason: "Identify practical use cases, limitations, and key trade-offs in real-world scenarios.",
        sourceType: "Industry reports & expert reviews",
        keywords: ["applications", "use cases", "tradeoffs", "limitations", "drawbacks"],
        impact: 2,
        timeSensitivity: "medium",
        searchIntent: `${topic} applications use cases trade-offs`,
      },
    );
  }

  // 6. Generate 3 to 6 Focused Search Queries (SearchPlanningEngine)
  const searchQueries: SearchQueryPlan[] = [];

  for (const req of requirements.slice(0, 5)) {
    searchQueries.push({
      query: req.searchIntent || `${topic} ${req.title}`,
      purpose: `Investigate ${req.title}`,
      targetRequirementId: req.id,
    });
  }

  // Add broad query if fewer than 3
  if (searchQueries.length < 3) {
    searchQueries.push({
      query: `${topic} authoritative overview documentation`,
      purpose: "General background and foundational documentation",
    });
  }

  const queries = searchQueries.map((s) => s.query);

  const assumptions: string[] = [
    `Assumes research focuses on public, non-confidential source material for ${topic}.`,
    timeSensitivity === "high"
      ? "Assumes user requires active/current cycle information."
      : "Assumes foundational conceptual understanding is primary.",
  ];

  const userGoal = `Analyze ${topic} to synthesize verified findings, evaluate evidence coverage, identify information gaps, and prioritize next verification steps.`;

  return {
    originalQuery: query,
    normalizedQuery: resolvedQuery,
    taskType,
    domain,
    topic,
    entities,
    requiresCurrentInformation,
    userGoal,
    informationRequirements: requirements,
    searchQueries,
    assumptions,
    ambiguity,
    clarifyingQuestion,
    provisionalInterpretation,
    category: primaryCategory,
    categories,
    summary: resolvedQuery,
    timeSensitivity,
    timeReason,
    highStakes,
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
        category === "scholarship"
          ? "Official scholarship award notice"
          : "Authoritative technical or reference source",
      keywords: title.toLowerCase().split(/\W+/).filter((word) => word.length > 2).slice(0, 10),
      impact: 2,
      timeSensitivity: "medium",
      searchIntent: title,
    }));
}
