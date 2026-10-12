# Widget QA harness

The oracle page for 9.4 and 9.8: every module (legacy and template) at a set of spans, rendered
through the kiosk's `placementContent` from fixture sensors (`src/widgets/__fixtures__/snapshot.json`
plus `extra.json`, extra wins).

## Open it

`npm run dev`, then `http://localhost:5173/?widget-qa` (use the port Vite prints). Params, all optional:

| param | meaning |
| --- | --- |
| `module=a,b` | legacy and template ids (default: all registered) |
| `spans=1x1,2x1,3x1,1x2,2x2,4x2` | spans below a module's minimum are skipped and listed as "below min" |
| `cell=110\|150`, `gap=8` | grid cell size and gap in px |
| `skin`, `variant=default\|studio`, `surface` | merged into every placement's settings |
| `theme=paper` | a theme preset's tokens on the page (the light check) |
| `settings=<url-encoded JSON>` | merged into every placement's settings |
| `data=live` | the real sensor store instead of fixtures |

Examples: `?widget-qa&module=systemmodern,vbz&cell=150`, `?widget-qa&theme=paper&skin=<name>`,
`?widget-qa&settings=%7B%22variant%22%3A%22studio%22%7D`.

## Screenshots

Each zone is a `<figure data-qa-module data-qa-span>`. With the Playwright MCP, navigate to the
URL, then run this through `browser_run_code_unsafe` (set `stage` to `before` or `after`, `cell` to
the page's cell). It writes one PNG per figure and returns only the count, never images:

```js
async (page) => {
  const stage = "before";
  const cell = new URL(page.url()).searchParams.get("cell") ?? "110";
  const dir = `docs/redesign/phase9/shots/${stage}`;
  require("fs").mkdirSync(dir, { recursive: true });
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
truncate on purpose (`text-overflow: ellipsis` with `white-space: nowrap`) and canvases, images, svg and
video are skipped.
The geometry is in `src/widgets/qa-geometry.ts`.

Legacy modules only show images given as http(s) URLs or root-relative paths with an image extension,
so the fixtures use `/assets/qa/*.svg` (in `public/`), not data URLs.
