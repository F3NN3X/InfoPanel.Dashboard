# Brief 9.4b: post-port fixes + Other sensors

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. Read
`docs/redesign/phase9/review-ledger.md` (rows referenced below), `docs/redesign/PHASE9_PLAN.md` §3,
`src/widgets/module.tsx`, `src/widgets/data-adapter.ts`. Verify with `npm run typecheck` (project
script only) and `npm test`, exit codes read directly. One commit per item. No trailers.

1. **#21 empty zones** — `fix: hide template zones with no data, like before`. A template module's
   render returns `null` when no sensor key exists under any of its prefixes/reads (same rule the
   legacy modules used: `hasData = content != null`, so the kiosk hides the zone and the studio shows
   "no live data yet"). Modules whose data doesn't come from sensor keys (Wave Link via
   `lib/wavelink.ts`, WebPage, Clock if it has a local fallback — check each) keep rendering. Test it
   through `placementContent` (`hasData` false with an empty map, true with fixture data) for every
   registered module, with an explicit allow-list of the always-render ones.
2. **#22 sensor names** — `feat: give widgets the sensors' display names`. Keep the flat `data` map
   unchanged; add a `names` lookup built from `SensorValue.name` (memoised with the flat map) passed to
   templates (prop `names?: Record<string,string>` on `ShellProps`, plus a kit helper
   `sensorLabel(key, names, fallback)`). Use it where labels are derived from keys today: Hardware /
   SensorGroup auto-discovery, Thermals, SystemOverview drive/device names (#29), Bluetooth device
   matching (#26 — match on names the way the legacy module did), NowPlaying "loudest live device"
   fallback matching a sensor named "Level" (#30). Tests per consumer with fixture names.
3. **#28 System colours** — `fix: keep today's System colours by default`. The systemmodern alias
   passes the legacy default device colours (read them from `git show 6513067:src/components/ModernSystem.tsx`
   or wherever the defaults lived) when the stored colour is unset; the SystemOverview template keeps
   its own palette. Test both.
4. **#20 Spark id** — `fix: stable gradient ids in Spark` with `useId()`.
5. **Other sensors** — `refactor: render Other sensors through the widget shell`. The `cards` zone
   (`CARDS_ID`, `placementContent` + `src/modules/fallback.tsx` `GenericCard`) renders each unclaimed
   sensor as a `SensorValue` template in a `<Widget>` (theme surface default as today, `CARD_SETTINGS`
   honoured, same sub-grid column rule), so skins/variants apply. Keep the catch-all claim rule
   unchanged. Delete `GenericCard`/`StyledCard` only if nothing else uses them. Tests: render with
   fixture unclaimed keys, settings honoured.

Report in ≤12 lines: commit hashes, anything approximated.
