# Findings: raw material, 2026-11-03

All sources are files in this folder, collected today from production (nyxsystem.online).

## 1. Real Alfred and agent output (`alfred-raw.json`, `probe.mjs`)
I sent 12 visitor questions (founder, executive, athlete, gym owner, skeptic, pricing) to the live `/api/agent`: 6 to Alfred, 6 to CONVERT, APEX, SIGNAL, MERIDIAN, CIPHER and LEDGER.

| | Value |
|---|---|
| Latency, whole reply | median **1.45 s**, mean 1.51 s, min 1.16 s, max 2.38 s (the first call, which included a cold start) |
| Reply length | median **527 characters (about 90 words)**, max 791 characters / 128 words |
| Status | 12 of 12 returned 200 |
| Last line | 12 of 12 end by pointing to the access review |
| Did the work asked for | **No in 3 of 6 agent replies.** SIGNAL declined to plan content, LEDGER declined to forecast, CIPHER declined to discuss data access. |
| Burst of 11 at once | All 11 returned 200 in 0.8–1.8 s. **The 10-per-minute limit did not trigger.** |
| Wrong origin / 501 characters | 403 "Not available here." / 413 "Keep it under 500 characters." Both work. |

- The API returns the whole reply at once. It does not stream.
- Replies end with "the access review at the bottom of nyxsystem.online", which reads oddly when the visitor is already on that page.
- The burst result shows the rate limiter is per-instance memory. Upstash is still unconfigured; that's an owner action in PLAN.md.

## 2. Real behavior (analytics)
**There is no data, and there could not have been any.**
- Vercel Web Analytics is not enabled: `/_vercel/insights/script.js` returns 404.
- `window.nyxTrack`, which every event calls, is never defined anywhere. `inquire_click`, `access_step_N` and `access_submit` were firing into nothing.
- `alfred_message` was never wired.

Baseline: **0 events on every metric, as of 2026-11-03.** The before/after comparison in Step 4 can only start once the owner enables Analytics, which also needs the Pro plan for custom events. This pass defines `nyxTrack`, wires `alfred_message` and adds `agent_command`, so the baseline week starts counting the day Analytics is switched on.

## 3. Real devices (`trace.mjs`, `traces/baseline*.json`, raw traces `.trace.json.gz`)
- These are headless Chrome runs with 4× CPU throttling. **No iPhone was connected to this Mac** (USB check came back empty), so there is no Safari trace. That's an open item, not a pass.

| Production, 4× CPU | Hero fps / p95 frame | Agent Network fps / p95 | INP | CLS |
|---|---|---|---|---|
| 1440 px | 60 / 16.8 ms | 60 / 16.8 ms | 472 ms (see below) | 0.0001 |
| 390 px | 60 / 16.7 ms | 60 / 16.7 ms | 16 ms | 0.0003 |

- The 472 ms interaction was a click on the fourth hub node.
- Its script time was 0.1 ms and its input delay 0.3 ms. All of the 472 ms was presentation delay, the wait for the next frame.
- The other hub clicks were 16 ms. I read it as a headless paint stall, not page work, but I'm recording it, and the new loop gets re-traced against it.

## 4. Brand source
The repo has no brand document. The only sources are the brief's phrases and the site's creed:
- "Nyx, goddess of night"
- "seen, not explained"
- "power that doesn't announce itself"
- The creed: "What operates in the dark controls what happens in the light."

Read as rules for interaction:
- The system moves without being asked, but quietly: night, unannounced.
- Effects are shown, not narrated: a pulse arrives somewhere rather than a label saying "processing".
- Light (pink) only appears where the visitor brought it.

## Three constraints this imposes
1. **The wait is 1.2–2.4 s and arrives in one piece, so the wait is the routing animation.**
   - Pink travels from the visitor to APEX (about 500 ms), then blue fans out to the agents.
   - That covers the median wait, and APEX keeps routing until the reply lands.
   - The reply then reveals line by line. I won't call that streaming, because the API doesn't stream.
   - The reply area is reserved at a fixed height for about 800 characters, so nothing shifts.
2. **Agents decline "do it" commands, so presets ask how NYX would do it, not ask it to do it.**
   - The brief's example "Plan this week's content" produced a refusal from SIGNAL.
   - Presets are phrased as questions each agent answers well, for example "How would you plan a week of content?"
   - Every reply already ends on the access review, so the loop always closes on an Inquire link. The model text isn't edited.
3. **The budget is transform and opacity only, with zero layout work per interaction.**
   - Today's hub holds 60 fps at 4× with near-zero script time.
   - The new loop must keep that: SVG strokes animated with WAAPI, states as class flips, every panel's size reserved up front.
   - The rate-limit state can't be reproduced reliably, because the limiter is per-instance, so it gets designed from the API's 429 contract, and the UI test stubs it.
