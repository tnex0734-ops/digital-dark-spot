import Link from "next/link";
import { ArrowRight, Check, FileText, Sparkles } from "lucide-react";
import { LandingComposer } from "@/components/LandingComposer";

function EvidenceIllustration() {
  return (
    <div className="evidence-illustration" aria-label="Illustration of separate pages connecting to a research question" role="img">
      <svg viewBox="0 0 500 330" aria-hidden="true" className="illustration-svg">
        <path d="M112 87c71 7 86 36 129 85M335 84c-41 18-61 49-94 88M104 237c52-28 85-43 138-65m158 69c-58-21-104-45-158-69" fill="none" stroke="#bec3b3" strokeWidth="2" strokeDasharray="5 7" />
        <rect x="34" y="38" width="148" height="95" rx="14" fill="#fff" stroke="#dfe2d8" />
        <rect x="54" y="59" width="26" height="28" rx="7" fill="#e2edf8" />
        <path d="M62 68h10M62 74h10M62 80h7" stroke="#315f85" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M91 66h68M91 78h53M54 104h103" stroke="#c7cbc1" strokeWidth="4" strokeLinecap="round" />
        <rect x="316" y="37" width="150" height="96" rx="14" fill="#fff" stroke="#dfe2d8" />
        <circle cx="344" cy="69" r="13" fill="#eae5fa" />
        <path d="M338 69h12m-6-6v12" stroke="#69559a" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M368 63h75M368 76h58M336 106h108" stroke="#c7cbc1" strokeWidth="4" strokeLinecap="round" />
        <rect x="29" y="194" width="161" height="98" rx="14" fill="#fff" stroke="#dfe2d8" />
        <path d="M51 217h49m-49 11h95m-95 11h78" stroke="#c7cbc1" strokeWidth="4" strokeLinecap="round" />
        <rect x="53" y="254" width="67" height="20" rx="10" fill="#fff2c5" />
        <circle cx="66" cy="264" r="4" fill="#d49f17" />
        <path d="M77 264h32" stroke="#92701a" strokeWidth="3" strokeLinecap="round" />
        <rect x="311" y="193" width="154" height="100" rx="14" fill="#fff" stroke="#dfe2d8" />
        <path d="M334 218h99m-99 12h81m-81 12h56" stroke="#c7cbc1" strokeWidth="4" strokeLinecap="round" />
        <rect x="334" y="256" width="108" height="22" rx="11" fill="#f8e8e6" />
        <path d="M346 267h10m6 0h65" stroke="#9d4944" strokeWidth="3" strokeLinecap="round" />
        <circle cx="250" cy="170" r="61" fill="#ddf36a" stroke="#20221f" strokeWidth="1.5" />
        <circle cx="250" cy="170" r="36" fill="#fff" stroke="#20221f" strokeWidth="1.5" />
        <path d="M235 171h30m-15-15v30" stroke="#20221f" strokeWidth="2" strokeLinecap="round" />
        <circle cx="250" cy="170" r="5" fill="#20221f" />
      </svg>
      <div className="illustration-caption"><span className="caption-mark" />Question to evidence, at a glance</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-rule" />Autonomous Evidence & Gap Intelligence</div>
          <h1>Find what’s missing before you decide.</h1>
          <p className="hero-description">
            Enter a research question. We’ll automatically discover relevant sources, examine the evidence, flag contradictions and expired cycles, and render an intent-specific Generative UI workspace.
          </p>
          <div className="hero-points">
            <span><Check size={16} aria-hidden="true" />Autonomous discovery without mandatory URLs</span>
            <span><Check size={16} aria-hidden="true" />Evidence stays traceable with exact excerpts</span>
          </div>
        </div>
        <EvidenceIllustration />
      </section>

      <LandingComposer />

      <section className="how-strip" aria-label="How autonomous research works">
        <div>
          <span className="step-number">01</span>
          <div>
            <strong>Ask a question</strong>
            <p>We infer requirements and generate targeted discovery queries.</p>
          </div>
        </div>
        <div>
          <span className="step-number">02</span>
          <div>
            <strong>Autonomous discovery</strong>
            <p>Candidate sources are ranked, selected, and parsed server-side.</p>
          </div>
        </div>
        <div>
          <span className="step-number">03</span>
          <div>
            <strong>Adaptive workspace</strong>
            <p>Review coverage matrix, conflicts, freshness timeline, and checklist.</p>
          </div>
        </div>
      </section>

      <section className="demo-promo">
        <div className="promo-icon"><FileText size={21} aria-hidden="true" /></div>
        <div className="promo-copy">
          <span className="eyebrow">Zero-Network Standalone Demo</span>
          <h2>Explore the scholarship research demo.</h2>
          <p>
            Experience a complete offline-ready scholarship review featuring an older-cycle deadline, a document contradiction, and prioritized verification tasks.
          </p>
        </div>
        <Link href="/demo" className="button button-dark">Open the demo <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>

      <div className="landing-footnote">
        <Sparkles size={15} aria-hidden="true" />
        Zero-configuration Vercel deployment. No user accounts, local runtime, or API keys required.
      </div>
    </div>
  );
}
