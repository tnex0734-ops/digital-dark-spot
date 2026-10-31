import { buildResearchResult } from "./analysis";
import { ResearchResultSchema, type EvidenceClaim, type Requirement, type Source } from "./schema";

const requirements: Requirement[] = [
  { id: "eligibility", title: "Eligibility criteria", reason: "Check who can apply and any thresholds or exceptions.", sourceType: "Current official scholarship notice", keywords: ["eligible", "eligibility", "applicant", "criteria", "residency", "enrolment"], impact: 3 },
  { id: "award-amount", title: "Award amount and duration", reason: "Confirm the amount, duration and any renewal conditions.", sourceType: "Current official award terms", keywords: ["award", "amount", "funding", "stipend", "renewal", "duration"], impact: 2 },
  { id: "required-documents", title: "Required documents", reason: "Identify every document and format the application requires.", sourceType: "Current application checklist", keywords: ["document", "transcript", "recommendation", "letter", "proof", "required"], impact: 3, expectedPeriod: "2026–27" },
  { id: "deadline", title: "Current deadline", reason: "Deadlines can change between application cycles.", sourceType: "Current official scholarship notice", keywords: ["deadline", "closing", "due date", "application period"], impact: 3, expectedPeriod: "2026–27" },
  { id: "renewal", title: "Renewal conditions", reason: "Find whether continued funding has additional conditions.", sourceType: "Current official award terms", keywords: ["renewal", "renew", "continued funding"], impact: 2 },
  { id: "application-steps", title: "Application steps", reason: "Understand how and where an application must be submitted.", sourceType: "Official application instructions", keywords: ["apply", "application", "submit", "procedure", "steps"], impact: 2 },
  { id: "official-link", title: "Official application link", reason: "Use the official programme page before sharing personal information.", sourceType: "Official programme website", keywords: ["portal", "official website", "application link", "online application"], impact: 3 },
];

const sources: Source[] = [
  {
    id: "source-old-cycle",
    title: "Bright Path applicant guide, 2024–25 cycle (synthetic example)",
    domain: "Illustrative fixture, no live URL",
    url: null,
    origin: "illustrative",
    status: "reviewed",
    headings: ["Eligibility", "Application dates"],
    authoritySignal: "Synthetic source; authority is not assessed",
    retrievalNote: "Bundled demo excerpt, not a real scholarship record",
    dates: { published: "2024-03-08T00:00:00.000Z", modified: null, retrieved: "2026-11-01T00:00:00.000Z", validFrom: "2024-03-08T00:00:00.000Z", validTo: "2025-01-31T23:59:59.000Z" },
  },
  {
    id: "source-current-notice",
    title: "Bright Path application notice, 2026–27 cycle (synthetic example)",
    domain: "Illustrative fixture, no live URL",
    url: null,
    origin: "illustrative",
    status: "reviewed",
    headings: ["Eligibility", "Award amount", "Application process"],
    authoritySignal: "Synthetic source; authority is not assessed",
    retrievalNote: "Bundled demo excerpt, not a real scholarship record",
    dates: { published: "2026-07-15T00:00:00.000Z", modified: "2026-09-21T00:00:00.000Z", retrieved: "2026-11-01T00:00:00.000Z", validFrom: "2026-07-15T00:00:00.000Z", validTo: "2027-06-30T23:59:59.000Z" },
  },
  {
    id: "source-checklist",
    title: "Student funding document checklist (synthetic example)",
    domain: "Illustrative fixture, no live URL",
    url: null,
    origin: "illustrative",
    status: "reviewed",
    headings: ["First-time applicant checklist"],
    authoritySignal: "Synthetic source; authority is not assessed",
    retrievalNote: "Bundled demo excerpt, not a real scholarship record",
    dates: { published: "2026-08-01T00:00:00.000Z", modified: null, retrieved: "2026-11-01T00:00:00.000Z", validFrom: "2026-07-15T00:00:00.000Z", validTo: "2027-06-30T23:59:59.000Z" },
  },
];

const claims: EvidenceClaim[] = [
  {
    id: "claim-eligibility", sourceId: "source-current-notice", requirementIds: ["eligibility"],
    statement: "The illustrative notice describes a GPA and enrolment requirement.",
    excerpt: "For this illustrative 2026–27 cycle, applicants must have a minimum 3.0 grade-point average and be enrolled full time in an accredited programme.",
    method: "illustrative", directness: "direct", subject: "Bright Path Scholarship", attribute: "eligibility", value: "3.0 GPA and full-time enrolment", jurisdiction: "North region", period: "2026–27",
  },
  {
    id: "claim-award", sourceId: "source-current-notice", requirementIds: ["award-amount"],
    statement: "The illustrative notice lists an annual award amount.",
    excerpt: "The illustrative award is $18,000 for one academic year. Continued funding terms are not included in this excerpt.",
    method: "illustrative", directness: "direct", subject: "Bright Path Scholarship", attribute: "annual award", value: "$18,000", unit: "USD per academic year", jurisdiction: "North region", period: "2026–27",
  },
  {
    id: "claim-old-deadline", sourceId: "source-old-cycle", requirementIds: ["deadline"],
    statement: "An older illustrative guide lists a past application deadline.",
    excerpt: "For the 2024–25 cycle, applications were due by December 12, 2024.",
    method: "illustrative", directness: "direct", subject: "Bright Path Scholarship", attribute: "application deadline", value: "December 12, 2024", unit: "date", jurisdiction: "North region", period: "2024–25",
  },
  {
    id: "claim-two-letters", sourceId: "source-current-notice", requirementIds: ["required-documents"],
    statement: "One illustrative notice says two recommendation letters are required.",
    excerpt: "First-time applicants in the 2026–27 cycle must submit two recommendation letters with their application.",
    method: "illustrative", directness: "direct", subject: "Bright Path Scholarship", attribute: "recommendation letter count", value: "2", unit: "letters", jurisdiction: "North region", condition: "first-time applicants", period: "2026–27",
  },
  {
    id: "claim-one-letter", sourceId: "source-checklist", requirementIds: ["required-documents"],
    statement: "A second illustrative checklist says one recommendation letter is required.",
    excerpt: "The 2026–27 first-time applicant checklist asks for one recommendation letter, plus a transcript and proof of enrolment.",
    method: "illustrative", directness: "direct", subject: "Bright Path Scholarship", attribute: "recommendation letter count", value: "1", unit: "letters", jurisdiction: "North region", condition: "first-time applicants", period: "2026–27",
  },
  {
    id: "claim-process", sourceId: "source-current-notice", requirementIds: ["application-steps"],
    statement: "The illustrative notice describes a submission step.",
    excerpt: "Applicants should complete the programme form and submit the listed documents before the closing date.",
    method: "illustrative", directness: "direct", subject: "Bright Path Scholarship", attribute: "submission process", value: "complete form and submit documents", jurisdiction: "North region", period: "2026–27",
  },
];

export const scholarshipDemo = ResearchResultSchema.parse(buildResearchResult({
  mode: "demo",
  query: "What should I verify before applying for the Bright Path Scholarship?",
  requirements,
  sources,
  claims,
  limitations: ["All scholarship names, records, excerpts and dates in this workspace are synthetic and for interface demonstration only."],
}));
