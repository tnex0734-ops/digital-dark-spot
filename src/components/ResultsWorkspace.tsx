"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  Calendar,
  CircleAlert,
  Clock,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import {
  AccuracyNotice,
  AdaptiveResultsRenderer,
  DemoDatasetBadge,
  ResearchProgress,
  ResultErrorBanner,
} from "@/components/ResultUI";
import { ResearchResultSchema, type FollowUpAction, type ResearchResult } from "@/lib/research/schema";
import { QUESTION_STORAGE_KEY, RESULT_STORAGE_KEY } from "@/lib/research/storage-keys";
import { MANUAL_URLS_STORAGE_KEY } from "./LandingComposer";

function subscribeSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("dds-session-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("dds-session-change", onChange);
  };
}

function readSessionItem(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function ResultsWorkspace() {
  const storedResultJson = useSyncExternalStore<string | null>(
    subscribeSession,
    () => readSessionItem(RESULT_STORAGE_KEY),
    () => null,
  );
  const storedQuestion = useSyncExternalStore<string | null>(
    subscribeSession,
    () => readSessionItem(QUESTION_STORAGE_KEY),
    () => null,
  );

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrls, setFallbackUrls] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);

  const cachedResult: ResearchResult | null = useMemo(() => {
    if (!storedResultJson) return null;
    try {
      const parsed = ResearchResultSchema.safeParse(JSON.parse(storedResultJson));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [storedResultJson]);

  const executeResearch = useCallback(
    async (
      queryText: string,
      customManualUrls?: string[],
      previousContext?: { query: string; topic?: string },
    ) => {
      setLoading(true);
      setError(null);
      setStage(1);

      // Simulate authentic pipeline stages advance while network request is in flight
      const stageTimer1 = setTimeout(() => setStage(2), 350);
      const stageTimer2 = setTimeout(() => setStage(3), 800);
      const stageTimer3 = setTimeout(() => setStage(4), 1600);
      const stageTimer4 = setTimeout(() => setStage(5), 2400);

      try {
        let manualUrls: string[] = customManualUrls || [];
        if (!manualUrls.length) {
          try {
            const rawManual = sessionStorage.getItem(MANUAL_URLS_STORAGE_KEY);
            if (rawManual) manualUrls = JSON.parse(rawManual);
          } catch {
            // ignore
          }
        }

        const response = await fetch("/api/research/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: queryText,
            manualUrls: manualUrls.length ? manualUrls : undefined,
            previousContext,
          }),
        });

        setStage(6);
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : "Autonomous discovery was unable to complete. Please try again or provide optional URLs.";
          throw new Error(message);
        }

        setStage(7);
        const parsed = ResearchResultSchema.safeParse(data);
        if (!parsed.success) {
          throw new Error("Research results failed schema validation. Please try again.");
        }

        setStage(8);
        setTimeout(() => setStage(9), 200);

        try {
          sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(parsed.data));
          sessionStorage.setItem(QUESTION_STORAGE_KEY, queryText);
        } catch {
          // sessionStorage may be blocked
        }

        window.dispatchEvent(new Event("dds-session-change"));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred during research.");
      } finally {
        clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);
        clearTimeout(stageTimer3);
        clearTimeout(stageTimer4);
        setLoading(false);
      }
    },
    [],
  );

  // Automatically start research if question exists in session storage but no result is cached
  useEffect(() => {
    if (storedQuestion && !cachedResult && !loading && !error) {
      const timer = setTimeout(() => {
        executeResearch(storedQuestion);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [storedQuestion, cachedResult, loading, error, executeResearch]);

  function clearResearch() {
    try {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
      sessionStorage.removeItem(QUESTION_STORAGE_KEY);
      sessionStorage.removeItem(MANUAL_URLS_STORAGE_KEY);
    } catch {
      // browser storage disabled
    }
    window.dispatchEvent(new Event("dds-session-change"));
  }

  function handleFollowUp(action: FollowUpAction) {
    const prevContext = cachedResult
      ? { query: cachedResult.query, topic: cachedResult.intent.summary }
      : undefined;
    executeResearch(action.suggestedQuery, undefined, prevContext);
  }

  function retryWithManualUrls(e: React.FormEvent) {
    e.preventDefault();
    const urls = fallbackUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    const query = storedQuestion || "Research question";
    executeResearch(query, urls);
  }

  // 1. Loading State with 9-stage progress
  if (loading) {
    return (
      <div className="results-loading-container">
        <ResearchProgress stage={stage} />
      </div>
    );
  }

  // 2. Error State (e.g. search failure Test E)
  if (error) {
    return (
      <section className="research-error-state" role="alert">
        <div className="error-icon-box">
          <CircleAlert size={28} aria-hidden="true" />
        </div>
        <span className="eyebrow">Search Provider Notice</span>
        <h1>Autonomous Discovery Could Not Be Completed</h1>
        <p className="error-description">{error}</p>

        <div className="error-recovery-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => storedQuestion && executeResearch(storedQuestion)}
          >
            <RefreshCw size={16} aria-hidden="true" /> Retry Research
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setShowManualFallback(!showManualFallback)}
          >
            Add Source URLs to Help Discovery
          </button>
          <Link className="button button-quiet" href="/demo">
            Open Scholarship Demo
          </Link>
        </div>

        {showManualFallback && (
          <form className="manual-fallback-form" onSubmit={retryWithManualUrls}>
            <label htmlFor="fallback-sources">
              Enter one or more HTTPS source URLs to review:
            </label>
            <textarea
              id="fallback-sources"
              value={fallbackUrls}
              onChange={(e) => setFallbackUrls(e.target.value)}
              placeholder="https://example.org/policy-notice&#10;https://university.edu/admissions"
              rows={3}
            />
            <button type="submit" className="button button-dark">
              Review with these sources
            </button>
          </form>
        )}
      </section>
    );
  }

  // 3. Empty State (no question or result in session)
  if (!cachedResult) {
    return (
      <section className="empty-results">
        <div className="empty-orbit" aria-hidden="true">
          <Search size={26} />
        </div>
        <span className="eyebrow">No active research session</span>
        <h1>Start with a research question.</h1>
        <p>
          Ask a question on the home page to begin autonomous source discovery, evidence analysis, and
          an adaptive research workspace.
        </p>
        <div className="empty-actions">
          <Link className="button button-primary" href="/">
            New Research
          </Link>
          <Link className="button button-secondary" href="/demo">
            Open Scholarship Demo
          </Link>
        </div>
      </section>
    );
  }

  // 4. Full Structured Research Workspace
  const result = cachedResult;
  const failures = result.sources.filter(
    (source) => source.status !== "reviewed" && source.status !== "not_reviewed",
  );

  return (
    <div className="results-workspace">
      {/* Top Header Navigation */}
      <div className="results-nav-bar">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" /> Start New Research
        </Link>
        <div className="workspace-controls">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => window.print()}
          >
            <Printer size={15} aria-hidden="true" /> Print Report
          </button>
          <button
            type="button"
            className="button button-quiet"
            onClick={() => executeResearch(result.query)}
            title="Refresh and re-discover sources"
          >
            <RefreshCw size={15} aria-hidden="true" /> Re-run
          </button>
          <button
            type="button"
            className="button button-quiet"
            onClick={clearResearch}
          >
            <Trash2 size={15} aria-hidden="true" /> Clear
          </button>
        </div>
      </div>

      {/* Header Metadata Banner */}
      <header className="results-page-heading">
        <div className="heading-meta-row">
          <span className="eyebrow">
            <span className="eyebrow-rule" /> Research Intelligence Workspace
          </span>
          <div className="intent-tags">
            <span className="category-tag">
              <Tag size={13} aria-hidden="true" /> {result.intent.category}
            </span>
            <span className={`time-tag time-tag--${result.intent.timeSensitivity}`}>
              <Clock size={13} aria-hidden="true" /> {result.intent.timeSensitivity} time sensitivity
            </span>
            {result.createdAt && (
              <span className="timestamp-tag">
                <Calendar size={13} aria-hidden="true" /> {new Date(result.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <h1>{result.query}</h1>
        <p className="heading-subtitle">
          Discovered <strong>{result.discoveredSourceCount ?? result.sources.length} candidate sources</strong>.
          Successfully parsed and reviewed <strong>{result.reviewedSourceCount} pages</strong> for traceable evidence claims.
        </p>
      </header>

      {result.mode === "demo" && <DemoDatasetBadge />}

      {failures.length > 0 && (
        <div className="source-failure-list" aria-label="Sources that could not be fully extracted">
          {failures.map((source) => (
            <ResultErrorBanner
              key={source.id}
              message={`${source.title}: ${source.error ?? source.status}`}
            />
          ))}
        </div>
      )}

      {/* Required Accuracy Notice */}
      <AccuracyNotice />

      {/* Adaptive Generative UI */}
      <AdaptiveResultsRenderer result={result} onFollowUp={handleFollowUp} />

      <footer className="results-footer">
        <p className="session-storage-note">
          This research session is held in this browser tab only. No cloud tracking or user profile is created.
        </p>
      </footer>
    </div>
  );
}
