import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CARDS_ID, type Placement } from "@/lib/layout";
import { panelPresets, type PanelPreset } from "@/lib/panelPresets";
import { cn } from "@/lib/utils";
import { ALL_MODULES, DND_MIME, DND_MIME_PANEL } from "./studio-modules";

export const INSERT_CATEGORIES = ["All", "System", "Media", "Network", "Info", "Other"] as const;
export type InsertCategory = (typeof INSERT_CATEGORIES)[number];

/** Category per widget module id; anything not listed is "Other". */
const MODULE_CATEGORIES: Record<string, InsertCategory> = {
  systemmodern: "System",
  hardwaremodern: "System",
  fpsmodern: "System",
  spotifymodern: "Media",
  mediamodern: "Media",
  audiomodern: "Media",
  wavelinkmodern: "Media",
  networkmodern: "Network",
  bluetoothmodern: "Network",
  weathermodern: "Info",
  vbz: "Info",
  notifications: "Info",
  textfile: "Info",
  webpage: "Info",
  [CARDS_ID]: "Other",
};

/** Category per panel preset id; anything not listed is "Other". */
const PRESET_CATEGORIES: Record<string, InsertCategory> = {
  system: "System",
  ram: "System",
  cpu: "System",
  gpu: "System",
  fps: "System",
  network: "Network",
  weather: "Info",
  clock: "Info",
};

interface InsertableBase {
  id: string;
  title: string;
  description?: string;
  /** Minimum zone footprint (grid cells). */
  cols: number;
  rows: number;
  category: InsertCategory;
}

/** Something the Add drawer can insert: a widget module or a panel preset. */
export type Insertable =
  | (InsertableBase & { kind: "module" })
  | (InsertableBase & { kind: "panel"; preset: PanelPreset });

/** Every widget and panel preset, categorised. */
export const INSERTABLES: Insertable[] = [
  ...ALL_MODULES.map(
    (m): Insertable => ({
      kind: "module",
      id: m.id,
      title: m.title,
      cols: m.minCols,
      rows: m.minRows,
      category: MODULE_CATEGORIES[m.id] ?? "Other",
    })
  ),
  ...panelPresets.map(
    (p): Insertable => ({
      kind: "panel",
      id: p.id,
      title: p.title,
      description: p.description,
      cols: p.colSpan,
      rows: p.rowSpan,
      category: PRESET_CATEGORIES[p.id] ?? "Other",
      preset: p,
    })
  ),
];

/**
 * Items matching the category ("All" = any) and every word of the query
 * (case-insensitive, against title, id and description).
 */
export function filterInsertables<T extends InsertableBase>(
  items: T[],
  query: string,
  category: InsertCategory
): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (category !== "All" && item.category !== category) return false;
    const haystack = `${item.title} ${item.id} ${item.description ?? ""}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

interface InsertListProps {
  items: Insertable[];
  /** Add the item (the "+" button, or a click when `pickOnClick`). */
  onPick: (item: Insertable) => void;
  /** Usage counts come from these (widgets only). */
  placements?: Placement[];
  /**
   * Where the list lives: the Add drawer (rows drag onto the canvas, "+"
   * adds) or the widget picker (the whole row picks for the zone).
   */
  context: InsertContext;
}

export type InsertContext = "drawer" | "picker";

/** One row: title, minimum size, usage badge and an add button. */
function InsertRow({
  item,
  count,
  context,
  onPick,
}: {
  item: Insertable;
  count: number;
  context: InsertContext;
  onPick: () => void;
}) {
  const draggable = context === "drawer";
  const pickOnClick = context === "picker";
  const hint = draggable ? "Drag onto the canvas, or click + to add" : "Click to use it for this zone";
  const thing = item.kind === "panel" ? "panel" : "widget";
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(item.kind === "panel" ? DND_MIME_PANEL : DND_MIME, item.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={pickOnClick ? onPick : undefined}
      className={cn(
        "flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs hover:border-ring/50",
        draggable && "cursor-grab active:cursor-grabbing",
        pickOnClick && "cursor-pointer"
      )}
      title={item.description ? `${item.description} — ${hint.toLowerCase()}` : hint}
    >
      <span className="truncate text-foreground/85">{item.title}</span>
      <span className="ml-2 flex shrink-0 items-center gap-1 text-muted-foreground">
        <span className="tabular-nums text-[10px] text-muted-foreground/60">
          {item.cols}×{item.rows}
        </span>
        {count > 0 && (
          <Badge variant="secondary" className="px-1.5 text-[10px]">
            {count}
          </Badge>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick();
          }}
          className="rounded p-0.5 hover:bg-accent hover:text-foreground"
          title={
            pickOnClick ? `Use this ${thing}` : item.kind === "panel" ? "Add panel to canvas" : "Add to canvas"
          }
        >
          <Plus className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

const SECTION_LABEL = "text-xs font-medium uppercase tracking-wider text-muted-foreground";

/**
 * The insertable widgets and panels in two sections. Reusable outside the
 * drawer (the widget picker passes `context="picker"`).
 */
export function InsertList({ items, onPick, placements = [], context }: InsertListProps) {
  const inDrawer = context === "drawer";
  const widgets = items.filter((i) => i.kind === "module");
  const panels = items.filter((i) => i.kind === "panel");
  const row = (item: Insertable) => (
    <InsertRow
      key={`${item.kind}:${item.id}`}
      item={item}
      count={item.kind === "module" ? placements.filter((p) => p.module === item.id).length : 0}
      context={context}
      onPick={() => onPick(item)}
    />
  );
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground/60">Nothing matches.</p>;
  return (
    <div className="space-y-4">
      {widgets.length > 0 && (
        <section className="space-y-2">
          <div className={SECTION_LABEL}>Widgets</div>
          {widgets.map(row)}
          <p className="text-xs text-muted-foreground/60">
            {inDrawer
              ? "Numbers are the minimum zone size (grid cells). Drop a widget, or draw a zone first and assign it from the inspector."
              : "Numbers are the minimum zone size (grid cells); the zone grows to fit."}
          </p>
        </section>
      )}
      {panels.length > 0 && (
        <section className="space-y-2">
          <div className={SECTION_LABEL}>Panels</div>
          {panels.map(row)}
          <p className="text-xs text-muted-foreground/60">
            {inDrawer
              ? "Panels are groups of widgets. Drop one, then bind, reorder and style each widget in the inspector."
              : "Panels are groups of widgets. Bind, reorder and style each widget in the inspector."}
          </p>
        </section>
      )}
    </div>
  );
}

/** Search box + category chips over an insertable list. */
export function InsertFilters({
  query,
  onQuery,
  category,
  onCategory,
  autoFocus,
}: {
  query: string;
  onQuery: (query: string) => void;
  category: InsertCategory;
  onCategory: (category: InsertCategory) => void;
  /** Focus the search box on mount (dialogs). */
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape" || query === "") return;
            e.stopPropagation();
            onQuery("");
          }}
          placeholder="Search widgets and panels"
          className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </label>
      <div className="flex flex-wrap gap-1">
        {INSERT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCategory(c)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              c === category
                ? "border-ring bg-accent text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

interface InsertPanelProps {
  /** The active profile's placements (usage counts). */
  placements: Placement[];
  onAddModule: (module: string) => void;
  onAddPreset: (preset: PanelPreset) => void;
}

/** The Add drawer: search and filter widgets and panels, drag or add them. */
export function InsertPanel({ placements, onAddModule, onAddPreset }: InsertPanelProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<InsertCategory>("All");
  return (
    <div className="space-y-3 p-3">
      <InsertFilters
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
      />
      <InsertList
        items={filterInsertables(INSERTABLES, query, category)}
        placements={placements}
        context="drawer"
        onPick={(item) =>
          item.kind === "panel" ? onAddPreset(item.preset) : onAddModule(item.id)
        }
      />
    </div>
  );
}
