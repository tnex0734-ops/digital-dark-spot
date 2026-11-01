"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Link2, Plus, Trash2 } from "lucide-react";
import { inferIntent } from "@/lib/research/intent";
import { QUESTION_STORAGE_KEY, RESULT_STORAGE_KEY } from "@/lib/research/storage-keys";
import { MANUAL_URLS_STORAGE_KEY } from "./LandingComposer";

function subscribeQuestion(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readQuestion(): string {
  try {
    return sessionStorage.getItem(QUESTION_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function IntentForm() {
  const question = useSyncExternalStore<string | null>(subscribeQuestion, readQuestion, () => null);
  const [editedLabels, setEditedLabels] = useState<string[] | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [showUrls, setShowUrls] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const suggestion = useMemo(
    () => inferIntent(question || "What should I verify before applying for a scholarship?"),
    [question],
  );
  const labels = editedLabels ?? suggestion.requirements.map((item) => item.title);

  useEffect(() => {
    if (question !== null && !question) router.replace("/");
  }, [question, router]);

  function updateLabel(index: number, value: string) {
    setEditedLabels((current) =>
      (current ?? labels).map((label, labelIndex) => (labelIndex === index ? value : label)),
    );
  }

  function addRequirement() {
    setEditedLabels((current) => [...(current ?? labels), "New requirement to verify"]);
  }

  function startResearchWithScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanLabels = labels.map((label) => label.trim()).filter(Boolean);
    if (!cleanLabels.length) {
      setError("Keep at least one information requirement in the review scope.");
      return;
    }

    try {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      const cleanUrls = urls.map((u) => u.trim()).filter((u) => u.startsWith("https://"));
      if (cleanUrls.length > 0) {
        sessionStorage.setItem(MANUAL_URLS_STORAGE_KEY, JSON.stringify(cleanUrls));
      } else {
        sessionStorage.removeItem(MANUAL_URLS_STORAGE_KEY);
      }
      router.push("/results");
    } catch {
      setError("Session storage could not be written. Please check browser permissions.");
    }
  }

  return (
    <div className="intent-layout">
      <Link className="back-link" href="/">
        <ArrowLeft size={16} aria-hidden="true" /> Back to Research
      </Link>
      <header className="page-heading">
        <div className="eyebrow">
          <span className="eyebrow-rule" /> Scope Configuration · Optional
        </div>
        <h1>Review Information Requirements</h1>
        <p>
          We derived explicit information requirements from your question. You can adjust them or start research immediately.
        </p>
      </header>

      <section className="question-recap">
        <span className="eyebrow">Your Research Question</span>
        <p>{question === null ? "Loading your question…" : question}</p>
        <div className="recap-meta">
          <span className="category-tag">
            {suggestion.category === "scholarship"
              ? "Scholarship / application"
              : suggestion.category}
          </span>
          <span className={`time-tag time-tag--${suggestion.timeSensitivity}`}>
            {suggestion.timeSensitivity} time sensitivity
          </span>
          <span>{suggestion.timeReason}</span>
        </div>
      </section>

      {suggestion.highStakes && (
        <div className="high-stakes-note" role="note">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            This question may relate to a high-impact decision. Use official primary sources and consult an appropriately qualified professional where needed. This app organizes evidence; it does not give professional advice.
          </p>
        </div>
      )}

      <form className="intent-form" onSubmit={startResearchWithScope}>
        <section className="intent-section" aria-labelledby="requirements-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Intent Blueprint</span>
              <h2 id="requirements-title">Requirements to verify</h2>
            </div>
            <span className="suggested-note">Editable checklist</span>
          </div>
          <p className="section-intro">
            Requirements guide targeted search query generation and claim mapping. Edit or add requirements to tailor discovery.
          </p>
          <div className="requirement-editor-list">
            {labels.map((label, index) => (
              <div className="requirement-editor" key={`requirement-${index}`}>
                <label htmlFor={`requirement-${index}`}>Requirement {index + 1}</label>
                <input
                  id={`requirement-${index}`}
                  value={label}
                  maxLength={160}
                  onChange={(event) => updateLabel(index, event.target.value)}
                />
                <button
                  type="button"
                  className="icon-button remove-requirement"
                  onClick={() =>
                    setEditedLabels((current) =>
                      (current ?? labels).filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  aria-label={`Remove ${label || `requirement ${index + 1}`}`}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="button button-quiet add-requirement"
            onClick={addRequirement}
          >
            <Plus size={16} aria-hidden="true" /> Add another requirement
          </button>
        </section>

        {/* Optional Manual Sources */}
        <section className="intent-section">
          <button
            type="button"
            className="accordion-toggle"
            onClick={() => setShowUrls(!showUrls)}
            aria-expanded={showUrls}
          >
            <Link2 size={16} aria-hidden="true" />
            <span>Add supplemental URLs (optional)</span>
            {showUrls ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showUrls && (
            <div className="accordion-content">
              <p className="section-intro">
                You can supply specific HTTPS webpages to supplement autonomous discovery.
              </p>
              <div className="url-input-list">
                {[0, 1, 2].map((idx) => (
                  <input
                    key={idx}
                    type="url"
                    value={urls[idx] || ""}
                    onChange={(e) => {
                      const updated = [...urls];
                      updated[idx] = e.target.value;
                      setUrls(updated);
                    }}
                    placeholder={`https://example.org/page-${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="intent-actions">
          <button className="button button-primary" type="submit">
            Start Autonomous Research <ArrowRight size={17} aria-hidden="true" />
          </button>
          <Link className="button button-quiet" href="/">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
