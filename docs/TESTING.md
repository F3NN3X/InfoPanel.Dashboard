# Testing

The suite guards what breaks the app or loses a user's data, and nothing else. In this repo that overrides any general coverage target, 80% included.

What counts as critical:
- config and profile load, save and migrations (every version keeps a round-trip case and its edge cases);
- schema validation of saved widget and panel data;
- server API routes, request guards, path safety and the updater manifest;
- InfoPanel import parsing, with the corpus round-trips;
- the settings and update model, and the changelog parse;
- the sensor data pipeline and the value formatting that feeds widgets;
- every registered widget kind rendering without throwing, once per kind;
- Help's content check, and Library remove and loose-file safety (never delete a used file).

Add a test when a change touches one of those or fixes a regression. Don't test copy, labels, styling or trivia.

- One case per behaviour, plus its boundaries. No size x variant x skin matrix sweeps; use a table only where each row hits a different branch.
- happy-dom only when the test needs a DOM.
- Tests live in `tests/`, mirroring `src/` and `tools/` (`src/lib/foo.ts` is tested by `tests/lib/foo.test.ts`).
- `npm test` stays under about 10 s locally.
- Rust tests live in their modules (`#[cfg(test)]`) and run in CI with `cargo test`. The server (`ips-server`) has its
  own: unit tests in its modules, route tests over a real socket (`crates/ips-server/tests/routes*.rs`) and parity tests
  (`tests/parity*.rs`) that read the frozen Node-server cases in `tests/fixtures/parity/` and are never regenerated.
  `ips-agent` has unit tests and a forwarder test over a real socket.
- `tests/server/` is the HTTP-level server suite. `npm run test:server` builds `ips-server` and runs it against that
  binary (`SERVER_CMD` overrides the debug build); a plain `npm test` leaves it out because it needs the binary.
- The Playwright e2e specs (`tests/e2e/`, `npm run test:e2e`) cover what only a real browser and server show: the
  kiosk rendering, live updates over SSE, the studio's save and undo, the proxy and request-guard rules over HTTP, and
  the deterministic budgets. Keep them few. The "writes from another machine" request-guard case listens on the network,
  which makes Windows Firewall prompt for every new `ips-server` build path, so it runs in CI and locally only with
  `VERIFY_LAN=1`. Perf specs (`tests/perf/`, `tests/desktop/`) measure and never gate.

The Edit v3 fixtures (`?fixture=one-editor/<name>`, `src/dev/fixtures`) open the reference's seven states in dev builds and in
`vite build --mode fixtures`, never in a release build. `tests/visual/one-editor/` opens each in Edit (`npm run test:one-editor`, the
`one-editor` check); each reference checklist line is a skipped test naming the phase that enables it, and that phase turns it on.

The HWiNFO names fixture (`tests/fixtures/hwinfo-names.json`) holds the reading names and units seen in public HWiNFO CSV logs and a live Data API;
`tests/lib/hwinfo-names.test.ts` checks the alias rules against it. Refresh by hand with `node tools/hwinfo-names.mjs --github --live`
(needs `gh` and takes minutes; `--live` needs InfoPanel running with HWiNFO readings), and CI only runs the test.

## The InfoPanel import corpus

- The corpus tests that need `lab/infopanel/corpus` (`idempotent.test.ts`, `corpus.test.ts`) run in
  `npm run lab:test` and skip where it is absent.

## The overflow runner

`overflow` (`node tools/qa/overflow.mjs`) opens the Widget QA page (`?widget-qa`, a scratch server with `DASHBOARD_DEBUG=1` on
the seeded demo data, clock and zone fixed) at 1x1, 2x2, 4x2 and 4x4 and records, per widget and span, the card and body
rects, the descendant count, the text and the probe's issues (`window.__qaOverflow`, `src/widgets/widget-qa/probe.ts`).
`--baseline <file>` diffs against an earlier run and exits 1 on a new issue anywhere, or on any other change at a span that
is not roomy (4x4 is: its changes are listed, not failing). `--save <file>` writes a run.

- The check diffs against `tests/qa/overflow-baseline.json`. A change that moves a widget on purpose fails until the baseline
  is refreshed (`node tools/qa/overflow.mjs --save tests/qa/overflow-baseline.json`, after `npm run build`) in the same
  change, and the diff it printed is what the change description explains.
- It needs `npm run build` and the debug `ips-server` (the map's `needs`), and runs on every platform in `verify:full` and on
  the widget features. `--module a,b` and `--spans` narrow a run for a look at one widget; with `--baseline` only those
  frames are compared.
- The probe walks elements, so it cannot see pseudo-elements (`::before`, `::after`).

## The look baselines

`look-visual` (`tests/visual/look/classic.spec.ts`, Playwright project `look-visual`) renders the Classic look, today's default
skin, for every widget kind on the Widget QA page at 1x1, 2x2, 4x2 and 4x4 on the `glass` and `matte-light` materials, and
compares each with a committed image in `tests/visual/look/baselines/` (`<material>-<Widget>.png`, a kind's four frames side
by side; 138 images, about 5 MB). Tolerance: `maxDiffPixelRatio` 0.002, `threshold` 0.2. The page runs with a fixed clock and
zone and reduced motion, so a frame is the same on each run (checked over repeated runs).

- Windows only, in `verify:full` only, never in CI: the images carry this machine's text rendering. On other platforms,
  and wherever `CI` is set (the map's `localOnly` field, so also the nightly's Windows job), `verify` reports it NOT RUN
  (exit 3), like `cargo-app`; a local Windows `verify:full` runs it. It needs `npm run build` and the debug `ips-server`.
- A diff is a real change on screen. An intended one refreshes the images in the same change
  (`npx playwright test --project=look-visual --update-snapshots`), and the change description says why the new pixels are right.
  The report, with expected, actual and diff images, is in `.cache/playwright/`.

## User pack CSS

`measurePack` (`src/looks/pack-render-measures.ts`) is the one reader of what a worn pack hides: `pack-visibility` and `pack-selectors`
hand it to `page.evaluate` for the built-ins, and the studio's render check runs it in its hidden frame (`tests/e2e/user-pack-css.spec.ts`
on a release build, debug off). It names nothing outside its own body, because it is sent to the browser as source text. `renderRefusals`,
the verdict, is pure and is tested in `tests/looks/pack-render-check.dom.test.ts`, the grammar in `tests/looks/user-css.test.ts`, the
signature in `pack_sign.rs` and `crates/ips-server/tests/routes_packs.rs`.

## Quarantine

A test that flakes and cannot be fixed at once goes into `tests/quarantine.json` instead of being skipped, loosened or deleted:

```json
{ "tests/lib/foo.test.ts": { "issue": 301, "owner": "F3NN3X", "until": "2026-12-01" } }
```

- The key is the test file (Vitest `*.test.*`, or a Playwright spec of the `e2e` or `one-editor` project); `issue` is the tracking
  issue (labelled `flaky`, with the failing run, owner and deadline), `owner` a name and `until` a `YYYY-MM-DD` date.
  `tests/tools/ci-quarantine.test.mjs` fails the suite on an entry without an issue or owner, with a bad or past date, or whose file is gone,
  so the list cannot become a graveyard. It is empty today.
- `vite.config.ts` and `playwright.config.ts` leave the listed files out of every gating run (`npm test`, `unit`, `e2e`, the nightly's
  `verify --full`). `QUARANTINE=only` runs just them.
- They keep running in the advisory `quarantine` check (`node tools/ci/quarantine.mjs run`): in `verify --full`, so the nightly, and in a
  `quarantine` CI job that exists only while the list is not empty, is not in `ci-ok`'s `needs` and has `continue-on-error`. It prints
  whether they pass now and always exits 0. A fixed test leaves the list.
- Never make the `quarantine` job or the nightly required.

## The new-test gate

A test file added or changed on the branch has to pass repeated runs before it counts as proven (`tools/ci/flake-gate.mjs`):

- Vitest files (`flake-unit`): 10 runs, each shuffling files and tests with a fresh `--sequence.seed`, `--maxWorkers=4`. Not
  `tests/server` (it needs the binary).
- Playwright specs (`flake-e2e`): `--repeat-each 3` on half the cores (`--workers` 1 to 4, so 2 on a 4 vCPU runner), per project (`e2e`, `one-editor`).
  Four workers on four vCPUs starved the whole-page measure specs past their 30 s limit; a spec that is slow but right under load gets a
  longer `test.setTimeout` with its reason, never a looser assertion.
- Both are `verify` checks that take the changed test files (committed since the merge base, staged, unstaged, untracked) and skip when
  there are none; `verify:full` runs them over the same set. A quarantined file is exempt. CI runs them from the plan: `flake-unit` is its own
  job and `flake-e2e` another (both in `ci-ok`), so neither shares time or CPU with the `e2e` job. `look-visual`, perf and desktop specs are not repeated.
- A failure means the test is not stable: fix it, or quarantine it with an issue, an owner and a deadline.

## The feature map and `verify`

`tests/feature-map.json` maps every tracked file to a feature, and each feature to the tests and checks that cover it.
`tests/feature-map.test.ts` fails when a file or a glob is unmapped, and says what to add. A new source file or test file goes into the map in the same change.

- `npm run verify` works out the changed files (commits since the merge base with `origin/main`, staged, unstaged,
  untracked), finds their features and runs the checks those features need, fast to slow: lint (changed files), typecheck,
  unit, build, budgets, settings build, server build and suite, lab, e2e, `cargo-server`, then `cargo-app` (after
  `tools/ci-stub-desktop.mjs`). actionlint runs after lint when a workflow changed. The unit step runs the
  features' tests plus the tests that import a changed source file (`vitest related`), in one call.
- `--fast` runs only the features' own tests. `--full` (or `npm run verify:full`) runs every check. A change to the map,
  to `tools/verify*` or to the dependencies runs everything.
- A manifest changed in its version fields only (`package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`: a release bump,
  decided by content in `tools/verify/release.mjs`) goes to the `release-version` feature instead of its usual ones: it runs
  `cargo-server` (which builds with the lock) and neither `full` nor e2e. Any other change in those files escalates as before.
- `--plan` prints the plan and runs nothing. `--feature a,b` runs those features' checks. `--where <path>` prints a
  file's features and test globs, to decide where a new test goes. `--json` makes the plan and summary machine-readable.
- Exit codes: 0 passed, 1 a check failed, 2 usage error or an unmapped file, 3 a needed check could not run on this
  platform (`cargo-app` needs Windows), 4 only from `--check-fresh` (stale). `--allow-incomplete` turns 3 into 0.
- Each run writes `.cache/verify/last.json` (commit, a hash of the changed content, per-check results).
  `--check-fresh` compares it with the tree now: `fresh-pass` (exit 0), `fresh-fail` (1), `stale` (4).
- The browser checks in CI follow the plan: `e2e`, `one-editor` and `overflow` run on a pull request when `verify` plans them for the changed
  files (`tools/ci/plan-outputs.mjs` hands the planned commands to the `e2e` job); the label `ci:e2e` runs them whole.
- Report-only work (perf specs, `audit:views`) is listed under `report` in the map and never gates.
