# Widget QA harness

The oracle page for 9.4 and 9.8: the template widgets at a set of spans, rendered through the
kiosk's `placementContent` from fixture sensors (`src/widgets/__fixtures__/snapshot.json` plus
`extra.json`, extra wins). The code is in `src/widgets/widget-qa/`.

## Open it

`npm run dev`, then `http://localhost:5173/?widget-qa` (use the port Vite prints). The page has a
sticky toolbar (skin, variant, surface, graph, meter, accent, radius, cell, gap, spans, page theme,
data, a filter box, Reset), a category nav with counts, and one section per widget: an info column
(title, id, category, min size, description, data prefixes, a collapsible settings list) and the span
frames, each captioned `CxR` plus its pixel size. A span below the widget's minimum is a dimmed
"below min" placeholder. Widgets are grouped by category in the studio Library's order, sorted by title.
Every control applies live and mirrors itself to the URL, so a loaded URL reproduces the view.

Two collapsed galleries at the top show one widget under every skin (CpuMonitor 3x2) and every
surface (SystemStatus 2x2). Gallery figures carry `data-qa-gallery`, not `data-qa-module`, so
`__qaOverflow` and the sweeps never see them.

By default only the template widgets show. `module=<ids>` renders exactly those ids.

Params, all optional:

| param | meaning |
| --- | --- |
| `module=a,b` | exactly these ids (default: all template widgets) |
| `spans=1x1,2x1,3x1,1x2,2x2,4x2` | spans below a widget's minimum render as a "below min" placeholder |
| `cell=110\|150`, `gap=8` | grid cell size and gap in px |
| `skin`, `variant=default\|studio`, `surface`, `graph`, `meter`, `accent`, `radius` | merged into every placement's settings |
| `theme=paper` | a theme preset's tokens on the page (the light check) |
| `settings=<url-encoded JSON>` | merged into every placement's settings, over the keys above |
| `data=fixtures` | the fixture snapshot instead of the live sensor store (the default is live data from the Data API, so every widget shows the real data points; sweeps pass `data=fixtures` for repeatable results) |
| `q=cpu` | the filter box: widgets whose id or title contains it |
| `eager=1` | mount every frame at once (see below) |

Frames mount as they scroll into view. With `module=` or `eager=1` they all mount at once. On the
default page, `await window.__qaMountAll()` mounts the rest and waits for them to settle; call it
before `__qaOverflow()` (which also mounts anything left, but cannot wait for the widgets' own
measuring). The full-sweep script below loads with `module=`, so it needs neither.

Examples: `?widget-qa&module=CpuMonitor,Clock&cell=150`, `?widget-qa&theme=paper&skin=<name>`,
`?widget-qa&settings=%7B%22variant%22%3A%22studio%22%7D`.

## Screenshots

Each zone is a `<figure data-qa-module data-qa-span>`. With the Playwright MCP, navigate to the
URL, then run this through `browser_run_code_unsafe` (set `stage` to `before` or `after`, `cell` to
the page's cell). It writes one PNG per figure and returns only the count, never images:

```js
async (page) => {
  const stage = "before";
  const cell = new URL(page.url()).searchParams.get("cell") ?? "110";
  const dir = `docs/redesign/phase9/shots/${stage}`; // screenshot() creates it; fs is not available here
  const figs = await page.locator("figure[data-qa-module]").all();
  for (const fig of figs) {
    const m = await fig.getAttribute("data-qa-module");
    const s = await fig.getAttribute("data-qa-span");
    await fig.screenshot({ path: `${dir}/${m}_${s}_${cell}.png` });
  }
  return `${figs.length} shots in ${dir}`;
}
```

`docs/redesign/phase9/shots/` is git-ignored.

## Overflow probe

```js
async (page) => JSON.stringify((await page.evaluate(() => window.__qaOverflow())).filter((f) => f.issues.length))
```

`window.__qaOverflow()` returns `{ module, span, issues: [{ selector, kind, dx, dy }] }[]` for every
figure. `kind: "exceeds"` is a descendant poking out of the zone box by more than 1px (`dx`/`dy` in
px; an axis an ancestor clips with overflow is ignored). `kind: "overlaps"` is two leaf text elements
whose rects intersect by more than 2px² (`dx` holds the area; the selector joins both with `X`).
`kind: "clipped"` is a zone descendant with `overflow: hidden|clip` whose content is larger than its
box (`scrollWidth > clientWidth + 1` or the same for height; `dx`/`dy` hold the hidden px). Elements that
truncate on purpose (`text-overflow: ellipsis` with `white-space: nowrap`, or `-webkit-line-clamp`),
art inside a `[data-qa-bleed]` container, and canvases, images, svg and video are skipped.
The geometry is in `src/widgets/qa-geometry.ts`.

## Full sweep

The acceptance check: every module at every span, cells 110 and 150, all 14 skins, both variants
(56 page loads, 2–4 minutes). Run through `browser_run_code_unsafe`;
it returns one line per failing `module|kind` and the count of error tiles (`[role=alert]`), which must
both be zero.

```js
async (page) => {
  const ids = "<template ids, comma-separated>";
  const spans = "1x1,2x1,3x1,1x2,2x2,4x2";
  const skins = ["default", "instrument", "tui", "ink", "android", "macos", "hud", "retro", "synth", "brutal", "cyber", "nixie", "fluent", "ios"];
  const rows = {}; let errs = 0;
  for (const cell of [110, 150]) for (const skin of skins) for (const variant of ["default", "studio"]) {
    await page.goto(`${new URL(page.url()).origin}/?widget-qa&module=${ids}&spans=${spans}&cell=${cell}&skin=${skin}&variant=${variant}&data=fixtures`);
    await page.waitForTimeout(1800);
    errs += await page.evaluate(() => document.querySelectorAll("[role=alert]").length);
    for (const f of await page.evaluate(() => window.__qaOverflow()))
      for (const x of f.issues) (rows[`${f.module}|${x.kind}`] ??= new Set()).add(`${f.span}@${cell}/${skin}/${variant[0]} d${x.dx}/${x.dy}`);
  }
  return JSON.stringify({ errs, rows: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, [...v].slice(0, 5)])) });
}
```

The last full run (end of 9.8) was clean: 0 rows, 0 error tiles. Findings and decisions are in
`review-ledger.md` and `qa-findings.md`.

Widgets only show images given as http(s) URLs or root-relative paths with an image extension,
so the fixtures use `/assets/qa/*.svg` (in `public/`), not data URLs.
