import Link from "next/link";
import { ArrowUpRight, BookOpenText, CircleHelp, ScanSearch } from "lucide-react";
import type { ReactNode } from "react";

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M7 18 18 6l11 12-11 12L7 18Z" fill="var(--lime)" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="4" fill="var(--ink)" />
      <path d="M18 2v5M18 29v5M2 18h5M29 18h5" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link href="/" className="brand-lockup" aria-label="Digital Dark Spot home">
          <Mark />
          <span>Digital Dark Spot</span>
        </Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="primary-nav" aria-label="Primary">
          <Link href="/" className="nav-link"><ScanSearch size={18} aria-hidden="true" /><span>Research</span></Link>
          <Link href="/demo" className="nav-link"><BookOpenText size={18} aria-hidden="true" /><span>Scholarship demo</span></Link>
          <Link href="/methodology" className="nav-link"><CircleHelp size={18} aria-hidden="true" /><span>How it works</span></Link>
        </nav>
        <div className="sidebar-callout">
          <span className="eyebrow">A guided example</span>
          <p>See how requirements, source text and open questions fit together.</p>
          <Link href="/demo" className="text-link">Open the demo <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className="sidebar-footnote"><span className="status-dot" aria-hidden="true" />No account or API key required</div>
      </aside>

      <div className="workspace-column">
        <header className="topbar">
          <div className="topbar-context">
            <span className="topbar-overline">Evidence, in context</span>
            <span className="topbar-title">Research workspace</span>
          </div>
          <nav className="topbar-links" aria-label="Quick links">
            <Link href="/methodology">Methodology</Link>
            <Link href="/demo" className="button button-primary button-small">Try the demo <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </nav>
        </header>
        <main id="main-content" className="page-content">{children}</main>
        <footer className="app-footer">
          <span>Review the pages you choose. Findings stay in this browser session.</span>
          <Link href="/methodology">Limits and method</Link>
        </footer>
      </div>
    </div>
  );
}
