"""Exports the NYX tokens as a shadcn theme for `21st publish-theme`.

`.dark` is the site as shipped. `:root` (light) keeps every hue and chroma and mirrors
lightness in OKLCH, so the theme stays on-brand where a light mode is forced.
Usage: cd design-research && python3 theme.py   → writes nyx-theme.css, prints contrast failures
"""
import pathlib
import palette as P

T, R = P.T, P.ROLES
role = lambda r: T[R[r]]
def at(h, L):
    """Same hue and chroma as `h`, at lightness L."""
    _, c, hue = P.to_oklch(h)
    return P.from_oklch(L, c, hue)

dark = {
    "background": role("surface"), "foreground": role("text-primary"),
    "card": role("raised"), "card-foreground": role("text-primary"),
    "popover": role("overlay"), "popover-foreground": role("text-primary"),
    "primary": role("system"), "primary-foreground": role("text-primary"),
    "secondary": role("overlay"), "secondary-foreground": role("text-secondary"),
    "muted": role("edge"), "muted-foreground": role("text-tertiary"),
    "accent": at(role("command"), 0.32), "accent-foreground": role("text-primary"),   # pink hue as a hover surface: pink is never text and never under text at full strength
    "destructive": role("structure-strong"), "destructive-foreground": role("text-primary"),   # errors are the system's: blue edge, never red
    "border": role("edge"), "input": role("overlay"), "ring": role("focus"),
    "chart-1": T["blue-3"], "chart-2": T["pink-rest"], "chart-3": T["blue-4"], "chart-4": T["blue-5"], "chart-5": T["blue-2"],
    "sidebar": role("raised"), "sidebar-foreground": role("text-primary"),
    "sidebar-primary": role("system"), "sidebar-primary-foreground": role("text-primary"),
    "sidebar-accent": role("overlay"), "sidebar-accent-foreground": role("text-secondary"),
    "sidebar-border": role("edge"), "sidebar-ring": role("focus"),
}
light = dict(dark, **{
    "background": at(role("surface"), 0.99), "foreground": at(role("text-primary"), 0.20),
    "card": at(role("raised"), 0.975), "card-foreground": at(role("text-primary"), 0.20),
    "popover": at(role("surface"), 1.0), "popover-foreground": at(role("text-primary"), 0.20),
    "accent": at(role("command"), 0.93), "accent-foreground": at(role("text-primary"), 0.20),
    "secondary": at(role("overlay"), 0.95), "secondary-foreground": at(role("text-secondary"), 0.36),
    "muted": at(role("edge"), 0.93), "muted-foreground": at(role("text-tertiary"), 0.42),
    "border": at(role("edge"), 0.88), "input": at(role("overlay"), 0.96), "ring": role("system"),
    "sidebar": at(role("raised"), 0.975), "sidebar-foreground": at(role("text-primary"), 0.20),
    "sidebar-accent": at(role("overlay"), 0.95), "sidebar-accent-foreground": at(role("text-secondary"), 0.36),
    "sidebar-border": at(role("edge"), 0.88), "sidebar-ring": role("system"),
})

PAIRS = [("foreground", "background"), ("card-foreground", "card"), ("popover-foreground", "popover"),
         ("primary-foreground", "primary"), ("secondary-foreground", "secondary"), ("muted-foreground", "muted"),
         ("accent-foreground", "accent"), ("destructive-foreground", "destructive"), ("sidebar-foreground", "sidebar")]

def block(sel, t):
    return sel + " {\n" + "".join(f"  --{k}: {v};\n" for k, v in t.items()) + "  --radius: 0.125rem;\n}\n"

if __name__ == "__main__":
    pathlib.Path(__file__).with_name("nyx-theme.css").write_text(block(":root", light) + block(".dark", dark))
    fails = 0
    for name, t in (("light", light), ("dark", dark)):
        for fg, bg in PAIRS:
            w = P.wcag(t[fg], t[bg])
            if w < 4.5:
                fails += 1
                print(f"FAIL {name}: {fg} on {bg} = {w:.2f}:1")
    print(f"nyx-theme.css written, {fails} pairs under 4.5:1")
