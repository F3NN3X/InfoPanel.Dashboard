import { useState } from "react";
import { Search } from "lucide-react";
import { CARDS_ID, type Placement } from "@/lib/layout";
import type { UserPanelPreset } from "@/lib/panel-model";
import { allPanelPresets, type PanelPreset } from "@/lib/panelPresets";
import { cn } from "@/lib/utils";
import { InsertRow, type InsertContext } from "./insert-row";
import { ALL_MODULES } from "./studio-modules";

export type { InsertContext } from "./insert-row";

export const INSERT_CATEGORIES = [
  "All",
  "Layouts",
  "My panels",
  "System",
  "Media",
  "Network",
  "Info",
  "Other",
] as const;
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

/** Category per built-in panel preset id; anything not listed is "Other". */
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

/** A panel preset's category: saved panels, layout starters, else by id. */
function presetCategory(p: PanelPreset): InsertCategory {
  if (p.user) return "My panels";
  if (p.id.startsWith("layout-")) return "Layouts";
  return PRESET_CATEGORIES[p.id] ?? "Other";
}

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

/** Every widget, layout starter, panel preset and saved panel, categorised. */
export function insertables(saved?: UserPanelPreset[]): Insertable[] {
  return [
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
    ...allPanelPresets(saved).map(
      (p): Insertable => ({
        kind: "panel",
        id: p.id,
        title: p.title,
        description: p.description,
        cols: p.colSpan,
        rows: p.rowSpan,
        category: presetCategory(p),
        preset: p,
      })
    ),
  ];
}

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
  /** Rename / delete a saved panel (its row's "⋯"). */
  onRenamePreset?: (id: string, name: string) => void;
  onDeletePreset?: (id: string) => void;
}

const SECTION_LABEL = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const NOTE = "text-xs text-muted-foreground/60";

/**
 * The insertable widgets, layout starters, panels and saved panels in
 * sections. Reusable outside the drawer (the widget picker passes
 * `context="picker"`).
 */
export function InsertList({
  items,
  onPick,
  placements = [],
  context,
  onRenamePreset,
  onDeletePreset,
}: InsertListProps) {
  const inDrawer = context === "drawer";
  const panels = items.filter((i) => i.kind === "panel");
  const sections = [
    { title: "Widgets", items: items.filter((i) => i.kind === "module") },
    { title: "Layouts", items: panels.filter((i) => i.category === "Layouts") },
    { title: "Panels", items: panels.filter((i) => i.category !== "Layouts" && i.category !== "My panels") },
    { title: "My panels", items: panels.filter((i) => i.category === "My panels") },
  ];
  const notes: Record<string, string> = {
    Widgets: inDrawer
      ? "Numbers are the minimum zone size (grid cells). Drop a widget, or draw a zone first and assign it from the inspector."
      : "Numbers are the minimum zone size (grid cells); the zone grows to fit.",
    Layouts: "Sensor-free starters: bind each widget in the inspector.",
    Panels: inDrawer
      ? "Panels are groups of widgets. Drop one, then bind, reorder and style each widget in the inspector."
      : "Panels are groups of widgets. Bind, reorder and style each widget in the inspector.",
    "My panels": "Saved with the panel's ⋯ › Save as panel preset.",
  };
  const row = (item: Insertable) => (
    <InsertRow
      key={`${item.kind}:${item.id}`}
      item={item}
      count={item.kind === "module" ? placements.filter((p) => p.module === item.id).length : 0}
      context={context}
      onPick={() => onPick(item)}
      saved={
        item.category === "My panels" && onRenamePreset && onDeletePreset
          ? { onRename: (name) => onRenamePreset(item.id, name), onDelete: () => onDeletePreset(item.id) }
          : undefined
      }
    />
  );
  if (items.length === 0) return <p className={NOTE}>Nothing matches.</p>;
  return (
    <div className="space-y-4">
      {sections
        .filter((s) => s.items.length > 0)
        .map((s) => (
          <section key={s.title} className="space-y-2">
            <div className={SECTION_LABEL}>{s.title}</div>
            {s.items.map(row)}
            <p className={NOTE}>{notes[s.title]}</p>
          </section>
        ))}
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
  /** The user's saved panels (`config.panelPresets`). */
  savedPanels?: UserPanelPreset[];
  onAddModule: (module: string) => void;
  onAddPreset: (preset: PanelPreset) => void;
  onRenamePreset: (id: string, name: string) => void;
  onDeletePreset: (id: string) => void;
}

/** The Add drawer: search and filter widgets and panels, drag or add them. */
export function InsertPanel({
  placements,
  savedPanels,
  onAddModule,
  onAddPreset,
  onRenamePreset,
  onDeletePreset,
}: InsertPanelProps) {
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
        items={filterInsertables(insertables(savedPanels), query, category)}
        placements={placements}
        context="drawer"
        onPick={(item) =>
          item.kind === "panel" ? onAddPreset(item.preset) : onAddModule(item.id)
        }
        onRenamePreset={onRenamePreset}
        onDeletePreset={onDeletePreset}
      />
    </div>
  );
}
