import type { IntentCategory, Requirement } from "./schema";

export interface IntentSuggestion {
  category: IntentCategory;
  summary: string;
  timeSensitivity: "high" | "medium" | "low";
  timeReason: string;
  highStakes: boolean;
  requirements: Requirement[];
}

type RequirementTemplate = Omit<Requirement, "id"> & { id: string };

const templates: Record<IntentCategory, RequirementTemplate[]> = {
  scholarship: [
    { id: "eligibility", title: "Eligibility criteria", reason: "Check who can apply and any thresholds or exceptions.", sourceType: "Current official scholarship notice", keywords: ["eligible", "eligibility", "applicant", "criteria", "residency", "enrolment"], impact: 3 },
    { id: "award-amount", title: "Award amount and duration", reason: "Confirm the amount, duration and any renewal conditions.", sourceType: "Current official award terms", keywords: ["award", "amount", "funding", "stipend", "renewal", "duration"], impact: 2 },
    { id: "required-documents", title: "Required documents", reason: "Identify every document and format the application requires.", sourceType: "Current application checklist", keywords: ["document", "transcript", "recommendation", "letter", "proof", "required"], impact: 3 },
    { id: "deadline", title: "Current deadline", reason: "Deadlines can change between application cycles.", sourceType: "Current official scholarship notice", keywords: ["deadline", "closing", "due date", "application period"], impact: 3 },
    { id: "application-steps", title: "Application steps", reason: "Understand how and where an application must be submitted.", sourceType: "Official application instructions", keywords: ["apply", "application", "submit", "procedure", "steps"], impact: 2 },
    { id: "official-link", title: "Official application link", reason: "Use the official programme page before sharing personal information.", sourceType: "Official programme website", keywords: ["portal", "official website", "application link", "online application"], impact: 3 },
  ],
  eligibility: [
    { id: "eligibility-criteria", title: "Eligibility criteria", reason: "List the conditions and thresholds that determine eligibility.", sourceType: "Current official eligibility rules", keywords: ["eligible", "eligibility", "criteria", "qualify", "threshold"], impact: 3 },
    { id: "exceptions", title: "Exceptions and exclusions", reason: "Check whether exemptions or exclusions change how the rules apply.", sourceType: "Official rules and exceptions", keywords: ["exception", "exclusion", "unless", "waiver"], impact: 3 },
    { id: "supporting-documents", title: "Supporting documents", reason: "Find the documents needed to support a review.", sourceType: "Official application checklist", keywords: ["document", "proof", "evidence", "transcript", "record"], impact: 2 },
    { id: "decision-timing", title: "Dates and review process", reason: "Confirm when and how a decision is made.", sourceType: "Official programme page", keywords: ["date", "deadline", "review", "decision", "process"], impact: 2 },
  ],
  policy: [
    { id: "policy-authority", title: "Issuing authority and scope", reason: "Confirm who issued the policy and who it applies to.", sourceType: "Official policy source", keywords: ["authority", "issued", "scope", "applies", "jurisdiction"], impact: 3 },
    { id: "effective-date", title: "Effective date and current version", reason: "A newer version may change the applicable rule.", sourceType: "Current official policy page", keywords: ["effective", "updated", "version", "current", "date"], impact: 3 },
    { id: "policy-requirements", title: "Requirements and exceptions", reason: "Capture the rule, conditions and any exceptions.", sourceType: "Policy text and official guidance", keywords: ["requirement", "must", "exception", "condition", "rule"], impact: 3 },
    { id: "policy-process", title: "Process and review route", reason: "Find the official steps for questions, review or appeal.", sourceType: "Official process guidance", keywords: ["process", "review", "appeal", "contact", "submit"], impact: 2 },
  ],
  comparison: [
    { id: "comparison-scope", title: "Comparable versions and conditions", reason: "Make sure the items are compared for the same scope and period.", sourceType: "Current product or service pages", keywords: ["version", "model", "condition", "plan", "period"], impact: 2 },
    { id: "comparison-features", title: "Key features and specifications", reason: "Compare features that matter for the stated goal.", sourceType: "Official specifications", keywords: ["feature", "specification", "includes", "supports"], impact: 2 },
    { id: "comparison-cost", title: "Price, fees and limitations", reason: "Check the total price and conditions that affect it.", sourceType: "Official pricing and terms", keywords: ["price", "cost", "fee", "limit", "terms"], impact: 3 },
    { id: "comparison-freshness", title: "Current availability and terms", reason: "Product details and availability can change.", sourceType: "Current official product pages", keywords: ["available", "current", "updated", "date", "region"], impact: 2 },
  ],
  general: [
    { id: "main-claim", title: "Main claims and evidence", reason: "Connect important claims to the text that supports them.", sourceType: "Relevant primary sources", keywords: ["evidence", "study", "report", "result", "claim"], impact: 2 },
    { id: "scope", title: "Scope and conditions", reason: "Check who, where and when the information applies.", sourceType: "Primary sources with stated scope", keywords: ["scope", "applies", "condition", "region", "period"], impact: 2 },
    { id: "freshness", title: "Dates and current relevance", reason: "Separate publication dates from valid-through dates.", sourceType: "Current primary sources", keywords: ["date", "updated", "current", "valid", "period"], impact: 2 },
    { id: "open-questions", title: "Unanswered questions", reason: "Record what the reviewed pages do not establish.", sourceType: "Additional primary sources", keywords: ["question", "limitation", "unknown", "not stated"], impact: 2 },
  ],
};

const highStakesPattern = /\b(legal|lawyer|medical|health|doctor|financial|investment|insurance|immigration|visa|employment eligibility|emergency|urgent|safety critical)\b/i;
const deadlinePattern = /\b(deadline|due date|closing date|expires?|apply by|urgent|emergency)\b/i;

function categoryFor(query: string): IntentCategory {
  const value = query.toLowerCase();
  if (/\b(eligible|eligibility|qualify|qualification)\b/.test(value)) return "eligibility";
  if (/\b(scholarship|grant|bursary|fellowship|application|admission)\b/.test(value)) return "scholarship";
  if (/\b(policy|regulation|law|rule|guideline)\b/.test(value)) return "policy";
  if (/\b(compare|comparison|versus|\bvs\b|alternative|which product)\b/.test(value)) return "comparison";
  return "general";
}

export function inferIntent(query: string): IntentSuggestion {
  const category = categoryFor(query);
  const highStakes = highStakesPattern.test(query);
  const timeSensitivity = deadlinePattern.test(query) || category === "scholarship" ? "high" : category === "policy" ? "medium" : "low";
  const timeReason = timeSensitivity === "high"
    ? "Deadlines and application details can change by cycle; verify current dates before acting."
    : timeSensitivity === "medium"
      ? "Rules may change when a policy is updated; check its effective date."
      : "No deadline is clear from the question; review the dates in the sources you choose.";
  return {
    category,
    summary: query.trim(),
    timeSensitivity,
    timeReason,
    highStakes,
    requirements: templates[category].map((item) => ({ ...item })),
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
    }));
}
