# NYX site upgrade — plan and evidence

Source brief: `NYX_Site_Upgrade_Prompt.md` (audit of nyxsystem.online). Deploys: Vercel, from `main`.

## What the codebase is
- `index.html` — the whole marketing site: ~1,550 lines CSS, ~2,800 lines inline JS, markup.
- `api/agent.js` (agent chat, public LLM), `api/waitlist.js` (access review), `api/chat.js` (old Alfred LLM, only used by `command.html`, which `vercel.json` already redirects away) — Vercel functions.
- `lib/shared.js` — rate limiter (Upstash Redis, memory fallback), Supabase persist, Resend email templates. Shared with `netlify/functions/*` (legacy mirror).
- `dashboard/` — separate Next.js app, not part of this site. Out of scope.
- Two Alfred overlays in `index.html`: **Alfred Mode** (`#alfred-overlay`, `af-*`, "ESC — DISMISS", answers from a local scripted KB, opens the mic automatically) and **Jarvis** (`#jarvis-overlay`, scripted command map). Jarvis has no trigger in the HTML: dead code.
- An "inquiry lock" script (commit 750f8b5) routes every Alfred / agent surface to the form. Phase 1.5 and Phase 5 reverse that for Alfred only, now that the API is hardened and grounded.

## Finding → files

| # | Finding | Files |
|---|---|---|
| 1.1 | Projected labels, SAMPLE tags, feed caption, fake coordinates | `index.html` |
| 1.2 | Agent count = eight everywhere | `index.html`, `README.md` (site copy only) |
| 1.3 | Tiers per brief, subtitle, maintenance note, "earned" line, INQUIRE → pre-selects tier → submitted | `index.html`, `api/waitlist.js`, `lib/shared.js` |
| 1.4 | `/api/agent` rate limit 10/min + 50/day per IP, 500-char input, 300 max tokens, origin check, brand-voice errors, content-free usage log; delete dead public `/api/chat` | `api/agent.js`, `lib/shared.js`, delete `api/chat.js` |
| 1.5 | Shared knowledge, injected into every agent; `alfred` agent; hard rules; Alfred Mode input → `agent:"alfred"`; test prompts | `lib/nyx-knowledge.js`, `api/agent.js`, `index.html`, `tests/agent-prompts.md`, `tests/agent.test.mjs` |
| 1.6 | Waitlist: persist all fields + tier, owner email with tier, honeypot, required fields, caps, rate limit; step errors; data kept on back/failure; retry; new confirmation copy + auto-reply | `api/waitlist.js`, `lib/shared.js`, `index.html`, Supabase migration for new columns |
| 2.1 | Boot ≤1.2 s, skippable, skipped on return (7 days) and reduced motion; hero text real HTML | `index.html` |
| 2.2 | Lazy-init canvases via IntersectionObserver, pause off-screen/hidden, static fallback on mobile / ≤4 cores / reduced motion, DPR cap 1.5 | `index.html` → `js/*` |
| 2.3 | three.js r128 → current (ES module), inline JS → `js/` modules with defer, delete Jarvis overlay + local Alfred KB | `index.html`, `js/*.js` |
| 2.4 | Fonts: Fraunces + Inter only, used weights, self-hosted WOFF2, preload hero weight | `fonts/`, `index.html` |
| 2.5 | Lighthouse before/after | this file |
| 3.x | Type floor, contrast, caps, numbering, merged Alfred section, IA order, nav, hero CTAs + H1, tap targets, overflow, tier cards on mobile, overlay one-handed, motion calm + pause, focus rings, focus trap, keyboard assessment | `index.html`, `js/*` |
| 4.x | JSON-LD, og.png 1200×630, sitemap/robots, favicons, meta description | `index.html`, `og.png`, `favicon.svg`, `apple-touch-icon.png`, `sitemap.xml`, `robots.txt` |
| 5.x | Ask Alfred launcher, step progress text, summary step, Architect before form, footer, analytics events, 404 | `index.html`, `404.html`, `js/*` |

## Decisions the brief did not cover
- Uncommitted teal recolor found in the working tree was stashed (`git stash list`) so phase commits stay clean. Not part of this brief.
- Knowledge file is `lib/nyx-knowledge.js` (CommonJS) to match `lib/shared.js`; the project has no TypeScript build for the site.
- Alfred's mic no longer opens on overlay launch; it starts when the visitor taps the mic. With a paid model behind Alfred, an always-on mic would send ambient speech as billable queries.
- Analytics: Vercel Web Analytics (site already on Vercel; no cookie banner needed).

## Lighthouse

| | Perf | A11y | Best Pr. | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Before — mobile | 34 | 96 | 93 | 100 | 6.8 s | 1,490 ms | 0.011 |
| Before — desktop | 86 | 96 | 96 | 100 | 1.2 s | 180 ms | 0.001 |
| After — mobile | | | | | | | |
| After — desktop | | | | | | | |

Measured with Lighthouse 12.8.2, headless Chrome, against https://nyxsystem.online on 2026-11-03.

## Definition of done — evidence
(filled in as each phase lands)
