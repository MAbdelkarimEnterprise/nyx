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
| After — mobile | 90 | 97 | 100 | 100 | 2.9 s | 0 ms | 0.001 |
| After — desktop | 100 | 100 | 100 | 100 | 0.4 s | 70 ms | 0.003 |

Measured with Lighthouse 12.8.2, headless Chrome (simulated slow 4G for mobile), against https://nyxsystem.online on 2026-11-03. Mobile Performance varied 90–93 across four runs. Mobile FCP went 5.3 s → 1.8 s.

## Definition of done — evidence

| Item | Status | Evidence |
|---|---|---|
| No "VERIFIED", unlabeled real-looking numbers, or "six" | Done | Stats, outcomes, missions, briefing, feed, telemetry all labeled Projected/Sample; `grep -i six` clean except README's dashboard architecture line (6 agents in `dashboard/lib/claude.ts` is factual) |
| Four options; every INQUIRE pre-selects and reaches the form | Done | Browser test: INQUIRE → option selected in step 5, sent as `tier`, shown in owner email subject |
| `/api/agent` hardened, grounded, `alfred` works, prompts pass | Done | `tests/agent.test.mjs` (7 tests); live: foreign origin 403, 501 chars 413; `node tests/run-agent-prompts.mjs` 8/8 on production, answers read by hand |
| `/api/waitlist` persists, notifies with tier, validates, auto-reply | **Code done; storage not live** | `tests/waitlist.test.mjs` (5 tests); live validation + honeypot checked. Production has no Supabase env vars, so today submissions are only emailed. See "Needs the owner" |
| Mobile hero < 1.5 s; Perf ≥ 85, A11y ≥ 95, SEO ≥ 95 | Scores met; hero time partly | 90 / 97 / 100. Real-device first paint is ~0.3 s locally; Lighthouse's simulated slow 4G reports FCP 1.8 s, LCP 2.9 s (target 2.5 s) |
| No text < 12 px; AA contrast; taps ≥ 44 px | Done | Browser scan: 0 visible text nodes < 12 px, 0 tap targets < 44 px at 360/375/390/430/768/1440; Lighthouse contrast passes |
| Sequential sections; Alfred merged; nav | Done | Labels 001–009; Alfred/Founder OS/Live Feed/Voice → one tabbed section; nav System · Agents · Alfred · Options · Access |
| Reduced motion stops canvas, ticker, GSAP | Done | `_pRM` → GSAP timeScale 100, no parallax, scenes not loaded, 2D loops draw one frame, ticker/clocks/feed stop, CSS animations off |
| Keyboard: focus, overlay trap + Esc, review operable | Done | Browser test: focus trapped in Alfred, Esc closes and returns focus; ARIA tabs with arrows; arrows/Enter through the review |
| JSON-LD, OG image, sitemap, robots, favicons | Done | All 200 on production; og.png 1200×630 (was 404) |
| Tested at 360/375/390/430/768/1440 | Done | Width harness (iframes) scan + screenshots reviewed at 390 |
| Committed per phase, pushed, live | Done | fdc1104, c8b6b52, 5b5055c, 2cc83bf, a0ca62f + perf follow-ups; checked live |

## Needs the owner (could not be done from code)
1. **Store access reviews.** Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel (production) and run `dashboard/supabase/migrations/007_access_review.sql`. Until then every inquiry is emailed to labs@nyxsystem.online but not stored.
2. **Durable rate limits.** Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without them the limiter is per server instance.
3. **Email delivery.** Confirm the nyxsystem.online domain is verified in Resend; I did not send a real test email.
4. **Analytics.** Enable Web Analytics on the Vercel project, then add `/_vercel/insights/script.js` to the script list in `index.html` (one line, marked there). Events are already wired.
5. **Search Console.** Verify the domain and submit `sitemap.xml`.
6. **Teal recolor.** An uncommitted recolor found in the working tree is in `git stash` ("teal recolor …"). It will conflict with this work if popped as-is.

## Decisions the brief did not cover (continued)
- Founder OS dashboard was cut in the merge; its content duplicated the briefing and feed.
- "Structured access. Earned depth." became "Four options. One system." to fit the inquiry model.
- Mission headline "Field record. Redacted by design." became "Sample missions. How a deployment runs." (the old line implied real redacted cases).
- Agent consoles (agent cards) still route to the access review; only Alfred is open to visitors.
- Phones and ≤4-core devices get no three.js at all (static fallback), per 2.2.
