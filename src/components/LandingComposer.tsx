"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { QUESTION_STORAGE_KEY } from "@/lib/research/storage-keys";

const examples = [
  "What should I verify before applying for a scholarship?",
  "Compare the cancellation rules for these two services",
  "What changed in the latest policy update?",
];

export function LandingComposer() {
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function beginReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 8) {
      setError("Add a little more detail so the requirements can be specific.");
      return;
    }
    try {
      sessionStorage.setItem(QUESTION_STORAGE_KEY, trimmed.slice(0, 2000));
      router.push("/intent");
    } catch {
      setError("This browser blocked temporary session storage. Enable it to continue, or open the local demo.");
    }
  }

  return (
    <div className="composer-wrap">
      <form className="research-composer" onSubmit={beginReview}>
        <label htmlFor="research-question">What are you trying to find out?</label>
        <div className="composer-input-row">
          <Search className="composer-icon" size={19} aria-hidden="true" />
          <textarea id="research-question" value={question} onChange={(event) => { setQuestion(event.target.value); setError(""); }} placeholder="For example, what should I verify before applying for this scholarship?" maxLength={2000} rows={3} aria-describedby={error ? "question-error" : "question-help"} />
          <button className="button button-primary composer-submit" type="submit">Review question <ArrowRight size={17} aria-hidden="true" /></button>
        </div>
        {error ? <p id="question-error" className="form-error" role="alert">{error}</p> : <p id="question-help" className="field-help">You choose the pages to review in the next step.</p>}
      </form>
      <div className="example-prompts" aria-label="Example questions">
        <span>Try a question</span>
        {examples.map((example) => <button type="button" key={example} onClick={() => { setQuestion(example); setError(""); }}>{example}</button>)}
      </div>
    </div>
  );
}
