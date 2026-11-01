# Digital Dark Spot — Research Relevance, Quality & Alignment Audit

**Date:** 2026-11-01  
**Scope:** Complete end-to-end audit of query normalization, intent understanding, search planning, source discovery, relevance ranking, claim extraction, evidence mapping, answer synthesis, and Generative UI selection.

---

## 1. Executive Diagnosis & Problem Reproduction

A thorough audit of the research pipeline identified 6 critical architectural and algorithmic defects causing research results to appear generic, incomplete, or inappropriately forced into the scholarship demonstration template.

### Reproduced Failing Query Examples

| # | Submitted User Query | Observed Erroneous Output | Root Cause in Code |
|---|----------------------|---------------------------|-------------------|
| **1** | *"Explain how a vector database works."* | Output suggested checking *"official deadlines and application cycles for vector database"* and verifying *"required documents before submitting applications"*. | `src/lib/research/answer-engine.ts` (lines 443–459) default fallback assumed all unmatched queries were application/scholarship submissions. |
| **2** | *"What are the current requirements for an Indian student applying for a German student visa?"* | Generated requirements included: `award-amount` (*"Confirm financial award scope and whether it covers stipend"*) and `renewal` (*"Check GPA maintenance"*) for a visa! | `src/lib/research/intent.ts` (line 398) evaluated `domainTemplates.scholarship \|\| domainTemplates.application_or_eligibility`. Because `domainTemplates.scholarship` was truthy, any `application_or_eligibility` query received scholarship criteria. |
| **3** | *"What are the major research challenges in explainable AI?"* | Generated only 1 or 2 generic requirement templates (`concept-core`), missing literature findings, evaluation metrics, and open challenges. | `src/lib/research/intent.ts` lacked a dedicated `academic_research` task generator and domain-aware schema. |
| **4** | *"Compare React and Vue for building a large web application."* | Candidate web search ranking sorted pages solely by `.gov` / `.edu` / `.org` TLDs, causing irrelevant educational catalog pages to outrank authoritative technical documentation. | `src/lib/research/providers/orchestrator.ts` (lines 136–140) sorted candidates by domain authority alone without computing query-relevance or topic/entity matches. |
| **5** | *"How do I publish a Next.js application on Vercel?"* | Generated high-level policy text rather than ordered sequential steps with pre-requisite validation and CLI/git deployment commands. | Lack of dedicated `how_to` procedural task handling in `intent.ts` and `answer-engine.ts`. |
| **6** | *"Tell me about Apple."* | Output treated the query as a general corporation without detecting severe ambiguity between Apple Inc., the fruit *Malus domestica*, or the record label. | `src/lib/research/intent.ts` had no ambiguity detection or provisional interpretation mechanism. |

---

## 2. Root Cause Breakdown

### A. Intent Understanding & Domain Isolation Defect
* **File:** `src/lib/research/intent.ts`
* **Defect:** 
  1. `domainTemplates.scholarship` was evaluated ahead of `domainTemplates.application_or_eligibility`. As a result, non-scholarship applications (visa applications, university admissions, licensing, employment permits) inherited financial aid questions (award amounts, GPA renewals).
  2. The system lacked the 10 formal task classifications required by the hackathon specification (`factual_question`, `research_overview`, `comparison`, `current_information`, `requirements_check`, `how_to`, `policy_or_regulation`, `academic_research`, `decision_support`, `open_ended_topic`).
  3. Search query expansion was overly reductive, reducing complex queries to 2 generic terms and discarding critical entities, jurisdiction, and constraints.

### B. Candidate Ranking & Retrieval Relevance Defect
* **File:** `src/lib/research/providers/orchestrator.ts`
* **Defect:** Candidate selection in `MultiProviderOrchestrator` sorted search results using a coarse regex for `.gov` / `.edu` domains. It gave 0 weight to keyword matching, topic alignment, or requirement fulfillment. A `.gov` page containing the word "technology" in a completely unrelated context would outrank a `.org` or official vendor documentation page directly addressing the user's question.

### C. Answer Synthesis Fallback Bias
* **File:** `src/lib/research/answer-engine.ts`
* **Defect:** The terminal `else` block in `synthesizeAnswer()` was hardcoded with scholarship/policy boilerplate: *"requires examining official governing frameworks, verifying eligibility thresholds, reviewing active deadlines..."*. When any query did not trigger an exact keyword branch, it fell into this default text, making the application look like a scholarship tool in disguise.

### D. Claim Extraction & Contradiction Evaluation Limitation
* **File:** `src/lib/research/url-research.ts`
* **Defect:** In `makeClaims()`, the `subject` property was left `undefined`. In `analysis.ts`, `findPossibleConflicts()` requires `left.subject && right.subject` to compare claims. Because `subject` was never populated during dynamic web extraction, conflict detection was effectively disabled on live web sources.

### E. Information Gap Binary Classification
* **File:** `src/lib/research/analysis.ts` & `src/lib/research/schema.ts`
* **Defect:** The coverage schema only had `covered`, `partial`, `missing_in_reviewed_sources`, `conflicting`, and `needs_verification`. It lacked `not_applicable`. When a general template contained an optional requirement that did not apply to the user's specific context, it was incorrectly reported as a missing information gap, alarming users with irrelevant warnings.

---

## 3. Corrective Architecture Plan

1. **IntentUnderstandingEngine (`src/lib/research/intent.ts`)**:
   - Implement `IntentAnalysis` matching the problem-statement schema.
   - Detect 10 task types and open domains.
   - Strictly isolate `scholarship` to queries explicitly about scholarships, fellowships, or grants.
   - Generate query-specific, domain-tailored information requirements.
   - Generate 3–6 focused search queries preserving entities, context, and requested timeframe.
   - Add ambiguity detection (`low` | `medium` | `high`) with provisional interpretation for underspecified queries (e.g. "Tell me about Apple").

2. **SearchPlanningEngine & Two-Stage Relevance Ranking (`src/lib/research/providers/orchestrator.ts`)**:
   - Stage A: Multi-provider candidate retrieval (Wikimedia, OpenAlex, DuckDuckGo, Brave).
   - Stage B: Two-pass query-specific relevance reranker combining:
     $$\text{Relevance} = 0.30 \times \text{entity/topic} + 0.25 \times \text{requirement} + 0.20 \times \text{directness} + 0.15 \times \text{term coverage} + 0.10 \times \text{suitability}$$
   - Maintain source-to-requirement traceability.

3. **Evidence Extraction & Provenance Tracking (`src/lib/research/url-research.ts`)**:
   - Extract `subject`, `attribute`, `value`, `unit`, `period`, and `condition` dynamically.
   - Track provenance: `page_excerpt`, `search_snippet`, `user_provided`, `demo_fixture`.
   - Separate retrieval timestamp from publication/modification/validity dates.

4. **Evidence-Grounded Answer Synthesis (`src/lib/research/answer-engine.ts`)**:
   - Eliminate scholarship fallback text.
   - Synthesize direct answers from reviewed claims across all 10 task types and diverse domains.
   - Include key findings, code blocks, comparison tables, step guides, and citations.

5. **Information-Gap & Contradiction Engine (`src/lib/research/analysis.ts`)**:
   - Add `not_applicable` status.
   - Ensure "not found in the sources reviewed" language is used.
   - Compare context (jurisdiction, period, unit) before declaring contradictions.

6. **Generative UI Planning (`src/lib/research/ui-plan.ts`)**:
   - Map `taskType` to appropriate UI component layouts.
   - Enforce schema validation and fail-safe fallbacks.

7. **Verification & Regression Testing**:
   - Implement 12-query test suite (`tests/regression-matrix.test.ts`).
   - Create evaluation harness (`scripts/evaluate-research.ts`).
