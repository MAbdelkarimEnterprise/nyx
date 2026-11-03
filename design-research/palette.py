"""Builds the NYX color system from three fixed anchors and checks every text pair in use.

OKLCH ramps (anchors kept exact), WCAG 2.2 contrast and APCA (W3 0.0.98G) for each pair.
Usage: python3 design-research/palette.py   → prints CSS tokens, writes design-research/contrast.md
"""
import math, pathlib

ANCHORS = {"black": "#02070A", "blue": "#1058FF", "pink": "#D83995"}


# ── sRGB <-> OKLCH ────────────────────────────────────────────────────────
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def gam(c): return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def hex_rgb(h): return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def to_oklch(h):
    r, g, b = map(lin, hex_rgb(h))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def oklch_rgb(L, C, H):
    a, b = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]


def from_oklch(L, C, H):
    """Nearest in-gamut sRGB hex: keep L and H, reduce chroma until it fits."""
    while C > 0 and any(v < -1e-4 or v > 1 + 1e-4 for v in oklch_rgb(L, C, H)):
        C -= 0.002
    return "#" + "".join(f"{round(max(0, min(1, gam(max(0, v)))) * 255):02X}" for v in oklch_rgb(L, max(C, 0), H))


# ── Contrast ──────────────────────────────────────────────────────────────
def wcag(fg, bg):
    Y = lambda h: sum(k * lin(c) for k, c in zip((0.2126, 0.7152, 0.0722), hex_rgb(h)))
    a, b = sorted((Y(fg), Y(bg)), reverse=True)
    return (a + 0.05) / (b + 0.05)


def apca(fg, bg):
    """APCA-W3 0.0.98G-4g. Returns |Lc|."""
    Y = lambda h: sum(k * c ** 2.4 for k, c in zip((0.2126729, 0.7151522, 0.0721750), hex_rgb(h)))
    clamp = lambda y: y + (0.022 - y) ** 1.414 if y < 0.022 else y
    t, b = clamp(Y(fg)), clamp(Y(bg))
    if abs(b - t) < 0.0005: return 0.0
    if b > t:
        s = (b ** 0.56 - t ** 0.57) * 1.14
        return 0.0 if s < 0.1 else (s - 0.027) * 100
    s = (b ** 0.65 - t ** 0.62) * 1.14
    return 0.0 if s > -0.1 else abs((s + 0.027) * 100)


# ── Ramps (anchors exact; even L steps) ───────────────────────────────────
bL, bC, bH = to_oklch(ANCHORS["black"])
uL, uC, uH = to_oklch(ANCHORS["blue"])
pL, pC, pH = to_oklch(ANCHORS["pink"])

T = {}
# Black: 4 surface levels, ΔL 0.045.
for i, name in enumerate(["surface-0", "surface-1", "surface-2", "surface-3"]):
    T[name] = ANCHORS["black"] if i == 0 else from_oklch(bL + 0.045 * i, bC + 0.006 * i, bH)
# Blue: 6 steps, ΔL ≈ 0.11, anchor at step 3.
for i, L in enumerate([uL - 0.24, uL - 0.12, uL, uL + 0.12, uL + 0.24, uL + 0.36], start=1):
    T[f"blue-{i}"] = ANCHORS["blue"] if i == 3 else from_oklch(L, uC * (0.7 if L > uL + 0.3 else 1), uH)
# Pink: rest (anchor), hover, glow; ΔL 0.07.
T["pink-rest"], T["pink-hover"], T["pink-glow"] = ANCHORS["pink"], from_oklch(pL + 0.07, pC, pH), from_oklch(pL + 0.14, pC * 0.8, pH)
# Ink: text neutrals on the black anchor's hue, so text sits in the same night.
for name, L in [("ink-1", 0.965), ("ink-2", 0.82), ("ink-3", 0.775)]:
    T[name] = from_oklch(L, 0.012, bH)

ROLES = {
    "surface": "surface-0", "raised": "surface-1", "overlay": "surface-2", "edge": "surface-3",
    "structure": "blue-1", "structure-strong": "blue-2", "system": "blue-3", "system-active": "blue-4",
    "system-text": "blue-5", "system-text-hi": "blue-6",
    "text-primary": "ink-1", "text-secondary": "ink-2", "text-tertiary": "ink-3",
    "command": "pink-rest", "command-hover": "pink-hover", "command-glow": "pink-glow",
    "focus": "blue-5", "error": "ink-1",
}

# Every text/surface (and non-text UI) pair actually used on the page.
# kind: body ≥ 4.5:1 & Lc 75 · small ≥ 4.5:1 & Lc 60 · large ≥ 3:1 & Lc 45 · ui (non-text) ≥ 3:1 & Lc 30
PAIRS = [(fg, bg, "body") for fg in ("text-primary",) for bg in ("surface", "raised", "overlay")]
PAIRS += [(fg, bg, "small") for fg in ("text-secondary", "text-tertiary", "system-text") for bg in ("surface", "raised", "overlay")]
PAIRS += [("text-primary", "system", "small"),          # label on a primary (blue) button
          ("text-primary", "structure-strong", "small"),   # primary button label on hover
          ("system-text-hi", "surface", "small"),      # active agent name
          ("system-active", "surface", "ui"), ("system-active", "raised", "ui"),   # active node ring, selected tab
          ("system", "surface", "ui"), ("system", "raised", "ui"),   # anchor fills and pulses: never the only carrier
          ("command", "surface", "ui"), ("command", "raised", "ui"),     # pink edge, pulse, progress
          ("focus", "surface", "ui"), ("focus", "raised", "ui"),
          ("structure-strong", "surface", "ui")]       # decorative lines: reported, not required
NEED = {"body": (4.5, 75), "small": (4.5, 60), "large": (3.0, 45), "ui": (3.0, 30)}
INFO_ONLY = {("structure-strong", "surface", "ui"), ("system", "surface", "ui"), ("system", "raised", "ui")}

if __name__ == "__main__":
    css = "\n".join(f"  --{k}:{v};" for k, v in T.items())
    roles = "\n".join(f"  --{r}:var(--{t});" for r, t in ROLES.items())
    print(":root{\n" + css + "\n" + roles + "\n}")
    rows, fails = [], 0
    for fg, bg, kind in PAIRS:
        f, b = T[ROLES[fg]], T[ROLES[bg]]
        w, lc = wcag(f, b), apca(f, b)
        ok = w >= NEED[kind][0] and lc >= NEED[kind][1]
        info = (fg, bg, kind) in INFO_ONLY
        fails += 0 if ok or info else 1
        rows.append(f"| `{fg}` {f} | `{bg}` {b} | {kind} | {w:.2f}:1 | {lc:.1f} | {'info' if info else 'pass' if ok else '**FAIL**'} |")
    # Pairs the brief forbids, shown for the record.
    bad = [f"| pink on blue | {wcag(ANCHORS['pink'], ANCHORS['blue']):.2f}:1 | {apca(ANCHORS['pink'], ANCHORS['blue']):.1f} | never used |",
           f"| blue on pink | {wcag(ANCHORS['blue'], ANCHORS['pink']):.2f}:1 | {apca(ANCHORS['blue'], ANCHORS['pink']):.1f} | never used |",
           f"| blue (anchor) as text on black | {wcag(ANCHORS['blue'], ANCHORS['black']):.2f}:1 | {apca(ANCHORS['blue'], ANCHORS['black']):.1f} | APCA fails even large (Lc 45), so the anchor is fill/stroke only; text uses `system-text` |",
           f"| pink text on black (anchor) | {wcag(ANCHORS['pink'], ANCHORS['black']):.2f}:1 | {apca(ANCHORS['pink'], ANCHORS['black']):.1f} | AA passes, APCA body fails, so pink is never text |"]
    anchors = "\n".join(f"| {k} | {v} | oklch({to_oklch(v)[0]:.3f} {to_oklch(v)[1]:.3f} {to_oklch(v)[2]:.1f}) |" for k, v in ANCHORS.items())
    md = f"""# Contrast: every text/surface pair in use

Generated by `palette.py`. Thresholds: body text needs WCAG 4.5:1 and APCA Lc 75. Small and secondary text needs 4.5:1 and Lc 60.
Large text needs 3:1 and Lc 45. Non-text UI (rings, edges, pulses, focus) needs 3:1 and Lc 30.\n`info` rows are reported only: the blue anchor (Lc 25.7) is never the only carrier of a state. The active ring, focus and text use the lighter steps.

## Anchors
| Color | Hex | OKLCH |
|---|---|---|
{anchors}

## Pairs in use
| Foreground | Background | Use | WCAG 2.2 | APCA Lc | Result |
|---|---|---|---|---|---|
{chr(10).join(rows)}

**{fails} failures.**

## Pairs checked and kept out
| Pair | WCAG | APCA Lc | Rule |
|---|---|---|---|
{chr(10).join(bad)}
"""
    pathlib.Path(__file__).with_name("contrast.md").write_text(md)
    print(f"\n{fails} failures")
