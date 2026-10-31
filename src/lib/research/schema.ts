import { z } from "zod";

export const IntentCategorySchema = z.enum([
  "scholarship",
  "eligibility",
  "policy",
  "comparison",
  "general",
]);

export const RequirementSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  reason: z.string().min(1).max(320),
  sourceType: z.string().min(1).max(120),
  keywords: z.array(z.string().min(1).max(80)).max(12),
  impact: z.number().int().min(1).max(3),
  expectedPeriod: z.string().max(80).optional(),
});

export const SourceSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(240),
  domain: z.string().min(1).max(180),
  url: z.string().url().max(2048).nullable(),
  origin: z.enum(["illustrative", "user-provided"]),
  status: z.enum(["reviewed", "blocked", "timeout", "unsupported", "empty"]),
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

export const ResearchResultSchema = z.object({
  version: z.literal(1),
  mode: z.enum(["demo", "url"]),
  query: z.string().min(1).max(2000),
  intent: z.object({
    category: IntentCategorySchema,
    summary: z.string().min(1).max(320),
    timeSensitivity: z.enum(["high", "medium", "low"]),
    timeReason: z.string().min(1).max(320),
    highStakes: z.boolean(),
  }),
  requirements: z.array(RequirementSchema).max(12),
  sources: z.array(SourceSchema).max(3),
  claims: z.array(ClaimSchema).max(120),
  coverage: z.array(RequirementCoverageSchema).max(12),
  conflicts: z.array(ConflictSchema).max(40),
  tasks: z.array(VerificationTaskSchema).max(12),
  evidenceCoverage: z.object({
    withEvidence: z.number().int().min(0),
    denominator: z.number().int().min(0),
    percentage: z.number().int().min(0).max(100),
    caveat: z.string().min(1).max(320),
  }),
  reviewedSourceCount: z.number().int().min(0).max(3),
  status: z.enum(["complete", "partial", "blocked"]),
  limitations: z.array(z.string().min(1).max(320)).max(8),
});

export type IntentCategory = z.infer<typeof IntentCategorySchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type EvidenceClaim = z.infer<typeof ClaimSchema>;
export type CoverageStatus = z.infer<typeof CoverageStatusSchema>;
export type RequirementCoverage = z.infer<typeof RequirementCoverageSchema>;
export type PossibleConflict = z.infer<typeof ConflictSchema>;
export type VerificationTask = z.infer<typeof VerificationTaskSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
