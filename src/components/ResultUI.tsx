"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock,
  Compass,
  ExternalLink,
  FileSearch,
  FileText,
  Info,
  Layers,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { classifyFreshness } from "@/lib/research/analysis";
import { buildUIPlan, validateUIPlan, type UIComponentType, type UIPlan } from "@/lib/research/ui-plan";
import type {
  CoverageStatus,
  EvidenceClaim,
  FollowUpAction,
  PossibleConflict,
  ResearchResult,
  Source,
  VerificationTask,
} from "@/lib/research/schema";

export function DemoDatasetBadge() {
  return (
    <div className="demo-dataset-badge">
      <span className="badge-spark" aria-hidden="true">✳</span>
      <strong>Illustrative demo dataset</strong>
      <span>Not live scholarship advice</span>
    </div>
  );
}

export function DatasetNote() {
  return (
    <p className="dataset-note">
      <span className="dataset-note-dot" aria-hidden="true" />
      All names, excerpts and dates in the scholarship example are fictional, for interface demonstration only.
    </p>
  );
}

export function AccuracyNotice() {
  return (
    <aside className="accuracy-notice" aria-labelledby="accuracy-notice-title">
      <div className="notice-icon">
        <Info size={19} aria-hidden="true" />
      </div>
      <div>
        <h2 id="accuracy-notice-title">Important accuracy notice</h2>
        <p>
          AI-generated and automated information may be incomplete or inaccurate. Before making an
          important or sensitive decision that could cause significant loss or harm, check the
          information twice using authoritative sources and consult an appropriately qualified
          professional where appropriate. Machines can make mistakes.
        </p>
      </div>
    </aside>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "No date found";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
      new Date(value),
    );
  } catch {
    return "Undated";
  }
}

function statusLabel(status: CoverageStatus): string {
  return {
    covered: "Covered",
    partial: "Partially covered",
    missing_in_reviewed_sources: "Not found in reviewed sources",
    conflicting: "Possible conflict",
    needs_verification: "Needs verification",
  }[status];
}

function coverageFor(result: ResearchResult, id: string) {
  return result.coverage.find((item) => item.requirementId === id);
}

function claimFor(result: ResearchResult, id: string): EvidenceClaim | undefined {
  return result.claims.find((item) => item.id === id);
}

function sourceFor(result: ResearchResult, id: string): Source | undefined {
  return result.sources.find((item) => item.id === id);
}

function externalHttpsUrl(source: Source): string | null {
  if (!source.url) return null;
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function SourceDetailDrawer({
  source,
  claims = [],
  onClose,
}: {
  source: Source | null;
  claims?: EvidenceClaim[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!source) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, a[href]")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [source, onClose]);

  if (!source) return null;
  const externalUrl = externalHttpsUrl(source);

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        className="source-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-drawer-title"
        tabIndex={-1}
      >
        <div className="drawer-heading">
          <div className="drawer-icon">
            <FileText size={20} aria-hidden="true" />
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close source details"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <span className="eyebrow">Source detail</span>
        <h2 id="source-drawer-title">{source.title}</h2>
        <p className="source-domain">{source.domain}</p>
        <span className={`source-state source-state--${source.status}`}>
          {source.status === "reviewed"
            ? "Page text reviewed"
            : source.status === "not_reviewed"
              ? "Discovered · Not selected for deep extraction"
              : source.status}
        </span>
        {source.error && <p className="source-error">{source.error}</p>}
        <dl className="date-list">
          <div>
            <dt>Published</dt>
            <dd>{formatDate(source.dates.published)}</dd>
          </div>
          <div>
            <dt>Modified</dt>
            <dd>{formatDate(source.dates.modified)}</dd>
          </div>
          <div>
            <dt>Retrieved</dt>
            <dd>{formatDate(source.dates.retrieved)}</dd>
          </div>
          <div>
            <dt>Valid from</dt>
            <dd>{formatDate(source.dates.validFrom)}</dd>
          </div>
          <div>
            <dt>Valid through</dt>
            <dd>{formatDate(source.dates.validTo)}</dd>
          </div>
        </dl>
        <section className="source-headings" aria-labelledby="source-headings-title">
          <h3 id="source-headings-title">Extracted Headings</h3>
          {source.headings.length ? (
            <ul>
              {source.headings.map((heading, index) => (
                <li key={`${heading}-${index}`}>{heading}</li>
              ))}
            </ul>
          ) : (
            <p>No structural headings found on this page.</p>
          )}
        </section>
        <div className="source-trust-note">
          <strong>Authority Signal</strong>
          <p>{source.authoritySignal}</p>
        </div>
        <p className="drawer-note">{source.retrievalNote}</p>
        <section className="drawer-excerpts" aria-labelledby="drawer-excerpts-heading">
          <h3 id="drawer-excerpts-heading">Excerpts used in this review</h3>
          {claims.length ? (
            claims.map((claim) => <blockquote key={claim.id}>{claim.excerpt}</blockquote>)
          ) : (
            <p>No matching excerpts were selected from this source.</p>
          )}
        </section>
        {externalUrl && (
          <a
            className="button button-secondary drawer-open-link"
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original page <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}
        <button className="button button-dark drawer-close" type="button" onClick={onClose}>
          Close details
        </button>
      </section>
    </div>
  );
}

interface RegistryProps {
  result: ResearchResult;
  ids: string[];
  onOpenSource: (source: Source) => void;
  checkedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  onFollowUp?: (action: FollowUpAction) => void;
}

// 1. ResearchSummary
function ResearchSummary({ result }: RegistryProps) {
  const coverage = result.evidenceCoverage;
  const discoveredCount = result.discoveredSourceCount ?? result.sources.length;

  return (
    <section className="result-summary" aria-labelledby="result-question">
      <div className="summary-topline">
        <span className="eyebrow">
          {result.mode === "demo" ? "Scholarship Demo Workspace" : "Autonomous Research Workspace"}
        </span>
        <span className={`review-status review-status--${result.status}`}>
          {result.status === "complete"
            ? "Research complete"
            : result.status === "partial"
              ? "Partial evidence review"
              : "Sources unreviewed"}
        </span>
      </div>
      <h2 id="result-question">{result.query}</h2>
      <div className="summary-facts">
        <div>
          <span>Evidence coverage</span>
          <strong>{coverage.percentage}%</strong>
          <small>
            {coverage.withEvidence} of {coverage.denominator} requirements have supporting excerpts
          </small>
        </div>
        <div>
          <span>Sources discovered / reviewed</span>
          <strong>
            {result.reviewedSourceCount}{" "}
            <small>of {discoveredCount} discovered</small>
          </strong>
          <small>
            {result.search ? `Discovered via ${result.search.provider}` : "From candidate sources"}
          </small>
        </div>
        <div>
          <span>Open verification tasks</span>
          <strong>{result.tasks.length}</strong>
          <small>Prioritized checks for decisions</small>
        </div>
      </div>
      <p className="coverage-caveat">{coverage.caveat}</p>
      {result.intent.highStakes && (
        <div className="high-stakes-note" role="note">
          <CircleAlert size={18} aria-hidden="true" />
          <p>
            This topic may impact a high-stakes decision. Consult official primary sources and an
            appropriately qualified professional. This application organizes source evidence; it does
            not provide professional advice.
          </p>
        </div>
      )}
    </section>
  );
}

// 2. CoverageOverview
function CoverageOverview({ result }: RegistryProps) {
  const coverage = result.coverage;
  const covered = coverage.filter((c) => c.status === "covered").length;
  const partial = coverage.filter((c) => c.status === "partial").length;
  const missing = coverage.filter((c) => c.status === "missing_in_reviewed_sources").length;
  const conflicting = coverage.filter((c) => c.status === "conflicting").length;
  const needsVerif = coverage.filter((c) => c.status === "needs_verification").length;

  return (
    <section className="result-section coverage-overview-panel" aria-labelledby="overview-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Corpus Evidence Status</span>
          <h2 id="overview-heading">Requirement Coverage Breakdown</h2>
        </div>
        <span className="section-count">{result.requirements.length} total requirements</span>
      </div>
      <div className="coverage-pills-row">
        <div className="coverage-stat-card is-covered">
          <span className="count">{covered}</span>
          <span className="label">Covered with direct evidence</span>
        </div>
        <div className="coverage-stat-card is-partial">
          <span className="count">{partial}</span>
          <span className="label">Partially covered</span>
        </div>
        <div className="coverage-stat-card is-missing">
          <span className="count">{missing}</span>
          <span className="label">Not found in reviewed sources</span>
        </div>
        {conflicting > 0 && (
          <div className="coverage-stat-card is-conflicting">
            <span className="count">{conflicting}</span>
            <span className="label">Possible conflicts</span>
          </div>
        )}
        {needsVerif > 0 && (
          <div className="coverage-stat-card is-warning">
            <span className="count">{needsVerif}</span>
            <span className="label">Needs cycle/date verification</span>
          </div>
        )}
      </div>
    </section>
  );
}

// 3. CoverageMatrix
function CoverageMatrix({ result, ids }: RegistryProps) {
  const requirements = ids.length
    ? result.requirements.filter((item) => ids.includes(item.id))
    : result.requirements;

  return (
    <section className="result-section" aria-labelledby="coverage-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Information Requirements</span>
          <h2 id="coverage-heading">Requirement Matrix & Evidence Status</h2>
        </div>
        <span className="suggested-note">Derived from intent analysis</span>
      </div>
      <div className="coverage-table-wrap">
        <table className="coverage-table">
          <caption>Requirements and evidence status from reviewed source records</caption>
          <thead>
            <tr>
              <th scope="col">Requirement</th>
              <th scope="col">Status</th>
              <th scope="col">Evidence Analysis</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((requirement) => {
              const coverage = coverageFor(result, requirement.id);
              if (!coverage) return null;
              return (
                <tr key={requirement.id}>
                  <th scope="row">
                    <strong>{requirement.title}</strong>
                    <small>Recommended: {requirement.sourceType}</small>
                  </th>
                  <td>
                    <span className={`coverage-status coverage-status--${coverage.status}`}>
                      {statusLabel(coverage.status)}
                    </span>
                  </td>
                  <td>
                    <p className="coverage-reason">{coverage.reason}</p>
                    {coverage.claimIds.length > 0 && (
                      <div className="coverage-evidence-links">
                        {coverage.claimIds.map((claimId) => (
                          <a key={claimId} href={`#evidence-${claimId}`}>
                            Jump to excerpt
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// 4. EvidenceCard
function EvidenceCard({ result, ids, onOpenSource }: RegistryProps) {
  const claims = ids.length ? result.claims.filter((item) => ids.includes(item.id)) : result.claims;
  if (!claims.length) {
    return (
      <section className="result-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Evidence Excerpts</span>
            <h2>No Excerpts Found</h2>
          </div>
        </div>
        <p>No matching text passages were extracted for the current requirements.</p>
      </section>
    );
  }

  return (
    <section className="result-section" aria-labelledby="evidence-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Traceable Sourced Claims</span>
          <h2 id="evidence-heading">Evidence Excerpts</h2>
        </div>
        <span className="section-count">{claims.length} excerpts</span>
      </div>
      <div className="evidence-list">
        {claims.map((claim) => {
          const source = sourceFor(result, claim.sourceId);
          return (
            <article className="evidence-item" id={`evidence-${claim.id}`} key={claim.id}>
              <div className="evidence-meta">
                <span className={`evidence-method evidence-method--${claim.method}`}>
                  {claim.method === "illustrative" ? "Illustrative fixture excerpt" : "Exact text match"}
                </span>
                <span>{claim.directness === "direct" ? "Direct attribute match" : "Partial match"}</span>
                {claim.period && <span className="claim-period-tag">{claim.period}</span>}
              </div>
              <p className="evidence-statement">{claim.statement}</p>
              <blockquote>{claim.excerpt}</blockquote>
              <div className="evidence-source-row">
                <span>Source: {source?.title ?? "Source details unavailable"}</span>
                {source && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onOpenSource(source)}
                  >
                    Inspect source details <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// 5. SourceCard & 6. SourceList
function SourceList({ result, ids, onOpenSource }: RegistryProps) {
  const sources = ids.length
    ? result.sources.filter((item) => ids.includes(item.id))
    : result.sources;

  const reviewed = sources.filter((s) => s.status === "reviewed");
  const other = sources.filter((s) => s.status !== "reviewed");

  return (
    <section id="sources" className="result-section" aria-labelledby="sources-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Discovered & Reviewed Corpus</span>
          <h2 id="sources-heading">Sources Behind This Research</h2>
        </div>
        <span className="section-count">{sources.length} sources</span>
      </div>
      {!sources.length ? (
        <p>No source pages were available to inspect.</p>
      ) : (
        <div className="sources-container">
          <h3 className="sources-subheading">Successfully Reviewed Pages ({reviewed.length})</h3>
          <ul className="source-list">
            {reviewed.map((source) => (
              <li key={source.id} className="source-list-item">
                <div className="source-file-icon">
                  <FileText size={18} aria-hidden="true" />
                </div>
                <div className="source-list-copy">
                  <strong>{source.title}</strong>
                  <span>{source.domain}</span>
                  <small>
                    {source.origin === "illustrative"
                      ? "Synthetic demo fixture"
                      : source.origin === "automatic-search"
                        ? "Autonomous search discovery"
                        : "User-supplied URL"}{" "}
                    · {source.authoritySignal}
                  </small>
                </div>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => onOpenSource(source)}
                >
                  Details <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {other.length > 0 && (
            <>
              <h3 className="sources-subheading" style={{ marginTop: "1.5rem" }}>
                Discovered Candidate Pages ({other.length})
              </h3>
              <ul className="source-list">
                {other.map((source) => (
                  <li key={source.id} className="source-list-item is-unreviewed">
                    <div className="source-file-icon">
                      <FileSearch size={18} aria-hidden="true" />
                    </div>
                    <div className="source-list-copy">
                      <strong>{source.title}</strong>
                      <span>{source.domain}</span>
                      <small>
                        {source.status === "not_reviewed"
                          ? "Discovered in search ranking; deep extraction bypassed for runtime budget"
                          : `Extraction state: ${source.error || source.status}`}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="button button-quiet"
                      onClick={() => onOpenSource(source)}
                    >
                      Details <ArrowUpRight size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// 7. SourceAuthorityIndicator
function SourceAuthorityIndicator({ result }: RegistryProps) {
  const govEdu = result.sources.filter((s) => /\.(gov|edu|mil)(\.[a-z]{2,})?$/i.test(s.domain));
  const orgRef = result.sources.filter(
    (s) =>
      s.domain.endsWith(".wikipedia.org") ||
      s.domain.includes("openalex.org") ||
      s.domain.includes("doi.org") ||
      s.domain.includes(".org"),
  );

  return (
    <aside className="authority-indicator-panel" aria-labelledby="authority-panel-title">
      <div className="authority-icon">
        <ShieldCheck size={20} aria-hidden="true" />
      </div>
      <div>
        <h3 id="authority-panel-title">Primary & Authoritative Source Signals</h3>
        <p>
          Official primary sources (.gov, .edu, issuing bodies) govern policy, eligibility, and
          deadlines. Recent blog posts or secondary guides do not supersede current official notices.
        </p>
        <div className="authority-badges">
          <span>{govEdu.length} Public / Educational Domains</span>
          <span>{orgRef.length} Reference / Scholarly Sources</span>
          <span>{result.sources.length - govEdu.length - orgRef.length} General Web Sources</span>
        </div>
      </div>
    </aside>
  );
}

// 8. InformationGapCard
function InformationGapCard({ result, ids }: RegistryProps) {
  const missingRequirements = result.requirements.filter((r) => ids.includes(r.id));
  if (!missingRequirements.length) return null;

  return (
    <section className="result-section gap-section" aria-labelledby="gaps-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Epistemic Gap Detection</span>
          <h2 id="gaps-heading">Information Gaps (Unanswered in Reviewed Sources)</h2>
        </div>
        <CircleAlert size={20} className="gap-alert-icon" aria-hidden="true" />
      </div>
      <p className="section-intro">
        The following requirements were not found in the reviewed source pages. A missing item means
        <strong> not found in the reviewed corpus</strong>, not that the information does not exist.
      </p>
      <div className="gaps-grid">
        {missingRequirements.map((req) => (
          <article key={req.id} className="gap-card">
            <span className="gap-badge">Information Gap</span>
            <h3>{req.title}</h3>
            <p className="gap-reason">{req.reason}</p>
            <div className="gap-recommendation">
              <strong>Recommended Authority:</strong> {req.sourceType}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// 9. ConflictComparison
function ConflictComparison({ result, ids, onOpenSource }: RegistryProps) {
  const conflicts = ids
    .map((id) => result.conflicts.find((item) => item.id === id))
    .filter((item): item is PossibleConflict => item !== undefined);

  if (!conflicts.length) return null;

  return (
    <section className="result-section" aria-labelledby="conflict-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Conflict Lens</span>
          <h2 id="conflict-heading">Possible Contradictions Detected</h2>
        </div>
        <AlertTriangle className="conflict-icon" size={20} aria-hidden="true" />
      </div>
      <p className="section-intro">
        These excerpts describe comparable subjects and conditions, but state divergent terms.
        Confirm the governing rule against the current primary source before relying on either one.
      </p>
      {conflicts.map((conflict) => {
        const left = claimFor(result, conflict.leftClaimId);
        const right = claimFor(result, conflict.rightClaimId);
        const leftSource = left ? sourceFor(result, left.sourceId) : undefined;
        const rightSource = right ? sourceFor(result, right.sourceId) : undefined;
        if (!left || !right) return null;
        return (
          <div className="conflict-pair" key={conflict.id}>
            {[
              { claim: left, source: leftSource, side: "Source Record A" },
              { claim: right, source: rightSource, side: "Source Record B" },
            ].map(({ claim, source, side }) => (
              <article className="conflict-side" key={claim.id}>
                <span className="eyebrow">{side}</span>
                <blockquote>{claim.excerpt}</blockquote>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => source && onOpenSource(source)}
                >
                  {source?.title ?? "Source details"} <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </article>
            ))}
            <p className="conflict-explanation">{conflict.reason}</p>
          </div>
        );
      })}
    </section>
  );
}

// 10. FreshnessTimeline
function FreshnessTimeline({ result, ids, onOpenSource }: RegistryProps) {
  const sources = ids.length
    ? result.sources.filter((item) => ids.includes(item.id))
    : result.sources;

  if (!sources.length) return null;

  return (
    <section className="result-section" aria-labelledby="freshness-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Freshness Radar</span>
          <h2 id="freshness-heading">Dates, Validity & Superseded Context</h2>
        </div>
        <Clock size={19} aria-hidden="true" />
      </div>
      <p className="section-intro">
        Publication date, modification date, and active validity periods are distinct. An older
        publication alone does not prove invalidity, but expired cycles must be confirmed against
        the active notification.
      </p>
      <div className="freshness-list">
        {sources.map((source) => {
          const freshness = classifyFreshness(source);
          return (
            <article className="freshness-item" key={source.id}>
              <span
                className={`freshness-marker ${freshness.warning ? "is-warning" : ""}`}
                aria-hidden="true"
              />
              <div className="freshness-content">
                <div className="freshness-title-row">
                  <h3>{source.title}</h3>
                  <span
                    className={`freshness-label ${
                      freshness.warning ? "freshness-label--warning" : ""
                    }`}
                  >
                    {freshness.label}
                  </span>
                </div>
                <p>{freshness.detail}</p>
                <dl className="freshness-dates">
                  <div>
                    <dt>Published</dt>
                    <dd>{formatDate(source.dates.published)}</dd>
                  </div>
                  <div>
                    <dt>Modified</dt>
                    <dd>{formatDate(source.dates.modified)}</dd>
                  </div>
                  <div>
                    <dt>Retrieved</dt>
                    <dd>{formatDate(source.dates.retrieved)}</dd>
                  </div>
                  {(source.dates.validFrom || source.dates.validTo) && (
                    <div>
                      <dt>Validity Period</dt>
                      <dd>
                        {formatDate(source.dates.validFrom)} to {formatDate(source.dates.validTo)}
                      </dd>
                    </div>
                  )}
                </dl>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onOpenSource(source)}
                >
                  Source details <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// 11. VerificationChecklist
export function VerificationChecklist({
  tasks,
  checkedIds,
  onToggle,
}: {
  tasks: VerificationTask[];
  checkedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  if (!tasks.length) {
    return (
      <section className="result-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Verification Action Plan</span>
            <h2>All Requirements Addressed</h2>
          </div>
        </div>
        <p>No critical open gaps or conflicts were identified from reviewed excerpts.</p>
      </section>
    );
  }

  return (
    <section className="result-section" aria-labelledby="checklist-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Verification Priority Engine</span>
          <h2 id="checklist-heading">Prioritized Action Checklist</h2>
        </div>
        <span className="section-count">{tasks.length} items to check</span>
      </div>
      <p className="section-intro">
        Prioritized triage formula (Priority = Impact × Uncertainty × Time Sensitivity). Checking an
        item marks your user review progress; it does not change the factual evidence status.
      </p>
      <div className="checklist-list">
        {tasks.map((task) => {
          const checked = checkedIds.includes(task.id);
          return (
            <label
              key={task.id}
              className={`checklist-item ${checked ? "is-checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onToggle(task.id, event.target.checked)}
                aria-label={`Mark ${task.title} as checked`}
              />
              <span className="check-control" aria-hidden="true">
                {checked && <Check size={14} />}
              </span>
              <span className="checklist-content">
                <span className="task-topline">
                  <strong>{task.title}</strong>
                  <span className={`priority priority--${task.priority}`}>
                    {task.priority} priority
                  </span>
                </span>
                <span className="task-why">{task.why}</span>
                <span className="task-source">
                  <strong>Recommended Source:</strong> {task.nextSource}
                </span>
                <span className="task-priority-reason">{task.priorityReason}</span>
                {checked && (
                  <span className="user-check-note">
                    Marked checked by you. Sourced evidence remains unchanged.
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

// 12. KnowledgeMap
function KnowledgeMap({ result, ids }: RegistryProps) {
  const requirements = ids.length
    ? result.requirements.filter((item) => ids.includes(item.id))
    : result.requirements;

  return (
    <section className="result-section" aria-labelledby="knowledge-map-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Intent-Aware Evidence Graph</span>
          <h2 id="knowledge-map-heading">Evidence Graph Overview</h2>
        </div>
        <Layers size={19} aria-hidden="true" />
      </div>
      <p className="knowledge-map-intro">
        Maps the research question to explicit requirements and their supporting excerpts across the
        corpus.
      </p>
      <ol className="knowledge-map-list">
        {requirements.map((requirement) => {
          const coverage = coverageFor(result, requirement.id);
          return (
            <li
              key={requirement.id}
              className={`knowledge-node knowledge-node--${coverage?.status ?? "partial"}`}
            >
              <span className="node-requirement">{requirement.title}</span>
              <ArrowDownRight size={15} aria-hidden="true" />
              <span className="node-evidence">
                {coverage?.claimIds.length
                  ? `${coverage.claimIds.length} excerpt${coverage.claimIds.length === 1 ? "" : "s"}`
                  : "No excerpt found"}
              </span>
              <span className={`coverage-status coverage-status--${coverage?.status ?? "partial"}`}>
                {coverage ? statusLabel(coverage.status) : "Needs review"}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// 13. FollowUpResearchPanel
function FollowUpResearchPanel({ result, onFollowUp }: RegistryProps) {
  const actions = result.followUpActions || [];
  if (!actions.length) return null;

  return (
    <section className="result-section followup-panel" aria-labelledby="followup-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Next Deep Dives</span>
          <h2 id="followup-heading">Suggested Follow-Up Research</h2>
        </div>
        <Compass size={19} aria-hidden="true" />
      </div>
      <p className="section-intro">
        Launch targeted queries to resolve remaining conflicts, missing renewal conditions, or
        deadlines.
      </p>
      <div className="followup-grid">
        {actions.map((action) => (
          <div key={action.id} className="followup-card">
            <h4>{action.title}</h4>
            <p>{action.description}</p>
            <div className="followup-query">
              <code>{action.suggestedQuery}</code>
            </div>
            {onFollowUp && (
              <button
                type="button"
                className="button button-secondary followup-btn"
                onClick={() => onFollowUp(action)}
              >
                Research this topic <Sparkles size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// 14. IllustrationPanel
function IllustrationPanel() {
  return (
    <aside className="illustration-panel" aria-label="Evidence graph relationship illustration">
      <svg
        className="map-illustration"
        viewBox="0 0 320 114"
        role="img"
        aria-labelledby="evidence-map-title"
      >
        <title id="evidence-map-title">Question, requirements and selected source excerpts</title>
        <path d="M78 57h72m78 0h-42" stroke="#aab09e" strokeWidth="2" strokeDasharray="5 5" />
        <rect x="8" y="25" width="72" height="64" rx="12" fill="#eaf2d1" stroke="#9baa71" />
        <circle cx="33" cy="49" r="8" fill="#d1e65e" stroke="#59623c" />
        <path d="M48 45h20M48 55h14M24 68h42" stroke="#7b806c" strokeWidth="3" strokeLinecap="round" />
        <rect x="150" y="18" width="78" height="78" rx="17" fill="#20221f" />
        <circle cx="189" cy="49" r="13" fill="#ddf36a" />
        <path d="M182 49h14m-7-7v14" stroke="#20221f" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M172 74h34" stroke="#f4f3ed" strokeWidth="4" strokeLinecap="round" />
        <rect x="240" y="25" width="72" height="64" rx="12" fill="#fff" stroke="#d8ddd0" />
        <path d="M254 43h43m-43 10h35m-35 10h29" stroke="#a4aa9a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="298" cy="76" r="8" fill="#f4d45f" />
      </svg>
      <div>
        <strong>Evidence Stays Anchored to Sources</strong>
        <p>Every finding above retains its source URL, date signals, and excerpt context.</p>
      </div>
    </aside>
  );
}

// 15. ResearchLimitationsNotice
function ResearchLimitationsNotice({ result }: RegistryProps) {
  return (
    <section className="result-section limitations-section" aria-labelledby="limits-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Operating Bounds</span>
          <h2 id="limits-heading">Research Limitations & Guardrails</h2>
        </div>
      </div>
      <ul className="limitations-list">
        {result.limitations.map((limit, index) => (
          <li key={index}>{limit}</li>
        ))}
      </ul>
      <div className="limitations-footnote">
        <p>
          Digital Dark Spot uses deterministic extraction and heuristic classification. It does not
          execute untrusted scripts, bypass paywalls, or guarantee internet-wide exhaustive coverage.
        </p>
      </div>
    </section>
  );
}

// 16. ResearchProgress (Auditable Stage Indicator)
export function ResearchProgress({
  stage,
  discoveredCount = 0,
  reviewedCount = 0,
}: {
  stage: number;
  discoveredCount?: number;
  reviewedCount?: number;
}) {
  const stages = [
    "Understanding the question",
    "Building information requirements",
    "Discovering relevant sources",
    "Selecting sources for review",
    "Extracting source evidence",
    "Mapping claims to requirements",
    "Checking for gaps and possible conflicts",
    "Evaluating freshness",
    "Building the research workspace",
  ];

  return (
    <div className="research-progress-card" role="status" aria-live="polite">
      <div className="progress-topline">
        <span className="progress-title">Autonomous Research Pipeline</span>
        <span className="progress-step">
          Stage {Math.min(stage, 9)} of 9
        </span>
      </div>
      <div className="progress-meter-bar">
        <div
          className="progress-meter-fill"
          style={{ width: `${Math.min(100, (stage / 9) * 100)}%` }}
        />
      </div>
      <h3 className="progress-current-label">{stages[Math.min(stage - 1, 8)]}</h3>
      <div className="progress-counts">
        {discoveredCount > 0 && <span>Discovered: {discoveredCount} candidate pages</span>}
        {reviewedCount > 0 && <span>Reviewed: {reviewedCount} extracted sources</span>}
      </div>
      <ol className="progress-stages-list">
        {stages.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stage > stepNum;
          const isCurrent = stage === stepNum;
          return (
            <li
              key={label}
              className={`progress-step-item ${isDone ? "is-done" : isCurrent ? "is-current" : ""}`}
            >
              <span className="step-bullet">
                {isDone ? <Check size={12} /> : stepNum}
              </span>
              <span className="step-text">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChecklistPanel({ result, ids, checkedIds, onToggle }: RegistryProps) {
  const tasks = ids.length ? result.tasks.filter((item) => ids.includes(item.id)) : result.tasks;
  return <VerificationChecklist tasks={tasks} checkedIds={checkedIds} onToggle={onToggle} />;
}

const registry: Record<UIComponentType, (props: RegistryProps) => ReactNode> = {
  ResearchSummary,
  ResearchProgress: () => null, // rendered in progress view
  CoverageOverview,
  CoverageMatrix,
  EvidenceCard,
  SourceCard: (props) => <SourceList {...props} />,
  SourceList,
  SourceAuthorityIndicator,
  InformationGapCard,
  ConflictComparison,
  FreshnessTimeline,
  VerificationChecklist: ChecklistPanel,
  KnowledgeMap,
  FollowUpResearchPanel,
  IllustrationPanel,
  ResearchLimitationsNotice,
};

export function AdaptiveResultsRenderer({
  result,
  onFollowUp,
}: {
  result: ResearchResult;
  onFollowUp?: (action: FollowUpAction) => void;
}) {
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const validation = useMemo(() => validateUIPlan(buildUIPlan(result), result), [result]);
  const plan: UIPlan = validation.plan;
  const closeSource = useCallback(() => setActiveSource(null), []);

  function toggleTask(id: string, checked: boolean) {
    setCheckedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((value) => value !== id),
    );
  }

  return (
    <div className={`adaptive-results adaptive-results--${plan.layout}`}>
      {validation.usedFallback && (
        <p className="fallback-note" role="status">
          Adaptive layout plan could not be verified. Safe fallback workspace is active.
        </p>
      )}
      {plan.components.map((component, index) => {
        const Component = registry[component.type];
        if (!Component) return null;
        return (
          <div
            key={`${component.type}-${index}`}
            className={`adaptive-component adaptive-component--${component.type.toLowerCase()}`}
          >
            <Component
              result={result}
              ids={component.dataIds}
              onOpenSource={setActiveSource}
              checkedIds={checkedIds}
              onToggle={toggleTask}
              onFollowUp={onFollowUp}
            />
          </div>
        );
      })}
      <SourceDetailDrawer
        source={activeSource}
        claims={
          activeSource
            ? result.claims.filter((claim) => claim.sourceId === activeSource.id)
            : []
        }
        onClose={closeSource}
      />
    </div>
  );
}

export function ResultErrorBanner({ message }: { message: string }) {
  return (
    <div className="result-error-banner" role="status">
      <CircleAlert size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
