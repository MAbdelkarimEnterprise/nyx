# NYX — design plan

Design-only pass. Copy, labels (Projected/Sample), options, links, forms, API wiring, analytics events and accessibility fixes stay as they are.
Screenshots: `design-review/before/` and `design-review/after/` (`<section>-<width>[-slice].jpg`, 360/390/768/1440), made with `node design-review/shoot.mjs <url> <dir>`.

## 1. What it looks like now (from `design-review/before/`)

| Section | 1440 | 390 |
|---|---|---|
| Hero | Centered silver NYX over a busy HUD: rotating crest with ring text, network lines, grid, status readouts in all four corners, an 8-row "agent status" panel, scroll cue. No single focus. | Same, cropped; readouts hidden; wordmark + statement + two buttons hold up. |
| System | "001 — THE SYSTEM" eyebrow; four-line serif headline with "Not a service." in bright blue italic; body left; orrery almost invisible bottom right. | Single column; orrery below. |
| Engine | Blue wireframe gyroscope with HUD brackets, "Precision in motion." with blue italic accent, three spec numbers. | Stacked; static fallback glow. |
| Agent Network | "002 —" eyebrow; headline in light **sans** (breaks the serif rule); 3×3 grid of identical bordered cards with sparkline canvases; APEX looks like the rest. | One long column of identical cards. |
| Alfred | Eyebrow; headline with blue italic accent; underline tabs; then a second row of five boxed sub-tabs; black terminal panel; SAMPLE chip in the panel header. | Tabs + sub-tab scroller; panel full width. |
| How It Works | Eyebrow; four pillar columns with blue line icons. | Stacked pillars. |
| Options | Eyebrow; serif headline; four accordion rows; "MOST COMPLETE" as a filled bright-blue block. | Rows with tags under names. |
| Outcomes + stats | Stats strip with sparklines; three report cards with big numbers. | Two-up stats, stacked cards. |
| Missions | Accordion "Mission 00X" bars with a dot status. | Same. |
| Architect | Centered note, blue italic accents. | Same. |
| Access review | Centered; dot progress; options as outlined boxes. | Same. |
| Chrome | Top nav + bottom telemetry bar (status, ticker, UTC, PAUSE) + ASK ALFRED button: four permanent layers. | Nav + bar + launcher. |

## 2. Tokens

### Color (one file: the `:root` block in `index.html`; nothing hard-coded elsewhere)
| Token | Hex | Use |
|---|---|---|
| `--night` | `#070A12` | Base. Deep night with a cool cast, not flat black. |
| `--dusk` | `#0D1220` | Raised surfaces: panels, cards, nav when shown. |
| `--slate` | `#161D2D` | Overlay: emphasized card (Full System), overlay panels, inputs. |
| `--indigo` | `#3C4A86` | Structure only: hairlines, rails, network lines, progress track. Never text. |
| `--moon` | `#EEE8DC` | The rare signal: active tab, live pulse, selected option, Full System border + label, focus ring. One per screen. |
| `--mist` | `#D5D9E3` | Primary text. |

Text steps (all AA on every surface): `--text-1: #D5D9E3` (14.0:1 on night, 11.9:1 on slate), `--text-2: #A5ACBC` (8.7 / 7.4), `--text-3: #8189A0` (5.7 / 4.8). Moon is 16.2:1. Indigo is 2.4:1, so it never carries text or marks a control boundary; control borders use `--text-3` (≥3:1).
Lines: `--line: rgba(60,74,134,0.35)`, `--line-strong: rgba(60,74,134,0.7)`.

### Type
- **Display — Fraunces** (variable, `opsz` + `wght`): wordmark and every section headline. Large sizes use `opsz 144`, tight tracking; small headings `opsz 36`, normal tracking.
- **UI and body — Inter**: everything else. `font-variant-numeric: tabular-nums` on clocks, metrics, stats, IDs.
- **Mono** (system `ui-monospace`, no download): reference IDs in outcome and mission reports only.
- Italic Fraunces appears only in the Architect note.

| Step | Size | Family / settings | Use |
|---|---|---|---|
| `--t-wordmark` | clamp(88px, 18vw, 232px) | Fraunces 300, opsz 144, tracking 0.06em | NYX |
| `--t-statement` | clamp(44px, 6.4vw, 96px) | Fraunces 300, opsz 144, −0.02em | System statement |
| `--t-h2` | clamp(34px, 4.2vw, 60px) | Fraunces 300, opsz 96, −0.015em | Section headlines |
| `--t-h3` | 26px | Fraunces 400, opsz 36 | Card / panel titles |
| `--t-lead` | 20px | Inter 400, 1.55 | Subheads, positioning line |
| `--t-body` | 16px | Inter 400, 1.7 | Body |
| `--t-small` | 14px | Inter 400, 1.6 | Readable secondary text |
| `--t-caption` | 12px | Inter 500, 0.04em | Captions, chips, readouts |

Caps only for system readouts (boot, rail status, telemetry). Labels, buttons and chips are sentence case.

### Spacing (8 px base)
`--s1 8 · --s2 16 · --s3 24 · --s4 32 · --s5 48 · --s6 64 · --s7 96 · --s8 128 · --s9 192`
Sections: transitional `--s7`/`--s8` vertical; signature (Agents, Alfred, Options) `--s9` on desktop. Mobile: `--s6` / `--s7`.

### Radius
`--r0: 0` structure (sections, rows, hairline groups) · `--r1: 2px` controls (buttons, chips, inputs, choices) · `--r2: 14px` raised panels (Alfred panel, option cards, overlay, launcher).

### Motion
Durations: `--d-ui 160ms` (hover, focus, select) · `--d-step 200ms` (tabs, review steps) · `--d-sig 1200ms` (signature moments).
Easing: `--ease-ui cubic-bezier(.2,0,0,1)` · `--ease-sig cubic-bezier(.16,1,.3,1)` (no overshoot) · `linear` (pulse travel only).
Signature moments, and only these: boot → hero, Agent Network pulses, Alfred reveal. No scroll-entrance animations anywhere.

## 3. Sections

**Persistent chrome** — two layers: top nav (hides on scroll down, returns on scroll up) and the Ask Alfred launcher. Desktop adds a left progress rail (it replaces the bottom bar and section eyebrows; it is the page's single readout). Bottom bar removed on all sizes.

```
DESKTOP RAIL (fixed, left, ≥1100px)
│ ● System          ← filled up to current section
│ ○ Agents
│ ○ Alfred
│ ○ How it works
│ ○ Options
│ ○ Outcomes
│ ○ Missions
│ ○ Access
│
│ 08 AGENTS · SAMPLE
│ 17:42:09 UTC
│ [Pause]            ← only while motion is playing
```

**Hero** — the one centered, bold moment. Night field (quiet three.js stars on capable desktops, static SVG star field elsewhere), one moonlight glow that follows the cursor on desktop. Wordmark, positioning line, then the two buttons. Corner readouts, crest, grid and the agent-status panel are removed.
```
┌──────────────────────────────────────────────────────────────┐
│ NYX                                   System Agents … [Access]│  ← nav (auto-hides)
│                 ·        .     ·                  .            │
│        ·                (moonlight glow)       ·               │
│                     N   Y   X                                  │  ← Fraunces opsz 144
│          Autonomous AI operating system                        │  ← caption
│     The operating system behind elite performance.             │  ← lead, one line
│            [ Inquire ]   See the system →                      │
│      .              ·                 .           ·            │
└──────────────────────────────────────────────────────────────┘
```

**System** — editorial: the three-line statement at near-hero size spanning columns 1–8; body in a narrow column (cols 9–12, <70ch). No color accent; emphasis by line breaks. Orrery removed (it was invisible and decorative).

**Engine** — kept as a quiet supporting visual: left-aligned copy, gyroscope right, rendered static (moves only with scroll on capable desktops). No HUD brackets.

**Agent Network (signature)** — hub diagram. APEX center (larger, moon ring), seven agents on a circle, fine indigo lines to APEX. Hover/focus an agent: its line brightens to moon, a detail card shows role + one line. A pulse travels one line every ~3.5 s, never two at once. Each agent is a focusable button with an accessible name. Mobile: vertical list, APEX first and larger.
```
                ORACLE           SIGNAL
                    ╲          ╱
        FORGE ───────  ◎ APEX  ─────── CONVERT
                    ╱    │     ╲
              CIPHER     │      LEDGER
                      MERIDIAN
   ┌─────────────────────────────────────────┐
   │ CONVERT · Revenue intelligence           │  ← detail card (focus/hover)
   │ Pipeline analysis and conversion …       │
   └─────────────────────────────────────────┘
```

**Alfred** — one raised panel (`--dusk`, inner hairline, soft shadow, `--r2`). Tabs inside the panel header, one quiet "Sample" tag in the panel's top-right corner. Brief sub-tabs become a compact segmented row inside the briefing tab. Lines reveal once when a tab opens; the feed no longer drips. Tabular numbers.
```
┌─────────────────────────────────────────────────── Sample ┐
│ Morning briefing   Live feed   Voice                       │
│ ───────────────                                            │
│ Briefing · Opportunity · Strategy · Market · Performance   │
│                                                            │
│ You → Alfred, give me my morning briefing.                 │
│ Good morning. Three things matter today …                  │
│                                                            │
│ Agent Alfred   Mode Executive briefing   Generated 06:00   │
└────────────────────────────────────────────────────────────┘
```

**How it works** — four principles as a quiet numbered list on the grid; icons dropped.

**Options** — comparison of four cards. Full System raised (`--slate`), moon hairline border, "Most complete" in moon text. Private Access darker than the page, details folded behind "Details on invitation". Maintenance as a footnote row.
```
┌──────────┐┌──────────┐┌═══════════┐┌──────────┐
│ Design   ││ Agents   ││ Full      ││ Private  │
│ One-time ││ Monthly  ││ System    ││ access   │
│          ││          ││ Most      ││ By       │
│ • …      ││ • …      ││ complete  ││ invitation│
│ • …      ││ • …      ││ • …       ││          │
│ Inquire  ││ Inquire  ││ [Inquire] ││ Details ▸│
└──────────┘└──────────┘└═══════════┘└──────────┘
  Monthly maintenance keeps everything sharp after launch: …
```

**Outcomes + stats** — classified field reports: mono reference ID, document hairlines, redaction bars where detail is withheld; "Projected" stays visible. Stats become a plain tabular row (sparklines removed).

**Missions** — same document style; "Sample mission" visible; reference IDs in mono.

**Architect** — narrow column, 20 px body, signature in Fraunces italic (the only italic body copy).

**Access review** — private room: no glow, thin progress line, one question per screen, large choices (56 px), 200 ms step transitions.

**Footer** — one quiet row on `--night`.

## 4. Check against the brief — revisions

| First idea | Why it read as generic dark-AI | Revision |
|---|---|---|
| Keep the electric blue as accent, add a purple glow | Blue/purple glow is the default AI palette | Indigo is structure only; the accent is a warm moon silver used once per screen |
| Hero: keep the network lines, slow them down | Node-and-line "neural net" backgrounds are the most common AI hero | Stars only, no lines; the network idea belongs to the Agent section, where it means something |
| Agent hub with all lines pulsing | Constant glowing data flow = "AI dashboard" cliché | One pulse at a time, every few seconds; still otherwise |
| Section reveal on scroll (fade-up) | Every template does it | Removed entirely; content is simply there |
| Gradient-text wordmark | Metallic gradient text reads as stock luxury | Solid mist, weight and optical size do the work |
| Glass cards with blur | Glassmorphism is a generated-UI tell and costs paint | Solid surfaces at three depths with one hairline |
| "Most complete" as a pill | Pricing-table SaaS pattern | Text label in moon, emphasis via surface and border |

## 5. Lighthouse per phase (mobile)
Local runs on a compressed static server (`serve`), Lighthouse 12.8.2, simulated slow 4G. Production numbers in the last row.

| Phase | Perf | A11y | Best pr. | SEO | LCP | TBT | CLS | Note |
|---|---|---|---|---|---|---|---|---|
| 1 Palette | 98 | 97 | 100 | 100 | 2.3 s | 10 ms | 0.001 | contrast flags on the old accents and status bar |
| 2 Type | 98 | 97 | 100 | 100 | 2.3 s | 0 ms | 0.003 | status bar label only |
| 3 Structure | 98 | 97 | 100 | 100 | 2.3 s | 0 ms | 0.003 | status bar label only |
| 4 Sections | 98 | 97 | 100 | 100 | 2.3 s | 0 ms | 0.002 | status bar label only |
| 5 Chrome + motion | 97 | 100 | 100 | 100 | 2.4 s | 0 ms | 0.001 | GSAP removed, status bar gone |
| 6 Details | 97 | 100 | 100 | 100 | 2.4 s | 0 ms | 0.001 | 250 dead CSS rules purged (123 → 97 KB) |
| **Production (mobile)** | **98** | **100** | **100** | **100** | **2.2 s** | **0 ms** | **0.001** | nyxsystem.online after deploy |
| **Production (desktop)** | **100** | **100** | **100** | **100** | **0.4 s** | **0 ms** | **0.001** | |
| Before this pass (mobile, prod) | 90–93 | 97 | 100 | 100 | 2.9 s | 0 ms | 0.001 | |

## 6. Final token sheet
`--night #070A12` base · `--dusk #0D1220` raised · `--slate #161D2D` overlay · `--indigo #3C4A86` structure · `--moon #EEE8DC` signal · `--mist #D5D9E3` text-1 · `--text-2 #A5ACBC` · `--text-3 #8189A0`.
Type: wordmark clamp(88–232) · statement clamp(44–96) · h2 clamp(34–60) · h3 26 · lead 20 · body 16 · small 14 · caption 12.
Space: 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 192. Radius: 0 · 2 · 14. Motion: 160 / 200 / 1200 ms; `cubic-bezier(.2,0,0,1)` UI, `cubic-bezier(.16,1,.3,1)` signature, linear for pulses.

---

# Interaction depth pass (2026-11-03)

One idea: **NYX operates quietly, and you are in command.** Blue is the system, pink is you.
Raw material: `design-research/FINDINGS.md`. Contrast: `design-research/contrast.md`. Generator: `design-research/palette.py`.

## 7. Token roles
Components reference roles only. Ramps are OKLCH with even L steps; the three given hex values are kept exact as anchors.

| Role | Token | Hex | Use |
|---|---|---|---|
| surface | surface-0 (anchor) | #02070A | page base, ~90% |
| raised | surface-1 | #051116 | panels, cards |
| overlay | surface-2 | #0A1B22 | modal, command panel input |
| edge | surface-3 | #10272F | hairlines on raised |
| structure | blue-1 | #002078 | resting hub lines, dividers |
| structure-strong | blue-2 | #0038BF | node borders, line hover |
| system | blue-3 (anchor) | #1058FF | pulses, primary button fill, routing. Never text. |
| system-active | blue-4 | #568CFE | active node ring, selected tab, lit link |
| system-text / focus | blue-5 | #92B7FF | blue text, focus ring |
| system-text-hi | blue-6 | #CEDFFE | active agent name |
| text-primary / -secondary / -tertiary | ink-1/2/3 | #EBF5FA / #BCC6CA / #AEB8BC | text (black's hue, low chroma) |
| command | pink-rest (anchor) | #D83995 | the visitor's intent: traveling pulse, chosen command edge, chosen option edge, answered progress |
| command-hover / command-glow | pink-hover / pink-glow | #F152AB / #FA7CBD | hover on a command control; hero cursor glow |
| error | ink-1 + structure-strong edge | | errors are the system's, so they're never pink; the message carries the meaning |

Rules: pink is never text, never on blue, never at rest. The blue anchor is never text, and never the only carrier of a state (APCA Lc 25.7).

## 8. Command loop: states

```
            hover/focus                click/Enter                 preset or typed + send
  REST ───────────────▶ PREVIEW ─────────────────▶ SELECTED ──────────────────────────▶ SENT
  blue pulses every    node ring blue-4,          panel: agent, role,          pink dot: control → APEX (500 ms)
  3.5 s (system works) link lit, role line        3 presets, input             live: "Sent to APEX"
   ▲  ▲                     │ blur                   │ Esc (focus → node)         │
   │  └─────────────────────┘                        ▼                            ▼
   │                                               REST                        ROUTING (waiting)
   │                                                                        APEX → agent blue pulse, repeats
   │                                                                        until reply (median 1.45 s)
   │                                                                        live: "APEX routed to SIGNAL"
   │                        ┌──────────────┬──────────────┬─────────────────┤
   │                        ▼              ▼              ▼                 ▼
   │                   REVEALING        LIMITED (429)   ERROR (5xx)      OFFLINE (no network)
   │                   words in,        API message,    API message,     "No connection."
   │                   ≤ 900 ms         presets stay     Retry button     Retry when online
   │                        ▼
   │                     DONE: reply + "Inquire →" (to access review). live region reads the reply.
   └──── Esc / pick another agent / new command
Reduced motion: no dot, no pulses, no reveal. Same states, same text, instant.
```

Keyboard: arrows move between agents (roving tabindex, APEX first), Enter or Space selects, Esc backs out one level. One polite live region speaks selection, routing, the reply and errors.

## 9. Wireframes

Desktop (≥ 900 px). The panel's size is fixed, and the reply area is reserved for about 800 characters, so nothing shifts.
```
 Eight minds. One operating system.
 ┌──────────────────────── hub map 12:5 ─────────────────────────┐
 │              ORACLE                                           │
 │   FORGE         │          SIGNAL                             │
 │        ╲        │        ╱                                    │
 │ CIPHER ──── [  APEX  ] ──── CONVERT     ● pink dot travels    │
 │        ╱                 ╲               from the chosen      │
 │  MERIDIAN               LEDGER           command up to APEX   │
 └───────────────────────────────────────────────────────────────┘
 ┌─ command panel (raised) ──────────────┬─ reply (reserved 320px) ─┐
 │ SIGNAL · Marketing Operations         │ ┃ You: How would you…    │  ┃ = pink edge
 │ [How would you plan a week…]  ← chips │ APEX routed to SIGNAL…   │
 │ [Where does content usually leak?]    │ reply text…              │
 │ [What do you watch every morning?]    │                          │
 │ [ Or give your own command…   ][Send] │ Inquire →                │
 └───────────────────────────────────────┴──────────────────────────┘
```

Mobile (< 900 px). It's a list with APEX on top, and the command panel sticks to the bottom of the screen while the section is in view, in thumb reach. The reply sheet rises above the panel, absolutely positioned, so no layout shifts.
```
 ┌──────────────────────┐
 │ APEX         CEO     │ ← boxed, first
 │ ORACLE  Research…    │
 │ SIGNAL  Marketing…   │ ← tapped: blue edge
 │ …                    │
 │┌────────────────────┐│
 ││ reply sheet ≤45vh  ││ ← appears after a command
 │├────────────────────┤│
 ││ SIGNAL · Marketing ││ sticky bottom panel
 ││ [chip][chip][chip]→││ chips scroll sideways
 ││ [command…   ][Send]││
 │└────────────────────┘│
 └──────────────────────┘
```

Propagation (after the loop passes):
- Alfred: the visitor's message has a pink edge, and Alfred's working state is blue.
- Options: the chosen tier gets a pink edge.
- Access review: the answered part of the progress line is pink.
- Hero: the cursor glow is pink only while moving over a link or button.

---

# Bold rebuild (2026-11-03)

## 10. The original NYX landing page
I found it in git history, checked out each version into a temp folder and screenshotted it. The screenshots are in `design-review/bold/original/`.
- `7b191b2` is the initial upload.
- `2285a80` adds the crest seal.
- `9e5245a` is the Fraunces landing.
- `f1e5d9e` is the blue version, the last one before the redesign passes. It's the one restored here.

What made it strong:
- **The wordmark as a monument.** NYX is centered, huge and widely tracked: the brand itself is the hero, with no product shot or illustration.
- **The crest seal.** A rotating ring of ticks with a circular legend ("AUTONOMOUS · INTELLIGENCE · SYSTEM · NYX · MMXXVI · WHAT OPERATES IN THE DARK"). Inside it, an eight-point star, one point per agent, and pulse rings breathing outward. It reads as an emblem, not decoration.
- **Atmosphere.** A deep blue nebula with a constellation network, so the page felt like night with something moving in it.
- **Instrument chrome.** HUD corner brackets, an "Intelligence active" status light and an agent status readout. The system is visibly running.
- **The statement.** The two-line serif "The operating system behind elite performance", with the accent phrase in a second voice.

What changed in the restoration:
- **Palette:** rebuilt in the three-color palette.
- **Atmosphere:** the static nebula and particle canvas are replaced by the night-field shader, and the constellation lives in the crest's star.
- **Typography:** sharpened to Fraunces. The wordmark gets a slow blue-to-pink light sweep and a cursor light.
- **Copy:** stays from the later passes (Inquire / See the system). The agent readout is labelled "Sample".
- **Dropped:** the fake coordinates and the "ACCESS.STATUS / CLOSED" readout, for honesty.
- **Crest:** inline SVG so it paints with the first frame. Injected by JS, it became the LCP element at 3.6 s.

## 11. The night field (shader)
- **Setup:** a fixed full-screen quad with a three.js ShaderMaterial (`js/scenes.js`).
- **Noise:** 2D simplex fbm with two levels of domain warp; 4 octaves on desktop, 3 octaves and one warp on small devices.
- **Color:** mixed by noise value: black → deep blue → royal blue, with pink only at peaks above 0.86.
- **Finish:** vignette and grain.
- **Interaction:**
  - the cursor bends the field (Gaussian pull, eased 4% per frame);
  - a click sends a ripple with a pink leading edge and a blue wake (3 slots);
  - scroll drifts the currents and shifts the blue toward violet.
- **Brightness:** follows `data-field` on the section at mid-viewport. Hero 1, System 0.55, Agents 0.5, Options 0.5, Alfred 0.35, Access 0.25, everything else 0.
- **Rendering:** stops when the target is 0, when the tab is hidden or when motion is paused. Internal resolution is 0.6× DPR on desktop and 0.5× on small devices. Reduced motion renders one still frame per section.

## 12. Bold rebuild: checks
| Check | Result |
|---|---|
| Lighthouse mobile (local, gzip, ×2) | 97 / 100 / 100 / 100, FCP 1.7 s, LCP 2.4 s, TBT 0 ms, CLS 0.001 |
| Lighthouse desktop | 100 / 100 / 100 / 100, LCP 0.5 s, CLS 0.013 |
| 4× CPU, headed Chrome, 1440 (full shader) | hero 59.4 fps, Agent Network 59.7 fps, command loop 55.7 fps; INP 72 ms |
| 4× CPU, headed Chrome, 390 (lite shader) | 60 / 60 / 60 fps; INP 72 ms; CLS 0.0003 |
| Text over the live shader (`design-research/field-contrast.mjs`) | 448 visible text elements, 24 screens: 0 below AA |
| axe-core | 0 violations |
| Command-loop states (`design-research/loop.mjs`) | success / limited / error / offline, keyboard, CLS 0, with and without reduced motion |
| Reduced motion | the field renders one still frame; no running animations; 0 px changed over 1.5 s |

- **Contrast tool fixes:** the first runs flagged 42, then 12, elements. All of those were tool artifacts:
  - the off-screen skip link;
  - 1 px borders inside small boxes;
  - gradient text whose clipped gradient survived the glyph hiding;
  - a higher-specificity rule that kept some glyphs visible in the background capture;
  - text covered by the docked command panel or clipped by a closed accordion.

  Each was fixed in the tool, not by changing the page. I confirmed the architect lines by eye.
- **Lighthouse caveat:** Lighthouse's headless Chrome may not run WebGL. The shader starts after `load` plus an idle callback, so it adds nothing before LCP either way.
