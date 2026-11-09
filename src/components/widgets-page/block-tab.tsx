// The builder inspector's Block tab (Phase 5b, screenshots 04 and 08): what the selected block reads (a sensor, an option or a
// Repeat item's field) and "Let people pick …", its range, its colour from the theme (accent, a series or the thresholds), what
// its type has (a ring's centre value and thickness, a Repeat's list and direction, a row's direction), when it shows, and its
// share of its row. Every change is one edit of the recipe (one undo step).
import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { useDataModel } from "@/lib/use-data-model";
import { DataPicker } from "@/components/studio/inspector/data-picker";
import type { Data } from "@/widgets/core/types";
import { expandKey } from "@/widgets/recipe/reads";
import { DEFAULT_SCALE } from "@/widgets/recipe/validate";
import { type Binding, type Block, type Cells, type Recipe, type RecipeColour, type RecipeDeviceKind, WEATHER_PLACE_FIELDS } from "@/widgets/recipe/types";
import { BLOCK_LABEL, blockAt, deviceOfKey, layerName, pickBinding, pickedOption, pickWhat, repeatAbove, unpickBinding, updateBlock, valueText, type Path } from "./builder-model";
import { BlockIcon } from "./block-icons";
import { Field, Heading, NumberInput, Select, TextInput } from "./fields";

export interface BlockTabProps {
  recipe: Recipe;
  path: Path;
  onChange: (recipe: Recipe) => void;
  onRemove: () => void;
  /** A copy right after it (Ctrl+D). */
  onDuplicate: () => void;
  /** The readings the stage shows (live or the sample), and their names. */
  data: Data;
  names?: Record<string, string>;
  devices: Partial<Record<RecipeDeviceKind, string[]>>;
  onOpenSources: () => void;
  /** Adds an image file to the package and names it on the block. */
  onImage: (file: File) => void;
}

const COLOURS = [
  { value: "accent", label: "Accent" },
  { value: "series", label: "Series" },
  { value: "thresholds", label: "Thresholds" },
] as const;

const RANGED = new Set(["ring", "gauge", "bar", "sparkline", "heatmap"]);
const SIZE_OPTIONS = ["", "1", "2", "3", "4", "5", "6"];

/** The reading a binding shows on the stage, and where it comes from. */
function bindingInfo(recipe: Recipe, b: Binding, data: Data, names: Record<string, string> | undefined): { name: string; from?: string; value: string } {
  if ("field" in b) return { name: `Each place's ${b.field}`, value: "" };
  const option = pickedOption(recipe, b);
  const values = Object.fromEntries(recipe.options.map((o) => [o.key, o.default]));
  const key = "option" in b ? String(option?.default ?? "") : (expandKey(recipe, b.sensor, values, data).key ?? b.sensor);
  const raw = data[key];
  const value = typeof raw === "object" && raw ? raw.value : (raw ?? "–");
  return { name: names?.[key] ?? key, from: option ? `from option “${option.label}”` : undefined, value: String(value) };
}

function DataRow({ recipe, path, block, props }: { recipe: Recipe; path: Path; block: Block; props: BlockTabProps }) {
  const [open, setOpen] = useState(false);
  const model = useDataModel();
  const bind = "bind" in block ? block.bind : block.type === "card" ? block.subtitle : undefined;
  const inRepeat = !!repeatAbove(recipe, path);
  const what = pickWhat(recipe, path, props.devices);
  const picked = !!pickedOption(recipe, bind);
  const set = (next: Binding | undefined) => props.onChange(updateBlock(recipe, path, block.type === "card" ? { subtitle: next } : { bind: next }));
  // a key of a device the recipe already lets people pick names that option, so the block follows the pick
  const choose = (key: string) => {
    const device = deviceOfKey(key, props.devices);
    const option = device && recipe.options.find((o) => o.type === "device" && o.kind === device.kind);
    set({ sensor: option && device ? `libre.{${option.key}}_${key.slice(`libre.${device.id}_`.length)}` : key });
  };
  if (inRepeat && (!bind || "field" in bind))
    return (
      <Field label="Field">
        <Select label="Field" value={bind && "field" in bind ? bind.field : "temp"} options={WEATHER_PLACE_FIELDS.map((f) => ({ value: f, label: f }))} onChange={(f) => set({ field: f })} />
      </Field>
    );
  const info = bind ? bindingInfo(recipe, bind, props.data, props.names) : undefined;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Change the data" className="flex w-full items-center gap-3 rounded-ui-lg border border-ui-subtle bg-ui-app px-3 py-2.5 text-left hover:border-ui-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body text-ui-1">{info?.name ?? "No data yet"}</span>
          <span className="block truncate font-ui-mono text-micro text-ui-3">{info?.from ?? (bind && "sensor" in bind ? bind.sensor : "Pick a sensor")}</span>
        </span>
        <span className="shrink-0 font-ui-mono text-body text-ui-1">{info?.value}</span>
      </button>
      {what && (
        <Field label={`Let people pick ${what}`}>
          <Toggle label={`Let people pick ${what}`} checked={picked} onChange={(on) => props.onChange(on ? pickBinding(recipe, path, props.devices) : unpickBinding(recipe, path, props.data))} />
        </Field>
      )}
      <DataPicker open={open} onOpenChange={setOpen} title={`Data for ${layerName(recipe, block)}`} points={model.points} mode="item" bound={new Set()} onToggle={(p) => choose(p.key)} onOpenExplorer={props.onOpenSources} />
    </>
  );
}

function ColourRow({ recipe, path, block, onChange }: { recipe: Recipe; path: Path; block: Block & { color?: RecipeColour; thresholds?: { warn: number; crit: number } }; onChange: (r: Recipe) => void }) {
  const colour = block.color ?? "accent";
  const kind = colour.startsWith("series-") ? "series" : (colour as "accent" | "thresholds");
  const set = (patch: Record<string, unknown>) => onChange(updateBlock(recipe, path, patch));
  return (
    <>
      <Field label="Colour">
        <Segmented
          label="Colour"
          options={[...COLOURS]}
          value={kind}
          onChange={(v) => set(v === "series" ? { color: "series-1", thresholds: undefined } : v === "thresholds" ? { color: v, thresholds: block.thresholds ?? { warn: 70, crit: 90 } } : { color: v, thresholds: undefined })}
        />
      </Field>
      {kind === "series" && (
        <Field label="Series">
          <Select label="Series" value={colour.slice(7)} options={["1", "2", "3", "4", "5", "6"].map((n) => ({ value: n, label: `Series ${n}` }))} onChange={(n) => set({ color: `series-${n}` })} width={120} />
        </Field>
      )}
      {kind === "thresholds" && (
        <Field label="Warning, critical">
          <NumberInput label="Warning at" value={block.thresholds?.warn} onChange={(v) => set({ thresholds: { warn: v ?? 0, crit: block.thresholds?.crit ?? 90 } })} />
          <NumberInput label="Critical at" value={block.thresholds?.crit} onChange={(v) => set({ thresholds: { warn: block.thresholds?.warn ?? 70, crit: v ?? 0 } })} />
        </Field>
      )}
    </>
  );
}

function WhenRows({ recipe, path, block, onChange }: { recipe: Recipe; path: Path; block: Block; onChange: (r: Recipe) => void }) {
  const choices = recipe.options.filter((o) => o.type === "boolean" || o.type === "select");
  const when = block.when;
  const option = choices.find((o) => o.key === when?.option);
  const set = (next: Block["when"]) => onChange(updateBlock(recipe, path, { when: next && (next.option !== undefined || next.size) ? next : undefined }));
  const values = option?.type === "boolean" ? [true, false] : (option?.options ?? []).map((c) => c.value);
  const min = when?.size?.min;
  const setMin = (axis: 0 | 1, v: string) => {
    const next: Cells = [min?.[0] ?? 1, min?.[1] ?? 1];
    next[axis] = Number(v) || 1;
    const none = !v && !(min?.[1 - axis] ?? 0);
    set({ ...when, size: none ? undefined : { ...when?.size, min: next } });
  };
  return (
    <>
      <Field label="Shows">
        <Select
          label="Shows when"
          value={option?.key ?? ""}
          options={[{ value: "", label: "Always" }, ...choices.map((o) => ({ value: o.key, label: `When ${o.label}` }))]}
          onChange={(key) => {
            const o = choices.find((x) => x.key === key);
            set(o ? { ...when, option: key, is: o.type === "boolean" ? true : o.options?.[0]?.value, not: undefined } : { size: when?.size });
          }}
        />
      </Field>
      {option && (
        <Field label="is">
          <Select label="Is" value={String(when?.is)} options={values.map((v) => ({ value: String(v), label: valueText(option, v) }))} onChange={(v) => set({ ...when, option: option.key, is: option.type === "boolean" ? v === "true" : v })} />
        </Field>
      )}
      <Field label="From the size" hint="Hidden in a smaller zone: what keeps text above 11 px at small sizes">
        <Select label="Smallest columns" value={min ? String(min[0]) : ""} options={SIZE_OPTIONS.map((n) => ({ value: n, label: n || "Any" }))} onChange={(v) => setMin(0, v)} width={64} />
        <span className="text-ui-3">×</span>
        <Select label="Smallest rows" value={min ? String(min[1]) : ""} options={SIZE_OPTIONS.map((n) => ({ value: n, label: n || "Any" }))} onChange={(v) => setMin(1, v)} width={64} />
      </Field>
    </>
  );
}

function SizeRows({ recipe, onChange }: { recipe: Recipe; onChange: (r: Recipe) => void }) {
  const row = (label: string, key: "min" | "max" | "default") => (
    <Field label={label}>
      <NumberInput label={`${label} columns`} value={recipe.size[key][0]} min={1} max={12} onChange={(v) => onChange({ ...recipe, size: { ...recipe.size, [key]: [v ?? 1, recipe.size[key][1]] } })} width={56} />
      <span className="text-ui-3">×</span>
      <NumberInput label={`${label} rows`} value={recipe.size[key][1]} min={1} max={12} onChange={(v) => onChange({ ...recipe, size: { ...recipe.size, [key]: [recipe.size[key][0], v ?? 1] } })} width={56} />
    </Field>
  );
  return (
    <>
      <Heading>Sizes</Heading>
      {row("Smallest", "min")}
      {row("Largest", "max")}
      {row("Opens at", "default")}
    </>
  );
}

export function BlockTab(props: BlockTabProps) {
  const { recipe, path, onChange } = props;
  const block = blockAt(recipe, path);
  if (!block) return <p className="p-4 text-caption text-ui-3">Pick a block in Layers or on the stage.</p>;
  const set = (patch: Record<string, unknown>) => onChange(updateBlock(recipe, path, patch));
  const parent = path.length ? layerName(recipe, blockAt(recipe, path.slice(0, -1))!) : undefined;
  const raw = block as unknown as Record<string, unknown>;
  const bound = "bind" in block || block.type === "card";
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="mb-1 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-md border border-ui-subtle bg-ui-raised text-ui-2">
          <BlockIcon block={block} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lead font-medium text-ui-1">{BLOCK_LABEL[block.type]}</span>
          <span className="block truncate text-caption text-ui-3">{parent ? `Block · in ${parent}` : block.type === "repeat" ? "Block · one row per location" : "The widget's card"}</span>
        </span>
        {path.length > 0 && (
          <>
            <IconButton label="Duplicate block (Ctrl+D)" onClick={props.onDuplicate}>
              <Copy className="h-4 w-4" />
            </IconButton>
            <IconButton label="Delete block" danger onClick={props.onRemove}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </>
        )}
      </div>
      <Field label="Name in Layers">
        <TextInput label="Name in Layers" value={block.name ?? ""} placeholder={layerName(recipe, { ...block, name: undefined } as Block)} onChange={(v) => set({ name: v.trim() ? v.slice(0, 40) : undefined })} />
      </Field>
      {block.type === "card" && (
        <Field label="Title">
          <TextInput label="Title" value={block.title ?? ""} onChange={(v) => set({ title: v.trim() ? v.slice(0, 60) : undefined })} />
        </Field>
      )}
      {block.type === "repeat" ? (
        <>
          <Heading>Repeat over</Heading>
          <Field label="List">
            <Select label="List" value={block.over} options={recipe.options.filter((o) => o.type === "place-list").map((o) => ({ value: o.key, label: `Option “${o.label}”` }))} onChange={(v) => set({ over: v })} />
          </Field>
          <Field label="Data for each">
            <span className="text-body text-ui-2">Weather · by place</span>
          </Field>
          <Field label="Direction">
            <Segmented label="Direction" value={block.direction ?? "rows"} options={[{ value: "rows", label: "Rows" }, { value: "columns", label: "Columns" }, { value: "grid", label: "Grid" }]} onChange={(v) => set({ direction: v })} />
          </Field>
          <Field label="Most shown">
            <NumberInput label="Most shown" value={block.max ?? 12} min={1} max={12} onChange={(v) => set({ max: v })} />
          </Field>
          <Field label="Divider lines">
            <Toggle label="Divider lines" checked={!!block.dividers} onChange={(v) => set({ dividers: v || undefined })} />
          </Field>
        </>
      ) : (
        bound && (
          <>
            <Heading>{block.type === "card" ? "Sub-title" : "Data"}</Heading>
            <DataRow recipe={recipe} path={path} block={block} props={props} />
          </>
        )
      )}
      {block.type === "label" && !block.bind && (
        <Field label="Text">
          <TextInput label="Text" value={block.text ?? ""} onChange={(v) => set({ text: v.slice(0, 80) || undefined })} />
        </Field>
      )}
      {block.type === "label" && block.text !== undefined && repeatAbove(recipe, path) && (
        <Field label="Text from each place">
          <Toggle label="Text from each place" checked={false} onChange={() => set({ text: undefined, bind: { field: "name" } })} />
        </Field>
      )}
      {RANGED.has(block.type) && (
        <Field label="Range">
          <NumberInput label="Range from" value={raw.min as number | undefined} onChange={(v) => set({ min: v })} />
          <NumberInput label="Range to" value={raw.max as number | undefined} onChange={(v) => set({ max: v })} />
        </Field>
      )}
      {(block.type === "row" || block.type === "label" || block.type === "value" || block.type === "ring" || block.type === "gauge" || block.type === "bar" || block.type === "sparkline" || block.type === "heatmap") && <Heading>Look</Heading>}
      {(block.type === "ring" || block.type === "gauge" || block.type === "bar" || block.type === "sparkline" || block.type === "value" || block.type === "heatmap") && <ColourRow recipe={recipe} path={path} block={block} onChange={onChange} />}
      {(block.type === "ring" || block.type === "gauge") && (
        <>
          <Field label="Value in the centre">
            <Toggle label="Value in the centre" checked={block.center !== false} onChange={(v) => set({ center: v ? undefined : false })} />
          </Field>
          <Field label="Thickness">
            <input aria-label="Thickness" type="range" min={2} max={24} value={block.thickness ?? 8} onChange={(e) => set({ thickness: Number(e.target.value) })} className="w-[110px] accent-ui-strong-text" />
            <span className="w-10 text-right font-ui-mono text-body text-ui-2">{block.thickness ?? 8} %</span>
          </Field>
        </>
      )}
      {(block.type === "value" || block.type === "ring" || block.type === "gauge") && (
        <Field label="Unit, decimals">
          <TextInput label="Unit" value={block.unit ?? ""} placeholder="Auto" onChange={(v) => set({ unit: v.slice(0, 8) || undefined })} width={72} />
          <NumberInput label="Decimals" value={block.decimals} placeholder="Auto" min={0} max={4} onChange={(v) => set({ decimals: v })} width={76} />
        </Field>
      )}
      {block.type === "value" && (
        <Field label="Label">
          <TextInput label="Label" value={block.label ?? ""} onChange={(v) => set({ label: v.slice(0, 40) || undefined })} />
        </Field>
      )}
      {(block.type === "value" || block.type === "label" || block.type === "ring" || block.type === "gauge" || block.type === "weather-icon") && (
        <Field label="Text size" hint="Times the card's base size; never drawn under 11 px. Empty is the block's own size">
          <NumberInput label="Text size" value={block.scale} placeholder={String(DEFAULT_SCALE[block.type] ?? 2)} min={0.5} max={6} step={0.05} onChange={(v) => set({ scale: v })} unit="×" width={80} />
        </Field>
      )}
      {block.type === "label" && (
        <Field label="Tone">
          <Segmented label="Tone" value={block.tone ?? "fg"} options={[{ value: "fg", label: "Text" }, { value: "muted", label: "Muted" }, { value: "accent", label: "Accent" }]} onChange={(v) => set({ tone: v === "fg" ? undefined : v })} />
        </Field>
      )}
      {block.type === "row" && (
        <>
          <Field label="Direction">
            <Segmented label="Direction" value={block.direction ?? "row"} options={[{ value: "row", label: "Row" }, { value: "column", label: "Column" }]} onChange={(v) => set({ direction: v === "row" ? undefined : v })} />
          </Field>
          <Field label="Gap">
            <NumberInput label="Gap" value={block.gap} min={0} max={24} onChange={(v) => set({ gap: v })} unit="px" />
          </Field>
        </>
      )}
      {(block.type === "sparkline" || block.type === "bar") && (
        <Field label="Style">
          <Segmented
            label="Style"
            value={block.style ?? (block.type === "bar" ? "bar" : "area")}
            options={block.type === "bar" ? [{ value: "bar", label: "Bar" }, { value: "segments", label: "Segments" }] : [{ value: "line", label: "Line" }, { value: "area", label: "Area" }, { value: "bars", label: "Bars" }]}
            onChange={(v) => set({ style: v })}
          />
        </Field>
      )}
      {block.type === "heatmap" && (
        <Field label="Columns">
          <NumberInput label="Columns" value={block.columns} min={1} max={24} onChange={(v) => set({ columns: v })} />
        </Field>
      )}
      {block.type === "image" && (
        <>
          <Field label="Picture">
            <span className="max-w-[120px] truncate font-ui-mono text-micro text-ui-3">{block.file.slice(7)}</span>
            <label className="cursor-pointer rounded-ui-md border border-ui-strong px-2.5 py-1 text-body text-ui-1 hover:border-ui-hover-edge">
              Choose…
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && props.onImage(e.target.files[0])} />
            </label>
          </Field>
          <Field label="Fit">
            <Segmented label="Fit" value={block.fit ?? "contain"} options={[{ value: "contain", label: "Whole" }, { value: "cover", label: "Fill" }]} onChange={(v) => set({ fit: v })} />
          </Field>
        </>
      )}
      {block.type === "card" && path.length === 0 && <SizeRows recipe={recipe} onChange={onChange} />}
      {path.length > 0 && (
        <>
          <Heading>When it shows</Heading>
          <WhenRows recipe={recipe} path={path} block={block} onChange={onChange} />
          <Field label="Share of its row">
            <NumberInput label="Share of its row" value={block.grow ?? 1} min={0} max={12} step={0.1} onChange={(v) => set({ grow: v === 1 ? undefined : v })} />
          </Field>
        </>
      )}
      <p className="mt-3 text-caption leading-snug text-ui-3">Colours come from the screen's theme, so the widget matches any theme or pack</p>
    </div>
  );
}
