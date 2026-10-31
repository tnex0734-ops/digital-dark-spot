"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Check, CircleAlert, ExternalLink, FileText, Info, X } from "lucide-react";
import { classifyFreshness } from "@/lib/research/analysis";
import { buildUIPlan, validateUIPlan, type UIComponentType, type UIPlan } from "@/lib/research/ui-plan";
import type { CoverageStatus, EvidenceClaim, ResearchResult, Source, VerificationTask } from "@/lib/research/schema";

export function DemoDatasetBadge() {
  return <div className="demo-dataset-badge"><span className="badge-spark" aria-hidden="true">✳</span><strong>Illustrative demo dataset</strong><span>Not live scholarship advice</span></div>;
}

export function AccuracyNotice() {
  return (
    <aside className="accuracy-notice" aria-labelledby="accuracy-notice-title">
      <div className="notice-icon"><Info size={18} aria-hidden="true" /></div>
      <div>
        <h2 id="accuracy-notice-title">Important accuracy notice</h2>
        <p>AI-generated and automated information may be incomplete or inaccurate. Before making an important or sensitive decision that could cause significant loss or harm, check the information twice using authoritative sources and consult an appropriately qualified professional where appropriate. Machines can make mistakes.</p>
      </div>
    </aside>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "No date found";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
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

export function SourceDetailDrawer({ source, claims = [], onClose }: { source: Source | null; claims?: EvidenceClaim[]; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!source) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("button, a[href]")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled]),a[href]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panelRef} className="source-drawer" role="dialog" aria-modal="true" aria-labelledby="source-drawer-title" tabIndex={-1}>
        <div className="drawer-heading">
          <div className="drawer-icon"><FileText size={20} aria-hidden="true" /></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close source details"><X size={19} aria-hidden="true" /></button>
        </div>
        <span className="eyebrow">Source detail</span>
        <h2 id="source-drawer-title">{source.title}</h2>
        <p className="source-domain">{source.domain}</p>
        <span className={`source-state source-state--${source.status}`}>{source.status === "reviewed" ? "Page text reviewed" : source.status}</span>
        {source.error && <p className="source-error">{source.error}</p>}
        <dl className="date-list">
          <div><dt>Published</dt><dd>{formatDate(source.dates.published)}</dd></div>
          <div><dt>Modified</dt><dd>{formatDate(source.dates.modified)}</dd></div>
          <div><dt>Retrieved</dt><dd>{formatDate(source.dates.retrieved)}</dd></div>
          <div><dt>Valid from</dt><dd>{formatDate(source.dates.validFrom)}</dd></div>
          <div><dt>Valid through</dt><dd>{formatDate(source.dates.validTo)}</dd></div>
        </dl>
        <section className="source-headings" aria-labelledby="source-headings-title">
          <h3 id="source-headings-title">Page headings</h3>
          {source.headings.length ? <ul>{source.headings.map((heading, index) => <li key={`${heading}-${index}`}>{heading}</li>)}</ul> : <p>No page headings found.</p>}
        </section>
        <div className="source-trust-note"><strong>Source signal</strong><p>{source.authoritySignal}</p></div>
        <p className="drawer-note">{source.retrievalNote}</p>
        <section className="drawer-excerpts" aria-labelledby="drawer-excerpts-heading">
          <h3 id="drawer-excerpts-heading">Excerpts used in this review</h3>
          {claims.length ? claims.map((claim) => <blockquote key={claim.id}>{claim.excerpt}</blockquote>) : <p>No matching excerpt was used from this page.</p>}
        </section>
        {externalUrl && <a className="button button-secondary drawer-open-link" href={externalUrl} target="_blank" rel="noopener noreferrer">Open supplied page <ExternalLink size={16} aria-hidden="true" /></a>}
        <button className="button button-dark drawer-close" type="button" onClick={onClose}>Close details</button>
      </section>
    </div>
  );
}

export function VerificationChecklist({ tasks, checkedIds, onToggle }: {
  tasks: VerificationTask[];
  checkedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
}) {
  if (!tasks.length) return <section className="result-section"><div className="section-heading"><div><span className="eyebrow">Next steps</span><h2>Nothing to verify from this review</h2></div></div><p>No open tasks were generated from the reviewed excerpts.</p></section>;
  return (
    <section className="result-section" aria-labelledby="checklist-heading">
      <div className="section-heading"><div><span className="eyebrow">Your next checks</span><h2 id="checklist-heading">A short list to take forward</h2></div><span className="section-count">{tasks.length} tasks</span></div>
      <div className="checklist-list">
        {tasks.map((task) => {
          const checked = checkedIds.includes(task.id);
          return (
            <label key={task.id} className={`checklist-item ${checked ? "is-checked" : ""}`}>
              <input type="checkbox" checked={checked} onChange={(event) => onToggle(task.id, event.target.checked)} aria-label={`Mark ${task.title} as checked`} />
              <span className="check-control" aria-hidden="true">{checked && <Check size={14} />}</span>
              <span className="checklist-content">
                <span className="task-topline"><strong>{task.title}</strong><span className={`priority priority--${task.priority}`}>{task.priority} priority</span></span>
                <span className="task-why">{task.why}</span>
                <span className="task-source">Next source to check: {task.nextSource}</span>
                <span className="task-priority-reason">{task.priorityReason}</span>
                {checked && <span className="user-check-note">You marked this task as checked. The evidence status has not changed.</span>}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

interface RegistryProps {
  result: ResearchResult;
  ids: string[];
  onOpenSource: (source: Source) => void;
  checkedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
}

function ResearchSummary({ result }: RegistryProps) {
  const coverage = result.evidenceCoverage;
  return (
    <section className="result-summary" aria-labelledby="result-question">
      <div className="summary-topline"><span className="eyebrow">{result.mode === "demo" ? "Scholarship workspace" : "Your source review"}</span><span className={`review-status review-status--${result.status}`}>{result.status === "complete" ? "Review complete" : result.status === "partial" ? "Partial review" : "Sources could not be reviewed"}</span></div>
      <h2 id="result-question">{result.query}</h2>
      <div className="summary-facts">
        <div><span>Evidence coverage</span><strong>{coverage.percentage}%</strong><small>{coverage.withEvidence} of {coverage.denominator} requirements have at least one excerpt</small></div>
        <div><span>Pages reviewed</span><strong>{result.reviewedSourceCount} <small>of {result.sources.length}</small></strong><small>Only the pages you supplied</small></div>
        <div><span>Open checks</span><strong>{result.tasks.length}</strong><small>Prioritised items for you to review</small></div>
      </div>
      <p className="coverage-caveat">{coverage.caveat}</p>
      {result.intent.highStakes && <div className="high-stakes-note" role="note"><CircleAlert size={18} aria-hidden="true" /><p>This topic may affect an important decision. Use official primary sources and a qualified professional where appropriate. This review organises information; it does not provide professional advice.</p></div>}
      {result.limitations.length > 0 && <details className="limitations-details"><summary>Review limits</summary><ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>}
    </section>
  );
}

function CoverageMatrix({ result, ids }: RegistryProps) {
  const requirements = ids.length ? result.requirements.filter((item) => ids.includes(item.id)) : result.requirements;
  return (
    <section className="result-section" aria-labelledby="coverage-heading">
      <div className="section-heading"><div><span className="eyebrow">Requirement map</span><h2 id="coverage-heading">What the reviewed pages cover</h2></div><span className="suggested-note">Suggested requirements</span></div>
      <div className="coverage-table-wrap">
        <table className="coverage-table">
          <caption>Suggested requirements and evidence status in the submitted pages</caption>
          <thead><tr><th scope="col">Requirement</th><th scope="col">Status</th><th scope="col">What this means</th></tr></thead>
          <tbody>{requirements.map((requirement) => {
            const coverage = coverageFor(result, requirement.id);
            if (!coverage) return null;
            return <tr key={requirement.id}><th scope="row"><strong>{requirement.title}</strong><small>{requirement.sourceType}</small></th><td><span className={`coverage-status coverage-status--${coverage.status}`}>{statusLabel(coverage.status)}</span></td><td>{coverage.reason}{coverage.claimIds.length > 0 && <div className="coverage-evidence-links">{coverage.claimIds.map((claimId) => <a key={claimId} href={`#evidence-${claimId}`}>View excerpt</a>)}</div>}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  );
}

function IllustrationPanel() {
  return (
    <aside className="illustration-panel" aria-label="How evidence connects to a question">
      <svg className="map-illustration" viewBox="0 0 320 114" role="img" aria-labelledby="evidence-map-title">
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
      <div><strong>Evidence stays attached to its source</strong><p>Every excerpt below keeps the page and its context in view.</p></div>
    </aside>
  );
}

function KnowledgeMap({ result, ids }: RegistryProps) {
  const requirements = ids.length ? result.requirements.filter((item) => ids.includes(item.id)) : result.requirements;
  return (
    <section className="result-section" aria-labelledby="knowledge-map-heading">
      <div className="section-heading"><div><span className="eyebrow">Intent-aware evidence graph</span><h2 id="knowledge-map-heading">Question to evidence, at a glance</h2></div></div>
      <p className="knowledge-map-intro">The map shows how the suggested requirements connect to the submitted pages. It does not add claims.</p>
      <ol className="knowledge-map-list">{requirements.map((requirement) => {
        const coverage = coverageFor(result, requirement.id);
        return <li key={requirement.id} className={`knowledge-node knowledge-node--${coverage?.status ?? "partial"}`}><span className="node-requirement">{requirement.title}</span><ArrowDownRight size={15} aria-hidden="true" /><span className="node-evidence">{coverage?.claimIds.length ? `${coverage.claimIds.length} excerpt${coverage.claimIds.length === 1 ? "" : "s"}` : "No matching excerpt"}</span><span className={`coverage-status coverage-status--${coverage?.status ?? "partial"}`}>{coverage ? statusLabel(coverage.status) : "Needs review"}</span></li>;
      })}</ol>
    </section>
  );
}

function EvidenceCard({ result, ids, onOpenSource }: RegistryProps) {
  const claims = ids.length ? result.claims.filter((item) => ids.includes(item.id)) : result.claims;
  if (!claims.length) return <section className="result-section"><div className="section-heading"><div><span className="eyebrow">Evidence excerpts</span><h2>Nothing matched these requirements</h2></div></div><p>Try another source page or adjust the suggested requirements.</p></section>;
  return (
    <section className="result-section" aria-labelledby="evidence-heading">
      <div className="section-heading"><div><span className="eyebrow">Text found in the pages</span><h2 id="evidence-heading">Evidence excerpts</h2></div><span className="section-count">{claims.length} excerpts</span></div>
      <div className="evidence-list">{claims.map((claim) => {
        const source = sourceFor(result, claim.sourceId);
        return <article className="evidence-item" id={`evidence-${claim.id}`} key={claim.id}>
          <div className="evidence-meta"><span className={`evidence-method evidence-method--${claim.method}`}>{claim.method === "illustrative" ? "Illustrative excerpt" : "Keyword text match"}</span><span>{claim.directness === "direct" ? "Direct match" : "Partial match"}</span></div>
          <p className="evidence-statement">{claim.statement}</p>
          <blockquote>{claim.excerpt}</blockquote>
          <div className="evidence-source-row"><span>Source: {source?.title ?? "Source unavailable"}</span>{source && <button type="button" className="text-button" onClick={() => onOpenSource(source)}>Source details <ArrowUpRight size={14} aria-hidden="true" /></button>}</div>
        </article>;
      })}</div>
    </section>
  );
}

function ConflictComparison({ result, ids, onOpenSource }: RegistryProps) {
  const conflicts = ids.map((id) => result.conflicts.find((item) => item.id === id)).filter((item) => item !== undefined);
  if (!conflicts.length) return null;
  return (
    <section className="result-section" aria-labelledby="conflict-heading">
      <div className="section-heading"><div><span className="eyebrow">Needs a closer look</span><h2 id="conflict-heading">Possible conflict</h2></div><CircleAlert className="conflict-icon" size={20} aria-hidden="true" /></div>
      <p className="section-intro">These excerpts appear to describe comparable conditions. Confirm the current rule before relying on either one.</p>
      {conflicts.map((conflict) => {
        const left = claimFor(result, conflict.leftClaimId);
        const right = claimFor(result, conflict.rightClaimId);
        const leftSource = left ? sourceFor(result, left.sourceId) : undefined;
        const rightSource = right ? sourceFor(result, right.sourceId) : undefined;
        if (!left || !right) return null;
        return <div className="conflict-pair" key={conflict.id}>
          {[{ claim: left, source: leftSource, side: "Source A" }, { claim: right, source: rightSource, side: "Source B" }].map(({ claim, source, side }) => <article className="conflict-side" key={claim.id}><span className="eyebrow">{side}</span><blockquote>{claim.excerpt}</blockquote><button type="button" className="text-button" onClick={() => source && onOpenSource(source)}>{source?.title ?? "Source details"} <ArrowUpRight size={14} aria-hidden="true" /></button></article>)}
          <p className="conflict-explanation">{conflict.reason}</p>
        </div>;
      })}
    </section>
  );
}

function FreshnessTimeline({ result, ids, onOpenSource }: RegistryProps) {
  const sources = ids.length ? result.sources.filter((item) => ids.includes(item.id)) : result.sources;
  if (!sources.length) return null;
  return (
    <section className="result-section" aria-labelledby="freshness-heading">
      <div className="section-heading"><div><span className="eyebrow">Dates in context</span><h2 id="freshness-heading">Source timeline</h2></div></div>
      <div className="freshness-list">{sources.map((source) => {
        const freshness = classifyFreshness(source);
        return <article className="freshness-item" key={source.id}>
          <span className={`freshness-marker ${freshness.warning ? "is-warning" : ""}`} aria-hidden="true" />
          <div className="freshness-content"><div className="freshness-title-row"><h3>{source.title}</h3><span className={`freshness-label ${freshness.warning ? "freshness-label--warning" : ""}`}>{freshness.label}</span></div>
            <p>{freshness.detail}</p>
            <dl className="freshness-dates"><div><dt>Published</dt><dd>{formatDate(source.dates.published)}</dd></div><div><dt>Modified</dt><dd>{formatDate(source.dates.modified)}</dd></div><div><dt>Retrieved</dt><dd>{formatDate(source.dates.retrieved)}</dd></div>{(source.dates.validFrom || source.dates.validTo) && <div><dt>Validity</dt><dd>{formatDate(source.dates.validFrom)} to {formatDate(source.dates.validTo)}</dd></div>}</dl>
            <button type="button" className="text-button" onClick={() => onOpenSource(source)}>Source details <ArrowUpRight size={14} aria-hidden="true" /></button>
          </div>
        </article>;
      })}</div>
    </section>
  );
}

function SourceList({ result, ids, onOpenSource }: RegistryProps) {
  const sources = ids.length ? result.sources.filter((item) => ids.includes(item.id)) : result.sources;
  return (
    <section id="sources" className="result-section" aria-labelledby="sources-heading">
      <div className="section-heading"><div><span className="eyebrow">Reviewed source set</span><h2 id="sources-heading">Pages behind this review</h2></div><span className="section-count">{sources.length} sources</span></div>
      {!sources.length ? <p>No source page was available to inspect.</p> : <ul className="source-list">{sources.map((source) => <li key={source.id} className="source-list-item"><div className="source-file-icon"><FileText size={18} aria-hidden="true" /></div><div className="source-list-copy"><strong>{source.title}</strong><span>{source.domain}</span><small>{source.origin === "illustrative" ? "Synthetic example" : "Provided URL"} · {source.status === "reviewed" ? "text reviewed" : source.status}</small>{source.error && <span className="source-list-error">{source.error}</span>}</div><button type="button" className="button button-quiet" onClick={() => onOpenSource(source)}>Details <ArrowUpRight size={14} aria-hidden="true" /></button></li>)}</ul>}
    </section>
  );
}

export { SourceList };

function ChecklistPanel({ result, ids, checkedIds, onToggle }: RegistryProps) {
  const tasks = ids.length ? result.tasks.filter((item) => ids.includes(item.id)) : result.tasks;
  return <VerificationChecklist tasks={tasks} checkedIds={checkedIds} onToggle={onToggle} />;
}

const registry: Record<UIComponentType, (props: RegistryProps) => ReactNode> = {
  ResearchSummary,
  CoverageMatrix,
  EvidenceCard,
  ConflictComparison,
  FreshnessTimeline,
  SourceList,
  KnowledgeMap,
  VerificationChecklist: ChecklistPanel,
  IllustrationPanel,
};

export function AdaptiveResultsRenderer({ result }: { result: ResearchResult }) {
  const [activeSource, setActiveSource] = useState<Source | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const validation = useMemo(() => validateUIPlan(buildUIPlan(result), result), [result]);
  const plan: UIPlan = validation.plan;
  const closeSource = useCallback(() => setActiveSource(null), []);
  function toggleTask(id: string, checked: boolean) {
    setCheckedIds((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id));
  }
  return (
    <div className={`adaptive-results adaptive-results--${plan.layout}`}>
      {validation.usedFallback && <p className="fallback-note" role="status">The adaptive layout was unavailable. A standard safe results layout is shown.</p>}
      {plan.components.map((component, index) => {
        const Component = registry[component.type];
        return <div key={`${component.type}-${index}`} className={`adaptive-component adaptive-component--${component.type.toLowerCase()}`}>
          <Component result={result} ids={component.dataIds} onOpenSource={setActiveSource} checkedIds={checkedIds} onToggle={toggleTask} />
        </div>;
      })}
      <SourceDetailDrawer source={activeSource} claims={activeSource ? result.claims.filter((claim) => claim.sourceId === activeSource.id) : []} onClose={closeSource} />
    </div>
  );
}

export function DatasetNote() {
  return <p className="dataset-note"><span className="dataset-note-dot" aria-hidden="true" />All names, excerpts and dates in the scholarship example are fictional, for interface demonstration only.</p>;
}

export function ResultErrorBanner({ message }: { message: string }) {
  return <div className="result-error-banner" role="status"><CircleAlert size={18} aria-hidden="true" /><span>{message}</span></div>;
}
