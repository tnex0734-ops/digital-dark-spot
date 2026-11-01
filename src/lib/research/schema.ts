import { z } from "zod";

export const IntentCategorySchema = z.enum([
  "general_explanation",
  "current_information",
  "research_question",
  "comparison",
  "how_to",
  "definition",
  "summarization",
  "document_analysis",
  "technical_help",
  "calculation",
  "pros_cons",
  "application_or_eligibility",
  "high_impact_information",
  "unknown_or_mixed",
  // Legacy / alias compatibility
  "scholarship",
  "eligibility",
  "policy",
  "academic",
  "general",
]);

export const RequirementSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  reason: z.string().min(1).max(320),
  sourceType: z.string().min(1).max(120),
  keywords: z.array(z.string().min(1).max(80)).max(12),
  impact: z.number().int().min(1).max(3),
  timeSensitivity: z.enum(["high", "medium", "low"]).optional(),
  searchIntent: z.string().max(240).optional(),
  expectedPeriod: z.string().max(80).optional(),
});

export const DiscoveredSourceSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  url: z.string().url().max(2048),
  domain: z.string().min(1).max(180),
  snippet: z.string().max(2000).optional(),
  publishedDate: z.string().nullable().optional(),
  provider: z.string().min(1).max(80),
  query: z.string().min(1).max(400).optional(),
  selectedForReview: z.boolean(),
});

export const SourceSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(300),
  domain: z.string().min(1).max(180),
  url: z.string().url().max(2048).nullable(),
  origin: z.enum(["illustrative", "user-provided", "automatic-search"]),
  status: z.enum(["reviewed", "blocked", "timeout", "unsupported", "empty", "not_reviewed"]),
  error: z.string().max(320).optional(),
  headings: z.array(z.string().min(1).max(200)).max(40),
  authoritySignal: z.string().min(1).max(180),
  retrievalNote: z.string().min(1).max(240),
  dates: z.object({
    published: z.string().datetime({ offset: true }).nullable(),
    modified: z.string().datetime({ offset: true }).nullable(),
    retrieved: z.string().datetime({ offset: true }),
    validFrom: z.string().datetime({ offset: true }).nullable(),
    validTo: z.string().datetime({ offset: true }).nullable(),
  }),
});

export const CitationSchema = z.object({
  id: z.string().min(1).max(80),
  sourceId: z.string().min(1).max(80),
  label: z.string().min(1).max(40),
  title: z.string().min(1).max(240),
  url: z.string().url().max(2048).nullable(),
  excerpt: z.string().max(1200).optional(),
});

export const ComparisonRowSchema = z.object({
  attribute: z.string().min(1).max(120),
  itemA: z.string().min(1).max(500),
  itemB: z.string().min(1).max(500),
  verdict: z.string().max(500).optional(),
});

export const StepGuideSchema = z.object({
  step: z.number().int().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1200),
  warning: z.string().max(400).optional(),
});

export const DirectAnswerSchema = z.object({
  headline: z.string().min(1).max(300),
  directAnswer: z.string().min(1).max(4000),
  keyPoints: z.array(z.string().min(1).max(600)).max(12),
  detailedExplanation: z.string().max(10000).optional(),
  code: z
    .object({
      language: z.string().max(40),
      content: z.string().max(6000),
      explanation: z.string().max(1200).optional(),
    })
    .optional(),
  steps: z.array(StepGuideSchema).max(12).optional(),
  comparisonRows: z.array(ComparisonRowSchema).max(20).optional(),
  comparisonHeaders: z.tuple([z.string().max(80), z.string().max(80)]).optional(),
  prosCons: z
    .object({
      pros: z.array(z.string().max(500)).max(10),
      cons: z.array(z.string().max(500)).max(10),
    })
    .optional(),
  conclusion: z.string().max(2000).optional(),
});

export const SearchSummarySchema = z.object({
  provider: z.string().min(1).max(120),
  query: z.string().min(1).max(600),
  queries: z.array(z.string().min(1).max(400)).max(10).optional(),
  resultsFound: z.number().int().min(0).max(100),
  pagesSelected: z.number().int().min(0).max(20),
});

export const ClaimSchema = z.object({
  id: z.string().min(1).max(80),
  sourceId: z.string().min(1).max(80),
  requirementIds: z.array(z.string().min(1).max(80)).min(1).max(12),
  statement: z.string().min(1).max(500),
  excerpt: z.string().min(1).max(1200),
  method: z.enum(["illustrative", "keyword-match"]),
  directness: z.enum(["direct", "partial"]),
  subject: z.string().max(160).optional(),
  attribute: z.string().max(120).optional(),
  value: z.string().max(160).optional(),
  unit: z.string().max(80).optional(),
  jurisdiction: z.string().max(100).optional(),
  condition: z.string().max(180).optional(),
  period: z.string().max(80).optional(),
});

export const CoverageStatusSchema = z.enum([
  "covered",
  "partial",
  "missing_in_reviewed_sources",
  "conflicting",
  "needs_verification",
]);

export const RequirementCoverageSchema = z.object({
  requirementId: z.string().min(1),
  status: CoverageStatusSchema,
  claimIds: z.array(z.string()),
  reason: z.string().min(1).max(320),
});

export const ConflictSchema = z.object({
  id: z.string().min(1),
  requirementId: z.string().min(1),
  leftClaimId: z.string().min(1),
  rightClaimId: z.string().min(1),
  reason: z.string().min(1).max(320),
});

export const VerificationTaskSchema = z.object({
  id: z.string().min(1),
  requirementId: z.string().min(1),
  title: z.string().min(1).max(180),
  why: z.string().min(1).max(320),
  nextSource: z.string().min(1).max(160),
  priority: z.enum(["high", "medium", "low"]),
  priorityReason: z.string().min(1).max(320),
});

export const FollowUpActionSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(320),
  targetRequirementId: z.string().min(1).max(80),
  suggestedQuery: z.string().min(1).max(300),
});

export const ConversationTurnSchema = z.object({
  query: z.string().max(2000),
  summary: z.string().max(1000).optional(),
  topic: z.string().max(200).optional(),
  timestamp: z.string().datetime({ offset: true }),
});

export const ResearchResultSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["demo", "web-search", "url"]),
  query: z.string().min(1).max(2000),
  conversationId: z.string().max(80).optional(),
  createdAt: z.string().datetime({ offset: true }).optional(),
  search: SearchSummarySchema.optional(),
  answer: DirectAnswerSchema.optional(),
  citations: z.array(CitationSchema).max(30).optional(),
  intent: z.object({
    category: IntentCategorySchema,
    categories: z.array(IntentCategorySchema).max(5).optional(),
    summary: z.string().min(1).max(320),
    timeSensitivity: z.enum(["high", "medium", "low"]),
    timeReason: z.string().min(1).max(320),
    highStakes: z.boolean(),
  }),
  requirements: z.array(RequirementSchema).max(16),
  discoveredSources: z.array(DiscoveredSourceSchema).max(50).optional(),
  discoveredSourceCount: z.number().int().min(0).max(100).optional(),
  sources: z.array(SourceSchema).max(50),
  claims: z.array(ClaimSchema).max(120),
  coverage: z.array(RequirementCoverageSchema).max(16),
  conflicts: z.array(ConflictSchema).max(40),
  tasks: z.array(VerificationTaskSchema).max(16),
  followUpActions: z.array(FollowUpActionSchema).max(12).optional(),
  relatedQuestions: z.array(z.string().min(1).max(200)).max(8).optional(),
  evidenceCoverage: z.object({
    withEvidence: z.number().int().min(0),
    denominator: z.number().int().min(0),
    percentage: z.number().int().min(0).max(100),
    caveat: z.string().min(1).max(320),
  }),
  reviewedSourceCount: z.number().int().min(0).max(50),
  status: z.enum(["complete", "partial", "blocked"]),
  limitations: z.array(z.string().min(1).max(320)).max(12),
});

export type IntentCategory = z.infer<typeof IntentCategorySchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type DiscoveredSource = z.infer<typeof DiscoveredSourceSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type DirectAnswer = z.infer<typeof DirectAnswerSchema>;
export type SearchSummary = z.infer<typeof SearchSummarySchema>;
export type EvidenceClaim = z.infer<typeof ClaimSchema>;
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;
export type RequirementCoverage = z.infer<typeof RequirementCoverageSchema>;
export type PossibleConflict = z.infer<typeof ConflictSchema>;
export type VerificationTask = z.infer<typeof VerificationTaskSchema>;
export type FollowUpAction = z.infer<typeof FollowUpActionSchema>;
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
