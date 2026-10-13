# Surfaces

The card material behind a widget. Each entry is Tailwind classes plus an inline style. Accent-tinted surfaces use `color-mix(in oklab, var(--accent) N%, …)`, so they follow the `accent` prop automatically. `surface="auto"` uses the active skin's surface, or `studio` for `variant="studio"`.

| Surface | Classes | Style |
|---|---|---|
| `solid` | `border border-white/[0.06]` | `{"background":"#141418"}` |
| `glass` | `backdrop-blur-xl border border-white/10` | `{"background":"linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.03))","boxShadow":"inset 0 1px 0 rgba(255,255,255,.08)"}` |
| `outline` | `border border-white/15` | `{"background":"transparent"}` |
| `flat` | `—` | `{"background":"transparent"}` |
| `tinted` | `border` | `{"background":"linear-gradient(155deg, color-mix(in oklab, var(--accent) 22%, #141418), #121215 65%)","borderColor":"color-mix(in oklab, var(--accent) 28%, transparent)"}` |
| `aurora` | `border border-white/[0.07]` | `{"background":"radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, var(--accent) 38%, transparent), transparent 55%), radial-gradient(90% 80% at 100% 100%, color-mix(in oklab, #a78bfa 26%, transparent), transparent 60%), #0f0f13"}` |
| `neon` | `border` | `{"background":"#0a0a0d","borderColor":"color-mix(in oklab, var(--accent) 80%, transparent)","boxShadow":"0 0 22px -6px color-mix(in oklab, var(--accent) 70%, transparent), inset 0 0 22px -12px color-mix(in oklab, var(--accent) 80%, transparent)"}` |
| `holo` | `border border-transparent` | `{"background":"linear-gradient(#121215,#121215) padding-box, conic-gradient(from 210deg, var(--accent), #a78bfa, #f472b6, #fbbf24, var(--accent)) border-box"}` |
| `mesh` | `border border-white/[0.06]` | `{"background":"radial-gradient(rgba(255,255,255,.075) 1px, transparent 1.2px) 0 0/12px 12px, #121215"}` |
| `carbon` | `border border-white/[0.06]` | `{"background":"repeating-linear-gradient(45deg, #17171b 0 5px, #121215 5px 10px)"}` |
| `inset` | `—` | `{"background":"#0e0e11","boxShadow":"inset 0 2px 8px rgba(0,0,0,.7), inset 0 -1px 0 rgba(255,255,255,.05), 0 1px 0 rgba(255,255,255,.04)"}` |
| `tui` | `—` | `{"background":"#0b0b0d"}` |
| `vibrancy` | `backdrop-blur-2xl border border-white/[0.08]` | `{"background":"linear-gradient(180deg, rgba(62,62,68,.66), rgba(38,38,42,.66))","boxShadow":"0 12px 30px -12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.1)"}` |
| `mica` | `border border-white/[0.07]` | `{"background":"radial-gradient(140% 120% at 0% 0%, color-mix(in oklab, var(--accent) 11%, transparent), transparent 60%), #202023","boxShadow":"inset 0 1px 0 rgba(255,255,255,.05)"}` |
| `hud` | `—` | `{"background":"repeating-linear-gradient(90deg, color-mix(in oklab, var(--accent) 8%, transparent) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, color-mix(in oklab, var(--accent) 8%, transparent) 0 1px, transparent 1px 22px), radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%), #07090b","boxShadow":"inset 0 0 0 1px color-mix(in oklab, var(--accent) 20%, transparent)"}` |
| `ios` | `—` | `{"background":"#1c1c1e","boxShadow":"0 1px 0 rgba(255,255,255,.04) inset, 0 18px 40px -18px rgba(0,0,0,.8)"}` |
| `material` | `—` | `{"background":"linear-gradient(color-mix(in oklab, var(--accent) 15%, #1b1b1f), color-mix(in oklab, var(--accent) 15%, #1b1b1f))"}` |
| `synth` | `border` | `{"background":"linear-gradient(to top, rgba(255,79,216,.22) 0 1px, transparent 1px) 0 100%/100% 14px repeat-y, linear-gradient(90deg, rgba(56,232,255,.10) 0 1px, transparent 1px) 0 0/22px 100%, linear-gradient(180deg, #12062a 0%, #2a0b3d 62%, #45104a 100%)","borderColor":"rgba(255,79,216,.35)","boxShadow":"0 0 24px -8px rgba(255,79,216,.55)"}` |
| `brutal` | `border-2` | `{"background":"#121212","borderColor":"#f4f4f5","boxShadow":"5px 5px 0 0 var(--accent)","width":"calc(100% - 6px)","height":"calc(100% - 6px)"}` |
| `cyber` | `—` | `{"background":"linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, transparent) 0 10%, transparent 10%), linear-gradient(#0e0e0b, #0e0e0b)","clipPath":"polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))","boxShadow":"inset 0 0 0 1px color-mix(in oklab, var(--accent) 55%, transparent)"}` |
| `nixie` | `border border-black` | `{"background":"radial-gradient(120% 90% at 50% 0%, rgba(255,138,61,.10), transparent 60%), linear-gradient(180deg, #1a1210, #0c0907)","boxShadow":"inset 0 1px 0 rgba(255,255,255,.06), inset 0 -20px 40px -20px rgba(0,0,0,.9)"}` |
| `instrument` | `border` | `{"background":"#161A20","borderColor":"#29303A"}` |
| `studio` | `border` | `{"background":"linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.022))","borderColor":"rgba(255,255,255,.08)"}` |
| `terminal` | `border font-mono` | `{"background":"repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px), #060807","borderColor":"color-mix(in oklab, var(--accent) 30%, transparent)","textShadow":"0 0 8px color-mix(in oklab, var(--accent) 45%, transparent)"}` |
