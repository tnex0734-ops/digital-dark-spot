# Digital Dark Spot

Digital Dark Spot helps people see which requirements are supported by a small set of sources, what those sources leave open, and what to verify next.

The app is a deterministic, evidence-first research workspace. It does not use a hosted AI model, search the internet, or claim that a text match proves a fact.

## Try the demo

Choose **Try the demo** from the top bar or open `/demo`. The bundled scholarship workspace opens immediately, without sign-in, environment variables, an API key, or any third-party network request.

The demo shows traceable excerpts, a missing-in-reviewed-sources gap, a possible document conflict, an older-cycle warning, and a prioritised verification checklist. Its records and dates are fictional and labelled as illustrative.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. No environment variables are required.

## URL Research

For a non-demo review, enter a question, review the suggested requirements, and provide one to three public HTTPS page URLs. The app requests only those URLs. It does not crawl links or search elsewhere.

The server accepts static `text/html` responses up to 1 MB per page, with a 4.5-second per-page timeout and at most two concurrent requests. It rejects credentials, non-standard ports, direct IPs, local/private/reserved destinations and mixed public/private DNS answers. DNS results are checked and the selected public address is pinned for the TLS request. Redirects are followed manually, with every destination revalidated and a two-hop cap. The request sends no cookies or authorization headers. Page scripts are never run; text is extracted and treated as untrusted input.

Page text is matched to requirements using simple keyword rules. A displayed passage is an excerpt, not an AI-verified claim. Sites that require login, browser execution, unusual encodings, PDF support, or block server requests may be unavailable. Failures are shown per source; the app does not fill missing text with invented details.

Avoid submitting URLs with access tokens or other secrets in their path or query string. The exact URL is sent from the app server to the public destination you chose.

## Privacy and security

- No account, database, analytics, external AI, or search provider is used.
- Questions and results are stored in the current browser tab's `sessionStorage` so they can move between screens. Use **Clear research** or close the tab to remove them.
- The server does not persist raw page HTML or research content and does not log question text or full URLs.
- The URL endpoint bounds request size, source count, response bytes, redirects, concurrency, and execution time.
- Results validate against strict Zod schemas. The UI plan can only select components from a fixed registry and reference known data IDs. Invalid plans use a standard fallback renderer.
- Source content is rendered as escaped text. It is never inserted as trusted HTML, executed as code, or used as instructions.
- Browser security headers include a per-request Content Security Policy nonce, clickjacking protection, MIME sniffing protection, a restrictive referrer policy, and production HSTS.
- No credentials or environment variables are needed or bundled into client code.

The URL review endpoint is public and deliberately bounded, but it has no durable cross-instance rate-limit store. Before operating at high traffic, enable rate limiting or a WAF at the hosting edge and review usage. Do not rely on process memory for a globally consistent limit.

## Analysis boundaries

- Requirement templates and page matching are deterministic heuristics, not a live LLM call.
- “Not found in the sources reviewed” is scoped to the selected pages. It does not mean that information does not exist elsewhere.
- A conflict is only suggested when the available subject, attribute, unit, jurisdiction, condition, and period match. The demo conflict is fictional and is not a real programme rule.
- Publication, modification, retrieval, and validity dates remain separate. Older publication age alone is not proof that information is outdated.
- Coverage is the share of listed requirements with at least one excerpt. It is not a probability of correctness or a measure of all available information.
- Priority labels are a plain-language triage aid, not calibrated risk probabilities or professional advice.

Read **How it works** in the app for the user-facing methodology and limitations.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The Playwright end-to-end suite starts the production build on localhost, blocks third-party requests, and checks the landing-to-demo path, checklist reset, and a narrow mobile viewport.

## Deploy to Vercel

1. Push or connect this repository to GitHub.
2. In Vercel, import the repository and use the detected **Next.js** framework preset.
3. Leave the Root Directory at the repository root.
4. Leave Environment Variables empty.
5. Deploy, then open the production URL in a private browser window.
6. Check the landing page, `/demo`, `/methodology`, and `/api/health` (`{"status":"ok"}`).
7. Confirm that Demo works with third-party browser requests blocked. Test URL Research with a small public static HTML page and confirm failures are reported clearly.

The app is prepared for Vercel, but a production deployment is not included in this repository handoff. See [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) for the current import and deployment flow.
