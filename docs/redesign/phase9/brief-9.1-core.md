# Brief 9.1: widget core (no UI change)

Repo: `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. React 19, Vite, Tailwind 4,
TypeScript strict (`noUnusedLocals`), Vitest in node env (no jsdom; `react-dom/server` is available).
Run `npm run typecheck` and `npm test` (never bare `npx tsc` — it picks a different TS). No linter.

Read first: `CLAUDE.md`, `docs/redesign/PHASE9_PLAN.md` (§3 decisions 4–8, §4 step 9.1),
`docs/redesign/phase9/gaps.md` (standard settings table), `docs/redesign/widgets/CLAUDE.md`,
`docs/redesign/widgets/docs/{ARCHITECTURE,DESIGN_TOKENS,SKINS,SURFACES,VARIANTS,PRIMITIVES}.md`.
Source to port: `docs/redesign/widgets/core/**` and `docs/redesign/widgets/kit.jsx`.

## Deliverables
1. `src/widgets/core/` in TypeScript: `data.ts`, `layout.ts`, `tokens.ts`, `surfaces.ts`,
   `skins/<name>.ts` (14, one file each), `theme.ts`, `primitives.tsx`, `views.tsx`, `Widget.tsx`;
   `src/widgets/kit.ts` barrel. Keep the dependency order of ARCHITECTURE.md. Types from
   CLAUDE_CODE §6 (`docs/redesign/widgets/docs/CLAUDE_CODE.md`) in `src/widgets/core/types.ts`.
   Port logic, don't redesign. Drop `useInfoPanel` (the app has its own data store; 9.2 adds the
   adapter) but keep `imageUrl` only if used.
2. **STATE / TONES merge**: one semantic set `STATE = { ok, warn, crit, none }` (`#3CC97F #EDB232
   #F2665E`). `TONES` stays as the tone→colour map but takes warn/crit from `STATE` (ok stays
   `var(--accent)`, muted `#71717a`).
3. **Surfaces** (decision 4): the registry contains the template surfaces **except** the template's
   `glass`, plus today's materials under their stored names `glass`, `matte-light`, `matte-dark`,
   `theme`, built by reusing `makeSurface` / helpers in `src/components/surfaces.ts` (read it and its
   tests; do not duplicate logic, do not change its behaviour — existing tests must stay green). Each
   registry entry also declares `tone: 'dark' | 'light' | 'theme'` for decision 5. `auto` resolves to
   the skin's surface (or `studio` for the studio variant). Default when unset: `glass`.
4. **Text colour variables** (decision 5): the shell sets `--w-fg`, `--w-muted`, `--w-faint`,
   `--w-track` on its root from the surface tone (dark: zinc-100 / zinc-400 / zinc-500 /
   `rgba(255,255,255,.07)`; light: near-black equivalents; theme: from the theme tokens
   `--card-foreground` / `--muted-foreground`). Replace hard-coded zinc / grey text and track
   colours in `views.tsx`, `primitives.tsx` and `Widget.tsx` with these variables (Tailwind arbitrary
   values like `text-[color:var(--w-fg)]`). `textColor` / `mutedColor` look keys override them.
5. **Icon**: `Icon({ name, className, fill })` keeps the Material Symbols `name` prop and renders a
   lucide icon through a name map in `src/widgets/core/icons.ts`. Cover every name below plus every
   name `weatherIcon()` returns; closest match where lucide has no equivalent; unknown → a neutral
   fallback. Names used by templates: account_circle album bolt calendar_month calendar_today dashboard
   developer_board device_thermostat donut_large equalizer graphic_eq grid_on group hard_drive
   health_and_safety health_metrics image lan library_books list_alt location_on lock_open memory
   memory_alt mic mic_off mode_fan monitor_heart more_horiz music_note newspaper partly_cloudy_day person
   public query_stats schedule sensors south speed sports_esports stacked_bar_chart stadia_controller
   swap_horiz swap_vert timeline timer trophy tune videogame_asset view_list view_week vital_signs.
   Also accept the 18 lowercase `WIDGET_ICONS` names from `src/lib/widget-icons.ts` (the legacy
   `icon` setting) so a stored icon can override the header icon.
6. **Fonts**: add the skin families to `FONT_CATALOG` in `src/lib/fonts.ts` as **new ids only**
   (existing ids must not change; `ibm-plex-sans`, `orbitron`, `space-grotesk`, `jetbrains-mono`
   already exist — reuse them): Geist Mono, IBM Plex Mono, Archivo, VT323, Instrument Serif, Roboto
   Flex, Chakra Petch, Nixie One. Skin packs list catalog ids. `ensureSkinFonts(skin)` in
   `src/widgets/core/fonts.ts` calls `ensureFont` for each, idempotent, no-op in node.
7. **Shell applies the standard look** (decision 7). `Widget` gains a `look?: ModuleSettings` prop
   (the zone's resolved settings; see `src/modules/standard-settings.ts`) and an `iconOverride`.
   Apply, reusing `chromeVars`, `surfaceBox`, `tokenScope`, `zoomFor` etc. from
   `src/components/widget-style.ts` / `modern-chrome.tsx` (read them; reuse, don't fork):
   border/glow/opacity/blur over any surface; background image (`background` + `backgroundOn`);
   `textColor`/`mutedColor`; `font` (overrides skin font) / `fontWeight`; `labelCase` (header and
   studio labels); `padding`/`gap` override tier padding when set (not `auto`/empty); `stroke`
   multiplies `skin.ring` and graph stroke width (expose via skin context); `customCss` scoped as
   ModernChrome scopes it; `label` → title; `icon` → header icon; `scale` ≠ 100 → CSS zoom with the
   tier/shape measured on the zoomed box; `layout` card/standard/compact/simple forces tier
   lg/md/sm/xs, auto = measured. Accent precedence (decision 6): explicit resolved accent wins over a
   skin's accent; skin accent only when accent is unset/empty.
   Keep the template behaviour when `look` is absent.
8. **Hooks**: every hook unconditional (React rules). Canvas primitives (`MiniViz`): one rAF loop,
   paused off-screen (IntersectionObserver, guarded when undefined) and when `document.hidden`.
9. **Dev page** `?widget-qa`: lazy-loaded from `src/main.tsx` exactly like `?ui-preview`. For now it
   renders the shell with a stub body plus `StudioView`/`CompactView` samples for each skin, using
   `src/widgets/__fixtures__/snapshot.json` values. Never reachable from the kiosk path otherwise.
   (Real widgets are added in 9.3.)

## Tests (`*.test.ts`, node)
- `tierOf` / `shapeOf` boundaries; `pickBy`; `useHistory` easing logic extracted as a pure function.
- `rampColor`, `heat`, `tone`, `mix`, `hue`.
- Surface registry: legacy names present with today's output (compare against `makeSurface`), template
  `glass` not overriding ours, every skin's surface resolvable, every surface has a tone.
- Text variables per tone; `textColor`/`mutedColor` override.
- Accent precedence; `layout` → forced tier; padding override; stroke factor.
- Icon map covers every listed name and every `weatherIcon` output; unknown → fallback.
- `ensureSkinFonts` maps every skin font to a catalog id (no unknown ids); existing catalog ids unchanged.
- Smoke: `renderToString(<Widget …>)` for each skin × variant (`default`, `studio`) × forced size
  (`xs`…`lg`) with a compact + studio descriptor and a function child — no throw.

## Constraints
- Don't touch existing modules' rendering; nothing user-visible changes in this step.
- No new npm dependencies. No `console.log`. Files under ~800 lines; split `primitives.tsx` if needed.
- One commit at the end: `feat: add the widget library core` with a body listing what was merged
  (STATE/TONES), the surface naming decision and the shell look mapping. No Co-Authored-By trailer.
- Verify before committing: `npm run typecheck` exit 0 and `npm test` exit 0 (read exit codes directly).
- Report back in ≤15 lines: files added/changed, test counts, any decision you had to make, anything
  left undone.
