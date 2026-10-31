"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ArrowLeft, CircleAlert, Printer, Trash2 } from "lucide-react";
import { AccuracyNotice, AdaptiveResultsRenderer, DemoDatasetBadge, ResultErrorBanner } from "@/components/ResultUI";
import { ResearchResultSchema, type ResearchResult } from "@/lib/research/schema";
import { QUESTION_STORAGE_KEY, RESULT_STORAGE_KEY } from "@/lib/research/storage-keys";

function subscribeResult(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("dds-session-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("dds-session-change", onChange);
  };
}

function readResult(): string {
  try { return sessionStorage.getItem(RESULT_STORAGE_KEY) ?? ""; } catch { return ""; }
}

export function ResultsWorkspace() {
  const stored = useSyncExternalStore<string | null>(subscribeResult, readResult, () => null);
  const result: ResearchResult | null = useMemo(() => {
    if (!stored) return null;
    try {
      const parsed = ResearchResultSchema.safeParse(JSON.parse(stored));
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  }, [stored]);

  function clearResearch() {
    try {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      sessionStorage.removeItem(QUESTION_STORAGE_KEY);
    } catch { /* Storage can be disabled by the browser. */ }
    window.dispatchEvent(new Event("dds-session-change"));
  }

  if (stored === null) return <div className="loading-note" role="status">Opening this browser session’s review…</div>;
  if (!result) return (
    <section className="empty-results">
      <div className="empty-orbit" aria-hidden="true"><CircleAlert size={24} /></div>
      <span className="eyebrow">No saved review in this tab</span>
      <h1>Start with a question.</h1>
      <p>Research results are held in this browser session only. Start a new source review or explore the local scholarship example.</p>
      <div className="empty-actions"><Link className="button button-primary" href="/">New research</Link><Link className="button button-secondary" href="/demo">Open scholarship demo</Link></div>
    </section>
  );

  const failures = result.sources.filter((source) => source.status !== "reviewed");
  return (
    <div className="results-workspace">
      <Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" />Back to research</Link>
      <div className="results-page-heading"><div><span className="eyebrow"><span className="eyebrow-rule" />Research results</span><h1>Your evidence review</h1><p>Inspect the excerpts, coverage and next checks from the pages you selected.</p></div><div className="results-actions"><button type="button" className="button button-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print report</button><button type="button" className="button button-quiet" onClick={clearResearch}><Trash2 size={16} aria-hidden="true" />Clear research</button></div></div>
      {result.mode === "demo" && <DemoDatasetBadge />}
      {failures.length > 0 && <div className="source-failure-list" aria-label="Sources that were not reviewed">{failures.map((source) => <ResultErrorBanner key={source.id} message={`${source.title}: ${source.error ?? source.status}`} />)}</div>}
      <AccuracyNotice />
      <AdaptiveResultsRenderer result={result} />
      <p className="session-storage-note">This review is stored in this browser tab only. Clear it here or close the tab to remove it.</p>
    </div>
  );
}
