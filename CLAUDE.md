# InfoPanel Dashboard

React 19 + Vite + Tailwind 4 + @base-ui/react + lucide-react. Tests: Vitest (`npm test`);
`npm run build` runs `tsc -b` then Vite. No linter, no state library (the config is one
`DashboardConfig` in `src/App.tsx`, history in `src/hooks/use-config-history.ts`).

## Studio redesign

The spec is in `docs/redesign/`. Read `README.md` → `DATA_MODEL.md` → `FEATURE_MAP.md` →
`IMPLEMENTATION_PLAN.md`. The prototype is `docs/redesign/reference/Studio A.dc.html`.

- When sources disagree: for **behaviour**, `reference/design-overview.md` and `DATA_MODEL.md`
  win; for **look and placement**, `README.md` and the prototype win. The prototype is a
  reference — do not copy its code.
- **No feature loss.** Every row in `FEATURE_MAP.md` must survive. When you remove an old
  component, list in the commit message where each of its features now lives.
- **Backward compatibility.** Existing configs (dashboard, profiles, zones, panels, presets)
  load and render unchanged. Never rename a setting key or change a default without a migration.
- **Model:** dashboard → profile → zone (widget / panel / blank). Widget minimum sizes are
  enforced everywhere.
- **Styling:** effective value = widget value (only when Custom and Force global is off) ??
  profile style ?? dashboard style ?? default. Follow keeps the widget's own values stored but
  ignored. Source dots reflect this resolution (`src/lib/style-resolve.ts`).
- **Inspector:** one registry drives it (module `settings` + general + panel + panel-widget
  kinds + dashboard). Do not hard-code per-widget panels.
- **Chrome vs theme:** studio chrome uses the `--ui-*` tokens; the dashboard theme only
  colours widgets on the canvas and the kiosk page.
- **Live data:** reuse `src/lib/sensor-store.ts` streams; never open an EventSource per row.
- **Undo:** one drag, one panel JSON apply, one appearance preset = one undo step each.
- **Keyboard:** shortcuts never fire while focus is in an input, select or textarea.
- **Save:** the studio auto-pushes to the server; the Save button flushes, and its dot means
  "edits not pushed yet".
- Work phase by phase; the app builds and tests pass at the end of each phase.
