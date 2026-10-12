# Widgets: standing rules for Claude Code

Read `widgets/docs/CLAUDE_CODE.md` first (implementation guide, Phase 9). Then use `widgets/docs/README.md` as the index to architecture, tokens, skins, variants and the per-widget specs.

Rules (details are in CLAUDE_CODE.md §4):
- Every widget renders inside `<Widget {...shell(p)}>`. Never style the root yourself.
- Accent comes only from `--accent`. Derive secondary colours with `hue(deg)`; fixed colours come only from `STATE`.
- Numerals use `<Num>` or `numFont(useSkin())`. Fonts come from the skin.
- Hooks are unconditional. Graphed values go through `useHistory`.
- Canvases: one rAF loop, paused off-screen, fed through a ref.
- Fit to the zone. Never overflow; take row counts from the inner height.
- One file per widget (`<Id>.jsx`) and one per skin (`core/skins/<name>.js`). Keep `meta` up to date.
- `widgets/_preview/` and the demo data on the overview page are reference-only. Never ship them.
- Existing configs must render unchanged. New look settings default to `auto` / `default`.
