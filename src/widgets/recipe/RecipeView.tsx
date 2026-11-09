// Draws a validated recipe: the root card is the widget shell (`Widget`, so the theme, the material, the pack's T3 tokens
// and slots apply as for a built-in widget) and each block is a core primitive. Colours come from the theme only: its accent,
// its series (a pack's `series-n`, else the theme's palette role) or the status colours by thresholds. Text is sized from the
// zone (`metrics.ts`) and never drawn under 11 px. A Repeat over places draws its sample items until Weather by place (5c)
// serves them, and says so.
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { weatherKind } from "@/lib/weather-icons";
import type { ModuleSettings } from "@/modules/types";
import { Bar, Empty, fmt, get, heat, hue, num, Num, Ring, shell, shortLabel, Spark, TONES, tone, useHistory, Widget, WeatherGlyph, type ShellProps, type Tone } from "../kit";
import { textPx } from "./metrics";
import { keyOf } from "./store";
import type { Binding, Block, Condition, Place, Recipe, RecipeColour, Ranged } from "./types";
import { placesOf } from "./validate";

export interface RecipeViewProps extends ShellProps {
  look?: ModuleSettings;
  recipe: Recipe;
  /** The placement's stored values (its options among them). */
  saved?: ModuleSettings;
  /** Draw the recipe's sample readings instead of the live ones (the builder's Sample, tests). */
  sample?: boolean;
}

/** One field set of a Repeat's item. */
type Item = Record<string, string | number | number[]>;

interface Ctx {
  recipe: Recipe;
  data: ShellProps["data"];
  names?: Record<string, string>;
  values: Record<string, unknown>;
  item?: Item;
  /** The card's content box: every text size is taken from it. */
  w: number;
  h: number;
  t3?: Record<string, string | number>;
  saved?: ModuleSettings;
}

const RecipeCtx = createContext<Ctx | null>(null);
const useCtx = (): Ctx => useContext(RecipeCtx)!;

/** The option values of a placement: each option's default under the stored value (a place list is stored as JSON text). */
export function optionValues(recipe: Recipe, saved: ModuleSettings | undefined): Record<string, unknown> {
  return Object.fromEntries(recipe.options.map((o) => {
    const v = saved?.[o.key];
    const stored = o.type === "place-list" ? placesOf(v) : v;
    return [o.key, stored === undefined || (o.type === "place-list" && !Array.isArray(stored)) ? o.default : stored];
  }));
}

/** What a binding reads: the raw value, its number, its unit and the sensor key it came from (if any). */
interface Reading {
  raw: unknown;
  value: number;
  unit: string;
  key?: string;
}

function read(b: Binding | undefined, ctx: Ctx): Reading {
  let raw: unknown;
  let key: string | undefined;
  if (!b) raw = undefined;
  else if ("sensor" in b) [raw, key] = [get(ctx.data, b.sensor, ""), b.sensor];
  else if ("option" in b) {
    const v = ctx.values[b.option];
    const sensorOption = ctx.recipe.options.find((o) => o.key === b.option)?.type === "sensor";
    [raw, key] = sensorOption ? [get(ctx.data, String(v ?? ""), ""), String(v ?? "")] : [v, undefined];
  } else raw = ctx.item?.[b.field];
  const value = typeof raw === "number" ? raw : num(raw);
  const unit = typeof raw === "string" ? raw.replace(/^[-\d.,\s]+/, "").trim() : "";
  return { raw, value, unit, key };
}

const holds = (when: Condition | undefined, values: Record<string, unknown>): boolean =>
  !when || ((when.is === undefined || values[when.option] === when.is) && (when.not === undefined || values[when.option] !== when.not));

/** A series colour: the pack's `series-n`, else the theme's palette role (`s<n>`), else the accent turned round the wheel. */
function seriesInk(n: number, ctx: Ctx): string {
  const own = ctx.t3?.[`series-${n}`] || ctx.saved?.[`s${n}`];
  return typeof own === "string" && own ? own : hue((n - 1) * 60);
}

/** A block's colour: `color` for a stroke or fill when it names one, `t` the tone (thresholds) otherwise. */
function inkOf(c: RecipeColour | undefined, value: number, thresholds: Ranged["thresholds"], ctx: Ctx): { color?: string; t: Tone } {
  if (c === "thresholds") return { t: tone(value, thresholds?.warn, thresholds?.crit) };
  if (c?.startsWith("series-")) return { color: seriesInk(Number(c.slice(7)), ctx), t: "ok" };
  return { t: "ok" };
}

const decimalsOf = (v: number, own: number | undefined): number => own ?? (Math.abs(v) < 10 ? 1 : 0);
const shown = (r: Reading, decimals?: number): string => (Number.isFinite(r.value) && (typeof r.raw === "number" || /^-?\d/.test(String(r.raw).trim())) ? fmt(r.value, decimalsOf(r.value, decimals)) : r.raw === undefined || r.raw === "" ? "–" : String(r.raw));

/** The share a child takes of its row. */
const grow = (b: Block): CSSProperties => ({ flex: `${b.grow ?? 1} 1 0`, minWidth: 0, minHeight: 0 });

function Blocks({ blocks, direction = "column", gap = 6, align }: { blocks: Block[]; direction?: "row" | "column"; gap?: number; align?: string }) {
  const ctx = useCtx();
  const shownBlocks = blocks.filter((b) => holds(b.when, ctx.values));
  return (
    <div className="flex h-full w-full min-h-0 min-w-0" style={{ flexDirection: direction, gap, alignItems: align === "center" ? "center" : align === "end" ? "flex-end" : align === "start" ? "flex-start" : "stretch" }}>
      {shownBlocks.map((b, k) => (
        <div key={k} data-recipe-block={b.type} className="flex min-h-0 min-w-0" style={grow(b)}>
          <BlockView b={b} />
        </div>
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }): ReactNode {
  switch (b.type) {
    case "card":
      return <NestedCard b={b} />;
    case "row":
      return <Blocks blocks={b.children} direction={b.direction ?? "row"} gap={b.gap} align={b.align} />;
    case "repeat":
      return <RepeatView b={b} />;
    case "ring":
    case "gauge":
      return <RingView b={b} />;
    case "bar":
      return <BarView b={b} />;
    case "sparkline":
      return <SparkView b={b} />;
    case "value":
      return <ValueView b={b} />;
    case "label":
      return <LabelView b={b} />;
    case "weather-icon":
      return <WeatherView b={b} />;
    case "image":
      return <ImageView b={b} />;
    case "heatmap":
      return <HeatmapView b={b} />;
  }
}

function NestedCard({ b }: { b: Extract<Block, { type: "card" }> }) {
  const ctx = useCtx();
  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-1 rounded-lg p-2" style={{ background: "var(--w-track)" }}>
      {b.title && <span className="truncate text-[color:var(--w-muted)]" style={{ fontSize: textPx(0.85, ctx.w, ctx.h) }}>{b.title}</span>}
      <div className="min-h-0 flex-1">
        <Blocks blocks={b.children} />
      </div>
    </div>
  );
}

function RingView({ b }: { b: Extract<Block, { type: "ring" | "gauge" }> }) {
  const ctx = useCtx();
  const r = read(b.bind, ctx);
  const min = b.min ?? 0;
  const max = b.max ?? 100;
  const ink = inkOf(b.color, r.value, b.thresholds, ctx);
  const px = textPx(b.scale ?? 1.6, ctx.w, ctx.h);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Ring value={r.value - min} max={max - min} t={ink.t} color={ink.color} thickness={b.thickness} sweep={b.type === "gauge" ? 270 : undefined} className="h-full max-w-full">
        {b.center !== false && (
          <Num className="font-semibold leading-none" style={{ fontSize: px }}>
            {shown(r, b.decimals ?? 0)}
            <span style={{ fontSize: Math.max(11, px * 0.4) }}>{b.unit ?? r.unit}</span>
          </Num>
        )}
      </Ring>
    </div>
  );
}

function BarView({ b }: { b: Extract<Block, { type: "bar" }> }) {
  const ctx = useCtx();
  const r = read(b.bind, ctx);
  const min = b.min ?? 0;
  const max = b.max ?? 100;
  const ink = inkOf(b.color, r.value, b.thresholds, ctx);
  return (
    <div className="flex w-full items-center">
      <Bar value={r.value - min} max={max - min} t={ink.t} style={b.style ?? "bar"} className="h-2" />
    </div>
  );
}

function SparkView({ b }: { b: Extract<Block, { type: "sparkline" }> }) {
  const ctx = useCtx();
  const r = read(b.bind, ctx);
  const history = useHistory(Array.isArray(r.raw) ? Number.NaN : r.value);
  const values = Array.isArray(r.raw) ? (r.raw as number[]) : history;
  const ink = inkOf(b.color, r.value, b.thresholds, ctx);
  return <Spark values={values} min={b.min} max={b.max} color={ink.color ?? (ink.t !== "ok" ? TONES[ink.t] : undefined)} graph={b.style ?? "area"} fill={b.style !== "line"} grid={false} className="h-full min-h-[12px] w-full" />;
}

function ValueView({ b }: { b: Extract<Block, { type: "value" }> }) {
  const ctx = useCtx();
  const r = read(b.bind, ctx);
  const px = textPx(b.scale ?? 1, ctx.w, ctx.h);
  const ink = inkOf(b.color, r.value, b.thresholds, ctx);
  const color = ink.color ?? (ink.t !== "ok" ? TONES[ink.t] : undefined);
  return (
    <div className="flex w-full min-w-0 items-baseline gap-[0.6em] whitespace-nowrap leading-none" style={{ fontSize: px }}>
      {b.label && <span className="min-w-0 truncate text-[color:var(--w-muted)]">{b.label}</span>}
      <Num className={b.label ? "ml-auto shrink-0" : "shrink-0"} style={color ? { color } : undefined}>
        {shown(r, b.decimals)}
        {(b.unit ?? r.unit) && <span className="ml-[0.2em] text-[color:var(--w-muted)]" style={{ fontSize: Math.max(11, px * 0.6) }}>{b.unit ?? r.unit}</span>}
      </Num>
    </div>
  );
}

function LabelView({ b }: { b: Extract<Block, { type: "label" }> }) {
  const ctx = useCtx();
  const text = b.text ?? shown(read(b.bind, ctx));
  const color = b.tone === "muted" ? "var(--w-muted)" : b.tone === "accent" ? "var(--w-accent)" : "var(--w-fg)";
  return (
    <span className="block w-full truncate leading-tight" style={{ fontSize: textPx(b.scale ?? 0.85, ctx.w, ctx.h), color }}>
      {text}
    </span>
  );
}

function WeatherView({ b }: { b: Extract<Block, { type: "weather-icon" }> }) {
  const ctx = useCtx();
  const r = read(b.bind, ctx);
  const text = typeof r.raw === "string" ? r.raw : undefined;
  return (
    <div className="flex h-full items-center">
      <WeatherGlyph {...weatherKind(text, text)} size={textPx(b.scale ?? 2, ctx.w, ctx.h)} />
    </div>
  );
}

function ImageView({ b }: { b: Extract<Block, { type: "image" }> }) {
  const ctx = useCtx();
  return <img src={`/api/widgets/${keyOf(ctx.recipe.id)}/${b.file}`} alt={b.alt ?? ""} className="h-full w-full min-h-0" style={{ objectFit: b.fit ?? "contain" }} />;
}

function HeatmapView({ b }: { b: Extract<Block, { type: "heatmap" }> }) {
  const ctx = useCtx();
  const list = b.cells ? b.cells.map((c) => read(c, ctx).value) : ((read(b.bind, ctx).raw as number[] | undefined) ?? []).map(Number);
  const lo = b.min ?? Math.min(...list.filter(Number.isFinite), 0);
  const hi = b.max ?? Math.max(...list.filter(Number.isFinite), 1);
  const columns = b.columns ?? list.length;
  return (
    <div className="grid h-full w-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))` }}>
      {list.map((v, k) => (
        <span key={k} className="min-h-[6px] rounded-[2px]" style={{ background: Number.isFinite(v) ? (b.color?.startsWith("series-") ? seriesInk(Number(b.color.slice(7)), ctx) : heat(((v - lo) / (hi - lo || 1)) * 100)) : "var(--w-track)", opacity: b.color?.startsWith("series-") ? 0.35 + 0.65 * ((v - lo) / (hi - lo || 1)) : undefined }} />
      ))}
    </div>
  );
}

/** A Repeat's items: one per place of its list option, each with the sample fields of its place (by name, else by place). */
export function itemsOf(recipe: Recipe, over: string, values: Record<string, unknown>): Item[] {
  const places = (Array.isArray(values[over]) ? values[over] : []) as Place[];
  const sample = recipe.sample.items?.[over] ?? [];
  return places.map((p, k) => ({ ...(sample.find((s) => s.name === p.name) ?? sample[k] ?? {}), name: p.name }));
}

function RepeatView({ b }: { b: Extract<Block, { type: "repeat" }> }) {
  const ctx = useCtx();
  const items = itemsOf(ctx.recipe, b.over, ctx.values).slice(0, b.max ?? 12);
  const dir = b.direction ?? "rows";
  const cols = dir === "grid" ? Math.ceil(Math.sqrt(items.length)) : dir === "columns" ? items.length : 1;
  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, cols)}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)" }}>
        {items.map((item, k) => (
          <div key={k} data-recipe-item="" className="min-h-0 min-w-0 px-1 py-1" style={b.dividers && k > 0 ? (dir === "columns" ? { borderLeft: "1px solid var(--w-track)" } : { borderTop: "1px solid var(--w-track)" }) : undefined}>
            <RecipeCtx.Provider value={{ ...ctx, item }}>
              <Blocks blocks={b.children} direction="row" gap={8} align="center" />
            </RecipeCtx.Provider>
          </div>
        ))}
      </div>
      {/* 5a: Weather by place is not served yet; the items are the recipe's sample */}
      <span data-recipe-sample="" className="shrink-0 truncate text-right text-[color:var(--w-faint)]" style={{ fontSize: 11 }}>
        Sample weather
      </span>
    </div>
  );
}

/** The recipe drawn in the widget shell. */
export default function RecipeView(p: RecipeViewProps) {
  const { recipe } = p;
  const data = p.sample ? Object.fromEntries(Object.entries(recipe.sample.sensors).map(([k, v]) => [k, String(v)])) : p.data;
  const values = optionValues(recipe, p.saved);
  const root = recipe.root;
  const base: Omit<Ctx, "w" | "h"> = { recipe, data, names: p.names, values, t3: p.t3, saved: p.saved };
  const sub = root.subtitle ? read(root.subtitle, { ...base, w: 0, h: 0 }) : undefined;
  const subtitle = sub?.key && p.names?.[sub.key] ? shortLabel(p.names[sub.key]).model || p.names[sub.key] : sub && sub.raw !== "" && sub.raw !== undefined ? String(sub.raw) : undefined;
  return (
    <Widget {...shell(p)} title={p.title ?? root.title ?? recipe.name} icon={root.icon ?? recipe.icon ?? "dashboard"} design={null} right={subtitle ? <span className="truncate text-[color:var(--w-muted)]">{subtitle}</span> : undefined}>
      {({ w, h }) =>
        root.children.length ? (
          <RecipeCtx.Provider value={{ ...base, w, h }}>
            <div data-recipe={recipe.id} className="h-full w-full">
              <Blocks blocks={root.children} />
            </div>
          </RecipeCtx.Provider>
        ) : (
          <Empty icon="dashboard" label="Empty recipe" large />
        )
      }
    </Widget>
  );
}
