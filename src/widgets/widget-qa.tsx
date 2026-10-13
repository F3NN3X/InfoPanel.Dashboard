import { useMemo, type CSSProperties } from "react";
import { modules } from "@/modules";
import { LivePlacement, placementContent } from "@/components/studio/placement-content";
import { THEME_PRESETS, themeVars } from "@/lib/theme";
import type { Placement } from "@/lib/layout";
import type { ModuleSettings } from "@/modules/types";
import { fixtureSensors } from "./__fixtures__";
import { clippedContent, exceeds, overlaps, type Box } from "./qa-geometry";

/**
 * Dev-only oracle page for the widget library (`?widget-qa`): every module (legacy and template) at
 * a set of spans, rendered through the kiosk's own `placementContent` from fixture sensors. Query
 * params, all optional: `module=a,b` (default all), `spans=1x1,2x1,...`, `cell=110|150`, `gap=8`,
 * `skin`, `variant`, `surface`, `theme=<preset>`, `settings=<url-encoded JSON>`, `data=live`.
 * `window.__qaOverflow()` lists what pokes out of its zone or overlaps (see docs/redesign/phase9/qa.md).
 */

const DEFAULT_SPANS = "1x1,2x1,3x1,1x2,2x2,4x2";
const q = new URLSearchParams(window.location.search);

const ids = q.get("module")?.split(",").filter(Boolean);
const picked = ids ? modules.filter((m) => ids.includes(m.id)) : modules;
const spans = (q.get("spans") ?? DEFAULT_SPANS)
  .split(",")
  .map((s) => s.split("x").map(Number))
  .filter(([c, r]) => c > 0 && r > 0) as [number, number][];
const cell = Number(q.get("cell")) || 110;
const gap = q.has("gap") ? Number(q.get("gap")) || 0 : 8;
const live = q.get("data") === "live";
const theme = THEME_PRESETS.find((p) => p.name === q.get("theme"));

function parseSettings(): ModuleSettings {
  const raw = q.get("settings");
  let extra: ModuleSettings = {};
  if (raw) {
    try {
      extra = JSON.parse(raw);
    } catch {
      console.warn("widget-qa: settings is not valid JSON");
    }
  }
  const look = Object.fromEntries((["skin", "variant", "surface"] as const).flatMap((k) => (q.get(k) ? [[k, q.get(k)!]] : [])));
  return { ...look, ...extra };
}
const SETTINGS = parseSettings();
const SENSORS = fixtureSensors();

const size = (n: number) => n * cell + (n - 1) * gap;

function placement(module: string, colSpan: number, rowSpan: number): Placement {
  return { id: `qa-${module}-${colSpan}x${rowSpan}`, module, colStart: 1, rowStart: 1, colSpan, rowSpan, visible: true, settings: SETTINGS };
}

function Zone({ p, w, h }: { p: Placement; w: number; h: number }) {
  const frame = (content: React.ReactNode, scope?: CSSProperties) => (
    <div data-qa-box className="relative overflow-visible" style={{ width: w, height: h, ...scope }}>
      {content}
    </div>
  );
  if (live) return <LivePlacement placement={p}>{(r) => frame(r.content, r.scope)}</LivePlacement>;
  const r = placementContent(p, SENSORS, []);
  return frame(r.content, r.scope);
}

export default function WidgetQa() {
  const skipped = useMemo(
    () => picked.flatMap((m) => spans.filter(([c, r]) => c < (m.minCols ?? 1) || r < (m.minRows ?? 1)).map(([c, r]) => `${m.id} ${c}x${r}`)),
    []
  );
  const style = theme ? ({ ...themeVars(theme.tokens), background: `hsl(${theme.tokens.background})`, color: `hsl(${theme.tokens.foreground})` } as CSSProperties) : undefined;
  return (
    <main className={`min-h-screen p-6 ${theme ? "" : "bg-[#0c0c0e] text-zinc-100"}`} style={style}>
      <h1 className="mb-1 text-sm font-semibold">Widget QA</h1>
      <p className="mb-4 font-mono text-xs opacity-60">
        {picked.length} modules · cell {cell} · gap {gap} · {live ? "live data" : "fixtures"}
        {skipped.length > 0 && <> · below min: {skipped.join(", ")}</>}
      </p>
      <div className="flex flex-wrap items-start" style={{ gap: 24 }}>
        {picked.flatMap((m) =>
          spans
            .filter(([c, r]) => c >= (m.minCols ?? 1) && r >= (m.minRows ?? 1))
            .map(([c, r]) => (
              <figure key={`${m.id}-${c}x${r}`} data-qa-module={m.id} data-qa-span={`${c}x${r}`} className="m-0 flex flex-col gap-1">
                <Zone p={placement(m.id, c, r)} w={size(c)} h={size(r)} />
                <figcaption className="font-mono text-[10px] opacity-60">
                  {m.id} · {c}x{r}
                </figcaption>
              </figure>
            ))
        )}
      </div>
    </main>
  );
}

interface Issue {
  selector: string;
  kind: "exceeds" | "overlaps" | "clipped";
  dx: number;
  dy: number;
}

const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });

/** A short CSS-ish path (tag, first classes, nth-child) up to the zone box, to find the element by eye. */
function selectorOf(el: Element, root: Element): string {
  const parts: string[] = [];
  for (let n: Element | null = el; n && n !== root && parts.length < 4; n = n.parentElement) {
    const cls = typeof n.className === "string" ? n.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
    const idx = n.parentElement ? Array.prototype.indexOf.call(n.parentElement.children, n) + 1 : 1;
    parts.unshift(`${n.tagName.toLowerCase()}${cls ? "." + cls : ""}:nth-child(${idx})`);
  }
  return parts.join(" > ");
}

/** True when an ancestor between `el` and `root` clips that axis, so poking past the box there is invisible. */
function clipped(el: Element, root: Element, axis: "x" | "y"): boolean {
  for (let n = el.parentElement; n && n !== root; n = n.parentElement) {
    const o = getComputedStyle(n);
    if ((axis === "x" ? o.overflowX : o.overflowY) !== "visible") return true;
  }
  return false;
}

function probe(fig: Element): Issue[] {
  const root = fig.querySelector("[data-qa-box]");
  if (!root) return [];
  const rootBox = toBox(root.getBoundingClientRect());
  const issues: Issue[] = [];
  const leaves: { el: Element; box: Box }[] = [];
  for (const el of root.querySelectorAll("*")) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const box = toBox(rect);
    const out = exceeds(box, rootBox, 1);
    const dx = clipped(el, root, "x") ? 0 : out.dx;
    const dy = clipped(el, root, "y") ? 0 : out.dy;
    if (dx || dy) issues.push({ selector: selectorOf(el, root), kind: "exceeds", dx, dy });
    if (el.children.length === 0 && el.textContent?.trim()) leaves.push({ el, box });
    const cs = getComputedStyle(el);
    const cut = clippedContent({
      tag: el.tagName,
      overflowX: cs.overflowX,
      overflowY: cs.overflowY,
      textOverflow: cs.textOverflow,
      whiteSpace: cs.whiteSpace,
      lineClamp: cs.getPropertyValue("-webkit-line-clamp"),
      bleed: el.closest("[data-qa-bleed]") !== null,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    });
    if (cut.dx || cut.dy) issues.push({ selector: selectorOf(el, root), kind: "clipped", ...cut });
  }
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const area = overlaps(leaves[i].box, leaves[j].box, 2);
      if (area) issues.push({ selector: `${selectorOf(leaves[i].el, root)}  X  ${selectorOf(leaves[j].el, root)}`, kind: "overlaps", dx: area, dy: 0 });
    }
  }
  return issues;
}

declare global {
  interface Window {
    __qaOverflow?: () => { module: string; span: string; issues: Issue[] }[];
  }
}

window.__qaOverflow = () =>
  [...document.querySelectorAll("figure[data-qa-module]")].map((fig) => ({
    module: fig.getAttribute("data-qa-module")!,
    span: fig.getAttribute("data-qa-span")!,
    issues: probe(fig),
  }));
