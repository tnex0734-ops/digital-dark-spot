"use client";

import { useState } from "react";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import Link from "next/link";
import { scholarshipDemo } from "@/lib/research/demo-data";
import { AdaptiveResultsRenderer, AccuracyNotice, DemoDatasetBadge, DatasetNote } from "@/components/ResultUI";

export function DemoWorkspace() {
  const [runId, setRunId] = useState(0);
  return (
    <div className="demo-workspace">
      <Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" />Back to research</Link>
      <div className="demo-header-row"><div><span className="eyebrow"><span className="eyebrow-rule" />Bundled example · no network requests</span><h1>Scholarship review</h1><p>See how a question becomes a set of requirements, evidence and follow-up checks.</p></div><div className="demo-header-actions"><button type="button" className="button button-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print</button><button type="button" className="button button-dark" onClick={() => setRunId((id) => id + 1)}><RotateCcw size={16} aria-hidden="true" />Restart demo</button></div></div>
      <DemoDatasetBadge />
      <DatasetNote />
      <AccuracyNotice />
      <AdaptiveResultsRenderer key={runId} result={scholarshipDemo} />
      <p className="demo-restart-foot"><button className="text-button" type="button" onClick={() => setRunId((id) => id + 1)}><RotateCcw size={15} aria-hidden="true" />Reset checklist and source details</button></p>
    </div>
  );
}
