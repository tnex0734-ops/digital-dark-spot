import Link from "next/link";
import { ArrowLeft, Check, Info, ShieldCheck } from "lucide-react";
import { AccuracyNotice } from "@/components/ResultUI";

const sourceWeights = [
  ["Relevance", "35%"],
  ["Authority", "25%"],
  ["Freshness", "20%"],
  ["Directness", "10%"],
  ["Corroboration", "10%"],
];

export default function MethodologyPage() {
  return (
    <div className="methodology-page">
      <Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" />Back to research</Link>
      <header className="page-heading methodology-heading">
        <div className="eyebrow"><span className="eyebrow-rule" />A transparent, bounded review</div>
        <h1>How the review works.</h1>
        <p>Digital Dark Spot helps organise a small set of sources around a question. It shows what those pages do and do not support, then leaves the judgement with you.</p>
      </header>

      <div className="methodology-grid">
        <section className="method-card method-card-featured"><div className="method-icon method-icon-lime"><Check size={20} aria-hidden="true" /></div><span className="eyebrow">01 · Intent</span><h2>Turn a goal into requirements</h2><p>Transparent keyword templates suggest the information a question may need. You can edit the list before the source review. This is a rule-based suggestion, not a live AI interpretation.</p><Link href="/demo" className="text-link">See a scholarship example <span aria-hidden="true">↗</span></Link></section>
        <section className="method-card"><div className="method-icon method-icon-blue"><Info size={20} aria-hidden="true" /></div><span className="eyebrow">02 · Evidence</span><h2>Keep text beside findings</h2><p>Every displayed excerpt is attached to the page it came from. URL Research uses simple keyword matching to find passages; it does not establish that a passage is true or interpret nuanced claims.</p></section>
        <section className="method-card"><div className="method-icon method-icon-lavender"><ShieldCheck size={20} aria-hidden="true" /></div><span className="eyebrow">03 · Coverage</span><h2>Scope the gaps carefully</h2><p>“Not found in the sources reviewed” means the selected pages did not provide a matching excerpt. It does not mean the information does not exist elsewhere.</p></section>
        <section className="method-card method-card-wide"><div className="method-wide-copy"><span className="eyebrow">04 · Source signals</span><h2>Authority is one signal among several</h2><p>A source rank can weigh relevance, authority, freshness, directness and corroboration. These are provisional starting weights, not calibrated truth scores. This release does not display a numeric source score.</p></div><div className="weight-list" aria-label="Provisional source ranking weights">{sourceWeights.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div></section>
        <section className="method-card"><div className="method-icon method-icon-yellow"><Info size={20} aria-hidden="true" /></div><span className="eyebrow">05 · Dates and conflicts</span><h2>Compare like with like</h2><p>Publication, modification, retrieval and validity dates remain separate. A possible conflict is shown only when the subject, attribute, unit, place, condition and period match but the values differ. A past date alone is not proof that guidance is outdated.</p></section>
        <section className="method-card"><div className="method-icon method-icon-dark"><ShieldCheck size={20} aria-hidden="true" /></div><span className="eyebrow">06 · Verification</span><h2>Priorities are a triage aid</h2><p>Suggested checks combine impact, evidence uncertainty and time sensitivity into high, medium or low labels. They are plain-language prompts, not probabilities or professional advice. Marking a task checked does not change the evidence status.</p></section>
      </div>

      <section className="limits-panel" aria-labelledby="limits-heading"><span className="eyebrow">What this app does not do</span><h2 id="limits-heading">A focused source review, not a web search</h2><ul><li>It reviews no more than three HTTPS pages that you provide.</li><li>It does not crawl links, run page scripts, access logins, or review arbitrary documents.</li><li>Pages must be public, static HTML, under 1 MB, and respond within a short timeout.</li><li>Page text is untrusted data. It is extracted as text and is never executed as code or instructions.</li><li>Demo findings use bundled fictional scholarship records and make no live scholarship claims.</li><li>Questions and result excerpts remain in browser session storage. The app does not use accounts, third-party AI, external search or analytics.</li></ul></section>
      <AccuracyNotice />
    </div>
  );
}
