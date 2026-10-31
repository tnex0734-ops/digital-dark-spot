"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { inferIntent } from "@/lib/research/intent";
import { ResearchResultSchema } from "@/lib/research/schema";
import { QUESTION_STORAGE_KEY, RESULT_STORAGE_KEY } from "@/lib/research/storage-keys";

function subscribeQuestion(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readQuestion(): string {
  try { return sessionStorage.getItem(QUESTION_STORAGE_KEY) ?? ""; } catch { return ""; }
}

export function IntentForm() {
  const question = useSyncExternalStore<string | null>(subscribeQuestion, readQuestion, () => null);
  const [editedLabels, setEditedLabels] = useState<string[] | null>(null);
  const [urls, setUrls] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const suggestion = useMemo(() => inferIntent(question ?? "general research"), [question]);
  const labels = editedLabels ?? suggestion.requirements.map((item) => item.title);

  useEffect(() => {
    if (question !== null && !question) router.replace("/");
  }, [question, router]);

  function updateLabel(index: number, value: string) {
    setEditedLabels((current) => (current ?? labels).map((label, labelIndex) => labelIndex === index ? value : label));
  }

  function updateUrl(index: number, value: string) {
    setUrls((current) => current.map((url, urlIndex) => urlIndex === index ? value : url));
  }

  async function reviewSources(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const submittedUrls = urls.map((url) => url.trim()).filter(Boolean);
    const cleanLabels = labels.map((label) => label.trim()).filter(Boolean);
    if (!cleanLabels.length) { setError("Keep at least one requirement in the review."); return; }
    if (submittedUrls.length < 1 || submittedUrls.length > 3) { setError("Add between one and three public HTTPS page URLs."); return; }
    if (submittedUrls.some((url) => !/^https:\/\//i.test(url))) { setError("Only HTTPS page links can be reviewed."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question ?? "", requirements: cleanLabels.slice(0, 12), urls: submittedUrls }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "The pages could not be reviewed.";
        throw new Error(message);
      }
      const parsed = ResearchResultSchema.safeParse(data);
      if (!parsed.success) throw new Error("The review response could not be checked. Please try again.");
      sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(parsed.data));
      router.push("/results");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The pages could not be reviewed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="intent-layout">
      <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden="true" />Back to research</Link>
      <header className="page-heading">
        <div className="eyebrow"><span className="eyebrow-rule" />Step one · Review the scope</div>
        <h1>Make the question reviewable.</h1>
        <p>We turn your question into a short list of suggested requirements. Edit the list before choosing the pages to inspect.</p>
      </header>

      <section className="question-recap">
        <span className="eyebrow">Your research question</span>
        <p>{question === null ? "Loading your question…" : question}</p>
        <div className="recap-meta"><span className="category-tag">{suggestion.category === "scholarship" ? "Scholarship / application" : suggestion.category}</span><span className={`time-tag time-tag--${suggestion.timeSensitivity}`}>{suggestion.timeSensitivity} time sensitivity</span><span>{suggestion.timeReason}</span></div>
      </section>

      {suggestion.highStakes && <div className="high-stakes-note" role="note"><AlertTriangle size={18} aria-hidden="true" /><p>This question may relate to a high-impact decision. Use official primary sources and an appropriately qualified professional where needed. This app organises information; it does not give professional advice.</p></div>}

      <form className="intent-form" onSubmit={reviewSources}>
        <section className="intent-section" aria-labelledby="requirements-title">
          <div className="section-heading"><div><span className="eyebrow">Suggested by a deterministic template</span><h2 id="requirements-title">Requirements to check</h2></div><span className="suggested-note">You can edit these</span></div>
          <p className="section-intro">Suggestions are based on your wording. They are not official rules. Remove or rewrite anything that does not fit.</p>
          <div className="requirement-editor-list">
            {labels.map((label, index) => <div className="requirement-editor" key={`requirement-${index}`}>
              <label htmlFor={`requirement-${index}`}>Requirement {index + 1}</label>
              <input id={`requirement-${index}`} value={label} maxLength={160} onChange={(event) => updateLabel(index, event.target.value)} />
              <button type="button" className="icon-button remove-requirement" onClick={() => setEditedLabels((current) => (current ?? labels).filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${label || `requirement ${index + 1}`}`}><Trash2 size={17} aria-hidden="true" /></button>
            </div>)}
          </div>
          {labels.length < 12 && <button className="text-button add-requirement" type="button" onClick={() => setEditedLabels((current) => [...(current ?? labels), ""])}><Plus size={16} aria-hidden="true" />Add a requirement</button>}
        </section>

        <section className="intent-section source-entry-section" aria-labelledby="sources-entry-title">
          <div className="section-heading"><div><span className="eyebrow">Step two · Choose your sources</span><h2 id="sources-entry-title">Add up to three public pages</h2></div><span className="section-count">HTTPS only</span></div>
          <p className="section-intro">The app server will request these pages. Login-only, blocked, large or script-dependent pages may not work. We do not search other pages for you.</p>
          <div className="url-editor-list">
            {urls.map((url, index) => <div className="url-editor" key={`url-${index}`}>
              <label htmlFor={`source-url-${index}`}>Page URL {index + 1}</label>
              <input id={`source-url-${index}`} type="url" inputMode="url" autoComplete="url" placeholder="https://example.org/information" value={url} onChange={(event) => updateUrl(index, event.target.value)} />
              {urls.length > 1 && <button type="button" className="icon-button" onClick={() => setUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove page URL ${index + 1}`}><Trash2 size={17} aria-hidden="true" /></button>}
            </div>)}
          </div>
          {urls.length < 3 && <button className="text-button add-requirement" type="button" onClick={() => setUrls((current) => [...current, ""])}><Plus size={16} aria-hidden="true" />Add another page</button>}
          <p className="privacy-inline">No page content is saved on the server. The result stays in this browser tab until you clear it.</p>
        </section>

        {error && <p className="form-error form-error-box" role="alert">{error}</p>}
        <div className="intent-submit-row">
          <span className="field-help">{loading ? "Reviewing the pages you supplied…" : "The review can take a few seconds per page."}</span>
          <button className="button button-primary" type="submit" disabled={loading || !question}>{loading ? "Reviewing pages…" : "Review these pages"}<ArrowRight size={17} aria-hidden="true" /></button>
        </div>
        <p className="intent-demo-hint">Want to explore first? <Link href="/demo">Open the local scholarship demo.</Link></p>
      </form>
    </div>
  );
}
