"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronUp, Link2, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { QUESTION_STORAGE_KEY, RESULT_STORAGE_KEY } from "@/lib/research/storage-keys";

export const MANUAL_URLS_STORAGE_KEY = "dds_manual_urls";

const examples = [
  "What should I verify before applying for a scholarship?",
  "What are the latest developments in solid-state battery technology?",
  "Compare the latest publicly available specifications of two smartphones.",
  "What are the current official requirements for a particular public service?",
  "What questions remain unanswered in research about a chosen topic?",
];

export function LandingComposer() {
  const [question, setQuestion] = useState("");
  const [manualUrls, setManualUrls] = useState("");
  const [showManualSources, setShowManualSources] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function startResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Please ask a question, explore a topic, or describe a decision you're researching.");
      return;
    }
    if (trimmed.length < 8) {
      setError("Please add a little more detail (at least 8 characters) so requirements can be specific.");
      return;
    }
    if (trimmed.length > 2000) {
      setError("Your question is too long. Please limit it to 2,000 characters.");
      return;
    }

    try {
      // Clear previous cached result so new research runs
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      sessionStorage.setItem(QUESTION_STORAGE_KEY, trimmed);

      const parsedUrls = manualUrls
        .split("\n")
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      if (parsedUrls.length > 0) {
        sessionStorage.setItem(MANUAL_URLS_STORAGE_KEY, JSON.stringify(parsedUrls));
      } else {
        sessionStorage.removeItem(MANUAL_URLS_STORAGE_KEY);
      }

      router.push("/results");
    } catch {
      setError("This browser blocked temporary session storage. Enable it to continue, or open the local demo.");
    }
  }

  return (
    <div className="composer-wrap">
      <div className="composer-header">
        <h2>What do you want to know?</h2>
        <p className="composer-subtitle">
          Research a topic. We’ll find relevant sources, examine the evidence, and show what may still be missing.
        </p>
      </div>

      <form className="research-composer" onSubmit={startResearch}>
        <div className="composer-input-row">
          <Search className="composer-icon" size={20} aria-hidden="true" />
          <textarea
            id="research-question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setError("");
            }}
            placeholder="Ask a question, explore a topic, or describe a decision you’re researching…"
            maxLength={2000}
            rows={3}
            aria-label="Research question"
            aria-describedby={error ? "question-error" : undefined}
          />
          <button className="button button-primary composer-submit" type="submit">
            Start Research <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <p id="question-error" className="form-error" role="alert">
            {error}
          </p>
        )}

        {/* Collapsed optional manual sources section */}
        <div className="manual-sources-accordion">
          <button
            type="button"
            className="accordion-toggle"
            onClick={() => setShowManualSources(!showManualSources)}
            aria-expanded={showManualSources}
          >
            <Link2 size={16} aria-hidden="true" />
            <span>Add your own sources (optional)</span>
            {showManualSources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showManualSources && (
            <div className="accordion-content">
              <label htmlFor="manual-urls" className="field-label">
                Supplemental HTTPS Webpages (one per line):
              </label>
              <textarea
                id="manual-urls"
                value={manualUrls}
                onChange={(e) => setManualUrls(e.target.value)}
                placeholder="https://example.org/official-guide&#10;https://university.edu/scholarships"
                rows={2}
              />
              <p className="field-help">
                Supplied sources are additional inputs. The system will still attempt autonomous discovery to find relevant evidence across public repositories.
              </p>
            </div>
          )}
        </div>
      </form>

      <div className="example-prompts" aria-label="Example research prompts">
        <span>Try an example</span>
        <div className="prompt-buttons">
          {examples.map((example) => (
            <button
              type="button"
              key={example}
              onClick={() => {
                setQuestion(example);
                setError("");
              }}
            >
              <Sparkles size={13} aria-hidden="true" /> {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
