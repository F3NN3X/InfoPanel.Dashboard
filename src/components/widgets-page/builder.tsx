// The recipe builder (Phase 5b, screenshots 04-08): Layers and "Add a block" on the left, the stage at a chosen zone size in the
// middle ("Preview in <theme>", Live data or Sample, the validation line), the inspector's Block, Options and Presets tabs on the
// right. The page holds each open recipe's history (undo, redo) so its tabs keep their own; Save stores it through /api/widgets.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, CircleAlert, CircleCheck, Link2, MonitorUp, Pencil, Redo2, Save, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Segmented } from "@/components/ui/segmented";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs } from "@/components/ui/tabs";
import { BarFill, PageBar } from "@/components/studio/page-bar";
import { useSensors } from "@/hooks/useSensors";
import { withHwinfoAliases } from "@/lib/hwinfo-aliases";
import type { Appearance } from "@/lib/style-resolve";
import { skinLabel } from "@/lib/theme-skins";
import { cn } from "@/lib/utils";
import { GALLERY_IDS } from "@/components/studio/look-gallery-model";
import { SAMPLE_THEMES } from "@/looks/sample-themes";
import type { Data } from "@/widgets/core/types";
import type { Cells, PackageFile, Recipe } from "@/widgets/recipe/types";
import { toFlat, toNames } from "@/widgets/shared/data-adapter";
import { ADD_ORDER, addBlock, BLOCK_LABEL, blockAt, devicesIn, duplicateBlock, flatten, isBound, layerName, moveBlock, presetValues, recipeIssues, removeBlock, updateBlock, validationLine, type Path } from "./builder-model";
import { BlockIcon } from "./block-icons";
import { BlockTab } from "./block-tab";
import type { History } from "./history";
import { OptionsTab } from "./options-tab";
import { PresetsTab } from "./presets-tab";
import { RecipePreview, zonePx } from "./recipe-preview";
import { isUnsaved } from "./widgets-model";

/** An open recipe: its history, its images and what is stored (undefined: never saved). */
export interface Draft {
  key: string;
  history: History<Recipe>;
  images: PackageFile[];
  stored?: Recipe;
}

export interface BuilderProps {
  drafts: readonly Draft[];
  active: Draft;
  onActive: (key: string) => void;
  /** An edit of the active recipe (one undo step). */
  onEdit: (recipe: Recipe, images?: PackageFile[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
  onSave: () => void;
  /** The recipe on the server is signed (6a Q2): an edit is saved as a copy under a new id, the signed one stays as it is. */
  onSaveCopy?: () => void;
  saving: boolean;
  onExport: () => void;
  onAddToScreen: (presetId: string | null) => void;
  appearance?: Appearance;
  pageStyle?: CSSProperties;
  onOpenSources: () => void;
}

type Tab = "block" | "options" | "presets";

/** "Preview in": Classic, then the skin and sample Looks, by name. */
const LOOKS = GALLERY_IDS.map((id) => ({ value: id, label: id === "classic" ? "Classic" : (SAMPLE_THEMES.find((t) => t.id === id)?.name ?? skinLabel(id)) }));

/** The sizes the stage offers: the smallest, each preset's, the largest and the one it shows, smallest first (at most six). */
export function stageSizes(recipe: Recipe, shown?: Cells): Cells[] {
  const all = [recipe.size.min, recipe.size.default, ...recipe.presets.map((p) => p.size), recipe.size.max, ...(shown ? [shown] : [])];
  const seen = new Map(all.map((c) => [`${c[0]}x${c[1]}`, c] as const));
  return [...seen.values()].sort((a, b) => a[0] * a[1] - b[0] * b[1] || a[0] - b[0]).slice(0, 6);
}

/** The draft's state line: what saving means now. */
function savedChip(d: Draft): { text: string; tone: "neutral" | "warn" } {
  if (!d.stored) return { text: "Not saved yet", tone: "warn" };
  return isUnsaved(d) ? { text: "Unsaved changes", tone: "warn" } : { text: "Recipe · saved", tone: "neutral" };
}

function Layers({ recipe, path, onSelect, onRemove, onMove }: { recipe: Recipe; path: Path; onSelect: (p: number[]) => void; onRemove: (p: number[]) => void; onMove: (p: number[], by: -1 | 1) => void }) {
  const rows = flatten(recipe);
  return (
    <ul aria-label="Layers" className="flex flex-col gap-0.5">
      {rows.map(({ block, path: at, depth }) => {
        const selected = at.join(".") === path.join(".");
        return (
          <li key={at.join(".") || "root"}>
            <button
              type="button"
              aria-current={selected || undefined}
              data-layer={at.join(".")}
              onClick={() => onSelect(at)}
              onKeyDown={(e) => {
                if ((e.key === "Delete" || e.key === "Backspace") && at.length) {
                  e.preventDefault();
                  onRemove(at);
                }
                if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                  e.preventDefault();
                  onMove(at, e.key === "ArrowUp" ? -1 : 1);
                }
              }}
              className={cn(
                "flex h-[34px] w-full items-center gap-2.5 rounded-ui-md pr-2 text-left text-body focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-accent",
                selected ? "bg-ui-active text-ui-1" : "text-ui-2 hover:bg-ui-raised hover:text-ui-1",
              )}
              style={{ paddingLeft: 10 + Math.min(depth, 4) * 16 }}
            >
              <span className={cn("shrink-0", selected ? "text-ui-accent-icon" : "text-ui-3")}>
                <BlockIcon block={block} className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">{layerName(recipe, block)}</span>
              {isBound(block) && <Link2 className="h-3.5 w-3.5 shrink-0 text-ui-hint" strokeWidth={1.5} aria-label="Bound to data" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The selected block's box on the stage, in the zone's own px, with its name over it. */
/** The room the selection's name tag takes beside its block, in the zone's px (11 px text, its padding and gap). */
const TAG_ROOM = 24;

function Selection({ zone, path, recipe, tick }: { zone: HTMLElement | null; path: Path; recipe: Recipe; tick: unknown }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number; zoneH: number } | null>(null);
  useLayoutEffect(() => {
    const at = path.join(".");
    const el = at ? zone?.querySelector<HTMLElement>(`[data-recipe-path="${at}"]`) : zone?.querySelector<HTMLElement>("[data-part='card']");
    if (!zone || !el) return setBox(null);
    const z = zone.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const scale = z.width / zone.offsetWidth || 1;
    setBox({ x: (r.left - z.left) / scale, y: (r.top - z.top) / scale, w: r.width / scale, h: r.height / scale, zoneH: zone.offsetHeight });
  }, [zone, path.join("."), tick]);
  const b = blockAt(recipe, path);
  if (!box || !b || !path.length) return null;
  // the name tag goes under the block where the zone has room for it, else over it, else inside its corner: never over what is
  // drawn under the blocks (the weather credit line sits right under a Repeat that fills the card)
  const tag = box.zoneH - (box.y + box.h) >= TAG_ROOM ? "left-0 top-full mt-1" : box.y >= TAG_ROOM ? "left-0 bottom-full mb-1" : "left-1 top-1";
  return (
    <div aria-hidden className="pointer-events-none absolute z-10" style={{ left: box.x - 3, top: box.y - 3, width: box.w + 6, height: box.h + 6 }}>
      <div className="h-full w-full rounded-[6px] border-2 border-ui-accent" />
      <span data-selection-tag="" className={`absolute ${tag} whitespace-nowrap rounded-[4px] bg-ui-accent px-1.5 py-0.5 font-ui text-[11px] font-medium text-white`}>{layerName(recipe, b)}</span>
    </div>
  );
}

export function Builder(p: BuilderProps) {
  const recipe = p.active.history.present;
  const [path, setPath] = useState<number[]>([]);
  const [tab, setTab] = useState<Tab>("block");
  const [size, setSize] = useState<Cells>(recipe.size.default);
  const [live, setLive] = useState(true);
  const [lookId, setLookId] = useState("classic");
  const [preset, setPreset] = useState<string | null>(recipe.presets.find((x) => x.default)?.id ?? null);
  const [name, setName] = useState<string | null>(null);
  const zoneHost = useRef<HTMLDivElement>(null);
  const [stageBox, setStageBox] = useState({ w: 700, h: 600 });
  const stageRef = useRef<HTMLDivElement>(null);

  // the stage follows the size of the preset it shows when that changes
  const presetSize = recipe.presets.find((x) => x.id === preset)?.size.join("x");
  useEffect(() => {
    if (presetSize) setSize(presetSize.split("x").map(Number) as Cells);
  }, [presetSize]);

  // a different recipe (a tab, a new one) starts at its own default
  useEffect(() => {
    setPath([]);
    setSize(recipe.size.default);
    const d = recipe.presets.find((x) => x.default);
    setPreset(d?.id ?? null);
  }, [p.active.key]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStageBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // the readings the stage and the Block tab show: live (HWiNFO under the Libre keys too), else the recipe's sample
  const sensors = useSensors(null);
  const liveData = useMemo(() => toFlat(withHwinfoAliases(sensors)) as Data, [sensors]);
  const names = useMemo(() => toNames(withHwinfoAliases(sensors)) as Record<string, string>, [sensors]);
  const sampleData = useMemo(() => Object.fromEntries(Object.entries(recipe.sample.sensors).map(([k, v]) => [k, String(v)])) as Data, [recipe.sample.sensors]);
  const data = live ? liveData : sampleData;
  const devices = useMemo(() => devicesIn({ ...sampleData, ...liveData }), [sampleData, liveData]);
  const issues = useMemo(() => recipeIssues(recipe, p.active.images), [recipe, p.active.images]);
  const line = validationLine(recipe, issues);
  const chip = savedChip(p.active);
  const sizes = stageSizes(recipe, size);
  // the stage shows the picked preset (its values change in the Presets tab), else the options' defaults
  const shownValues = presetValues(recipe, recipe.presets.find((x) => x.id === preset));

  // Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y) outside a text field
  const keys = useRef<BuilderProps & { duplicate?: () => void }>(p);
  keys.current = { ...p, duplicate: keys.current.duplicate };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!(e.ctrlKey || e.metaKey) || t?.closest("input, textarea, select, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) keys.current.onUndo();
      else if (k === "d") keys.current.duplicate?.();
      else if ((k === "z" && e.shiftKey) || k === "y") keys.current.onRedo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const firstSensor = Object.keys(live ? liveData : sampleData).find((k) => k.endsWith("_cpu_total")) ?? Object.keys(liveData)[0] ?? "libre.cpu_total";
  const add = (type: (typeof ADD_ORDER)[number]) => {
    const r = addBlock(recipe, path, type, firstSensor);
    p.onEdit(r.recipe);
    setPath(r.path);
    setTab("block");
  };
  const remove = (at: number[]) => {
    const r = removeBlock(recipe, at);
    p.onEdit(r.recipe);
    setPath(r.path);
  };
  const duplicate = (at: number[]) => {
    const r = duplicateBlock(recipe, at);
    p.onEdit(r.recipe);
    setPath(r.path);
  };
  keys.current.duplicate = () => path.length > 0 && duplicate(path);
  const move = (at: number[], by: -1 | 1) => {
    const r = moveBlock(recipe, at, by);
    p.onEdit(r.recipe);
    setPath(r.path);
  };
  const pickPreset = (id: string) => {
    const x = recipe.presets.find((q) => q.id === id);
    setPreset(id);
    if (x) setSize(x.size);
  };
  const onImage = (file: File) => {
    void file.arrayBuffer().then((buf) => {
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
      const stem = file.name.toLowerCase().replace(/\.[a-z]+$/, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "image";
      const path2 = `images/${stem}.${ext}`;
      const images = [...p.active.images.filter((f) => f.path !== path2), { path: path2, bytes: new Uint8Array(buf) }];
      const used = new Set(flatten(recipe).flatMap(({ block }) => (block.type === "image" ? [block.file] : [])));
      p.onEdit(blockAt(recipe, path)?.type === "image" ? updateBlock(recipe, path, { file: path2 }) : recipe, images.filter((f) => used.has(f.path) || f.path === path2));
    });
  };
  const { w, h } = zonePx(size);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ui-app font-ui">
      <PageBar>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
          <button type="button" onClick={p.onBack} className="h-8 rounded-ui-sm px-1.5 text-body text-ui-3 hover:text-ui-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
            Widgets
          </button>
          <ChevronRight className="h-4 w-4 shrink-0 text-ui-hint" aria-hidden />
          <label className="relative flex min-w-0 items-center">
            <input
              aria-label="Widget name"
              value={name ?? recipe.name}
              onFocus={() => setName(recipe.name)}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              onBlur={() => {
                const next = name?.trim();
                if (next && next !== recipe.name) p.onEdit({ ...recipe, name: next, root: recipe.root.title === recipe.name ? { ...recipe.root, title: next } : recipe.root });
                setName(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="h-8 w-[190px] min-w-0 rounded-ui-sm border border-transparent bg-transparent pl-1.5 pr-7 text-title font-medium text-ui-1 outline-none hover:border-ui-strong focus:border-ui-accent"
            />
            <Pencil className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ui-hint" aria-hidden />
          </label>
        </nav>
        <StatusChip tone={chip.tone} dot={false} className="border border-ui-strong bg-transparent">
          {chip.text}
        </StatusChip>
        {p.drafts.length > 1 && <Segmented label="Open recipes" size="bar" value={p.active.key} options={p.drafts.map((d) => ({ value: d.key, label: d.history.present.name.split(" · ")[0] }))} onChange={p.onActive} />}
        <BarFill />
        <IconButton label="Undo (Ctrl+Z)" size={32} disabled={!p.active.history.past.length} onClick={p.onUndo}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" size={32} disabled={!p.active.history.future.length} onClick={p.onRedo}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <span aria-hidden className="h-5 w-px bg-ui-subtle" />
        <Button variant="ghost" icon={<Upload strokeWidth={1.5} />} onClick={p.onExport} disabled={!line.ok} title={line.ok ? undefined : line.first}>
          Export
        </Button>
        {p.onSaveCopy ? (
          <Button icon={<Save strokeWidth={1.5} />} onClick={p.onSaveCopy} disabled={p.saving || !line.ok || chip.text === "Recipe · saved"} title={line.ok ? "It is signed: only its publisher's key may replace it, so the edit is saved as a new recipe" : line.first}>
            Save as a copy
          </Button>
        ) : (
          <Button icon={<Save strokeWidth={1.5} />} onClick={p.onSave} disabled={p.saving || !line.ok || chip.text === "Recipe · saved"} title={line.ok ? undefined : line.first}>
            Save
          </Button>
        )}
        <Button variant="primary" icon={<MonitorUp strokeWidth={1.5} />} onClick={() => p.onAddToScreen(preset)} disabled={p.saving || !line.ok} title={line.ok ? "Saves it, then adds it to the screen in Edit" : line.first}>
          Add to a screen
        </Button>
      </PageBar>
      <div className="flex min-h-0 flex-1">
        <aside aria-label="Layers and blocks" className="flex w-[256px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-ui-subtle bg-ui-chrome p-3">
          <div>
            <h2 className="mb-2 px-2 text-caption text-ui-3">Layers</h2>
            <Layers recipe={recipe} path={path} onSelect={(at) => (setPath(at), setTab("block"))} onRemove={remove} onMove={move} />
          </div>
          <div>
            <h2 className="mb-2 px-2 text-caption text-ui-3">Add a block</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {ADD_ORDER.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => add(type)}
                  data-add-block={type}
                  className="flex h-[60px] flex-col items-center justify-center gap-1.5 rounded-ui-md border border-ui-subtle bg-ui-panel text-micro text-ui-2 hover:border-ui-strong hover:text-ui-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent"
                >
                  <BlockIcon type={type} />
                  {BLOCK_LABEL[type]}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-body text-ui-3">Size</span>
            <Segmented label="Size" size="bar" value={`${size[0]}x${size[1]}`} options={sizes.map((c) => ({ value: `${c[0]}x${c[1]}`, label: `${c[0]}×${c[1]}` }))} onChange={(v) => setSize(v.split("x").map(Number) as Cells)} />
            <span className="ml-3 text-body text-ui-3">Preview in</span>
            <select aria-label="Preview in" value={lookId} onChange={(e) => setLookId(e.target.value)} className="h-8 rounded-ui-md border border-ui-strong bg-ui-raised px-2.5 text-body font-medium text-ui-1 outline-none focus:border-ui-accent">
              {LOOKS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <span className="ml-auto" />
            <Segmented label="Data" size="bar" value={live ? "live" : "sample"} options={[{ value: "live", label: <span className="flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ui-ok" />Live data</span> }, { value: "sample", label: "Sample" }]} onChange={(v) => setLive(v === "live")} />
          </div>
          <div
            ref={stageRef}
            role="presentation"
            data-builder-stage=""
            onClick={(e) => {
              const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-recipe-path]");
              if (hit) {
                setPath(hit.dataset.recipePath!.split(".").map(Number));
                setTab("block");
              } else if ((e.target as HTMLElement).closest("[data-recipe-zone]")) setPath([]);
            }}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-ui-lg border border-ui-subtle"
            style={{ backgroundImage: "radial-gradient(color-mix(in oklab, var(--ui-text-hint) 30%, transparent) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
          >
            <div ref={zoneHost}>
              <RecipePreview
                recipe={recipe}
                values={shownValues}
                cells={size}
                sample={!live}
                appearance={p.appearance}
                pageStyle={p.pageStyle}
                lookId={lookId}
                fit={{ w: Math.max(100, stageBox.w - 96), h: Math.max(80, stageBox.h - 96) }}
                maxScale={Math.min(1.6, 560 / w, 420 / h) > 1 ? Math.min(1.6, 560 / w, 420 / h) : 1}
                overlay={<Selection zone={zoneHost.current?.querySelector<HTMLElement>("[data-recipe-zone]") ?? null} path={path} recipe={recipe} tick={[recipe, size, live, lookId, preset, stageBox, data]} />}
              />
            </div>
          </div>
          <div role="status" data-validation="" className="flex items-center gap-2 text-caption">
            {line.ok ? <CircleCheck className="h-4 w-4 text-ui-ok" strokeWidth={1.5} aria-hidden /> : <CircleAlert className="h-4 w-4 text-ui-warn" strokeWidth={1.5} aria-hidden />}
            <span className="text-ui-2">{line.ok ? line.summary : line.first}</span>
            <span className={cn("ml-auto", issues.some((i) => i.rule === "text-floor") ? "text-ui-warn" : "text-ui-3")}>{line.floor}</span>
          </div>
        </main>
        <aside aria-label="Inspector" className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-ui-subtle bg-ui-chrome">
          <Tabs
            label="Inspector"
            className="sticky top-0 z-10 bg-ui-chrome px-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "block", label: "Block" },
              { value: "options", label: "Options" },
              { value: "presets", label: "Presets" },
            ]}
          />
          {tab === "block" && <BlockTab recipe={recipe} path={path} onChange={(r) => p.onEdit(r)} onRemove={() => remove(path)} onDuplicate={() => duplicate(path)} data={data} names={live ? names : undefined} devices={devices} onOpenSources={p.onOpenSources} onImage={onImage} />}
          {tab === "options" && <OptionsTab recipe={recipe} onChange={(r) => p.onEdit(r)} />}
          {tab === "presets" && <PresetsTab recipe={recipe} onChange={(r) => p.onEdit(r)} current={preset} onPick={pickPreset} values={shownValues} size={size} />}
        </aside>
      </div>
    </div>
  );
}
