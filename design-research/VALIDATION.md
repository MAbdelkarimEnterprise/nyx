# Validation: interaction depth pass, 2026-11-03

**Status: the machine checks pass. The two human checks have not run, so by the brief's rule this pass is not shipped to production.**
The work is on branch `interaction-depth` (a Vercel preview that needs a login). `main` is unchanged.

## 1. Five-second test with real people: NOT RUN
- **Needs:** at least 5 people from the audience (founders, operators, athletes). I can't recruit or interview people, so this is open.
- **Ready to use:** `design-research/five-second/index.html`, served at `/design-research/five-second/` once deployed.
  - It shows the new hero and then the Agent Network for 5 s each, at 390 px or 1440 px to match the device.
  - It asks "What is NYX?" and "What would you click first?" and gives the tester a copy-paste block.
  - No backend and no data collected. The tester sends the block back.
- **Pass:**
  - 4 of 5 describe an AI system that runs their operation.
  - 4 of 5 choose Inquire or an agent.
- **Answers (verbatim):** _none yet_

## 2. Analytics after one week live: NOT POSSIBLE YET
- **Baseline is 0 on every event, and it couldn't have been anything else:**
  - Vercel Web Analytics isn't enabled.
  - `window.nyxTrack` was never defined, so `inquire_click`, `access_step_N`, `access_submit`, `alfred_open` and `alfred_message` were dropped.
- **This pass:**
  - Defines `nyxTrack`, which queues events for Vercel's `va()`.
  - Adds `agent_command` with `{agent, source: preset|typed|retry}`.
- **Owner:** enable Web Analytics (custom events need the Pro plan), then add `/_vercel/insights/script.js` to the loader list in `index.html`.
- **The week starts then. Compare:**
  - Alfred `alfred_open` → `alfred_message` rate.
  - `access_step_1` → `access_submit` completion.
  - `agent_command` volume.
- **Rollback rule:** if a rate drops, revert the commit that introduced that interaction. They're separate commits: `7eadfa6` is the loop, `2cfaf81` is the propagation.

## 3. Machine checks: PASS
| Check | Result | Evidence |
|---|---|---|
| axe-core 4.10.2, 6 states (rest, reply, error × 1440/390) | **0 violations** (was 10: no `<main>` landmark) | `axe.json` |
| Lighthouse mobile (local, gzip) | **98 / 100 / 100 / 100**, FCP 1.7 s, LCP 2.1 s, TBT 0, CLS 0.001 | `.lh/i4-final*.json` (gitignored) |
| Lighthouse desktop | **100 / 100 / 100 / 100**, LCP 0.5 s, CLS 0.002 | `.lh/i4-final-desktop.json` |
| APCA + WCAG 2.2, every text pair in use | **0 failures** | `contrast.md` |
| 4× CPU, headed Chrome: hero / Agent Network / command loop | **60 / 60 / 60 fps**, loop p95 frame 17.6 ms, 0 frames > 25 ms | `traces/final-headed-*.json`, raw `*.trace.json.gz` |
| INP under 4× (headed) | **56 ms** at 1440 and 390 | same |
| CLS during the loop (all states, both widths, with and without reduced motion) | **0** | `loop/checks.json` |
| Keyboard | arrows move, Enter selects, Esc goes from panel to agent and from agent back to APEX | `loop/checks.json` |
| Live region | announces selection, routing, the full reply and each error | `loop/checks.json` (`live`) |

- **Headless INP is wrong:** headless Chrome reports INP of 0.5–5 s with under 1 ms of script time and under 1 ms of input delay. That's a known presentation-delay artifact of headless mode. The production baseline (472 ms) showed the same thing. The numbers above come from a visible Chrome window.
- **No iPhone Safari trace:** no iPhone was connected to this Mac. That device trace is still open.

## 4. Color audit: PASS
- **Pink at rest:** **0.00% on all 24 screens** (12 sections × 1440 and 390). The rule is ≤ 3%. Files: `pixels/final-rest.json` and its PNGs.
- **Pink only after a visitor action.** `propagate/checks.json` confirms:
  - Hero glow: off at rest, on while moving over a button, off 0.7 s after stopping.
  - Tier cards: 0 marked at rest, 1 after clicking Inquire.
  - Progress line: empty before the first answer, one pink segment after it.
  - Alfred: the visitor's message has a pink edge, and "PROCESSING" is blue.
- **Blue is under target:** blue measures **0.1–1.8%** of each screen. The brief's target is about 8%, so that target is **not met**. I didn't add blue fills to hit a number, because blue marks the system and more of it would be decoration.

## What failed, and what changed because of it
1. **The brief's own preset example produced a refusal.**
   - Raw replies: SIGNAL refused "Plan this week's content", LEDGER refused to forecast, and CONVERT hedged "Where do deals usually leak…" 4 times out of 4 in the live loop recording (`loop-live-v1-old-presets/`).
   - Change: presets now ask how the agent would act, not for general facts or for the work itself.
   - Live runs:
     - Run 1: 20 of 24 answered (first sentence doesn't decline).
     - Run 2, with a stricter two-sentence check: 17 of 24. On reading them, 3 of the 7 flagged replies answered after a one-sentence caveat. I replaced 4 deflecting presets, and in a final edit reworded 2 more.
     - Run 3 hit the production **daily limit**: 24 of 24 returned 429 (`presets-run3-429.json`).
   - The last two rewordings, "What does a founder usually hand off first?" and "How do you find a bottleneck?", are **not yet verified live**. Rerun `node design-research/presets.mjs` after the limit resets.
2. **Real replies (626–717 characters) overflowed the reserved reply box on desktop.** Inquire is now pinned to the bottom of the reply area, so it's always visible without scrolling.
3. **The hub and panel were taller than a 1440×900 screen**, so APEX and the presets weren't visible together. The map is now 12:5, and the total height is 868 px.
4. **On mobile the docked panel shifted layout (CLS 0.13).** The chip row, the agent line and the reply sheet now have fixed heights. CLS is 0.
5. **Production bug found by the harness:** the closed Alfred overlay's input set `pointer-events:all`. It caught clicks in an invisible strip at the bottom-center of every page and could be reached with Tab. The closed overlay is now `visibility:hidden`.
6. **The palette swap made `--line` opaque**, which filled the Outcomes grid solid blue (40% of the screen). The grid background is removed.
7. **The progress line showed 20% pink before any answer**, which broke "pink only after an action". It now fills by answered steps only.
8. **Primary-button hover was unreadable** (light label on a light fill). Hover now uses `structure-strong`: 8.19:1, Lc 86.3.
9. **The per-minute rate limit doesn't hold on production.** 11 concurrent calls all returned 200, because the limiter is per-instance memory. The daily limit did trigger, after about 75 calls today. Configuring Upstash (PLAN.md owner action) fixes both.
