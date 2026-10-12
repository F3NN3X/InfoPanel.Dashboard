import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Layers,
  LayoutDashboard,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { BLANK_MODULE, type Placement } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { FIELD } from "./setting-rows";
import { placementTitle } from "./studio-modules";
import { KEYS } from "./use-studio-shortcuts";
import type { ZoneRect } from "./zone-geometry";

/** The 32 px icon box of a header. */
export function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1c1c21] text-ui-2 [&>svg]:h-4 [&>svg]:w-4">
      {children}
    </span>
  );
}

const META = "truncate text-[11px] text-[#8a8a94]";
const TITLE = "truncate text-[14px] font-semibold text-ui-1";

/** Hide / Duplicate / Delete (28×28; delete turns red on hover). */
function ZoneActions({
  hidden,
  onToggleVisible,
  onDuplicate,
  onRemove,
  zoneKeys = true,
}: {
  /** Every zone acted on is hidden (the eye shows them again). */
  hidden: boolean;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** Ctrl+D / Del act on the zone (not on a selected panel widget). */
  zoneKeys?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center">
      <IconButton label={`${hidden ? "Show" : "Hide"} (${KEYS.hide})`} onClick={onToggleVisible}>
        {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </IconButton>
      <IconButton label={zoneKeys ? `Duplicate (${KEYS.duplicate})` : "Duplicate zone"} onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </IconButton>
      <IconButton label={zoneKeys ? `Delete (${KEYS.remove})` : "Delete zone"} danger onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </span>
  );
}

/**
 * "Panel › Widget" when a panel widget is selected: the zone crumb goes
 * back to the panel, the widget crumb brings its editor into view.
 */
function Breadcrumb({
  title,
  widget,
  onZone,
  onWidget,
}: {
  title: string;
  widget: string;
  onZone: () => void;
  onWidget: () => void;
}) {
  const crumb = "min-w-0 truncate rounded hover:text-ui-1 hover:underline";
  return (
    <nav aria-label="Selection" className="flex min-w-0 items-center gap-1 text-[12px]">
      <button
        type="button"
        onClick={onZone}
        title={`Select the panel (${KEYS.deselect})`}
        className={cn(crumb, "max-w-[45%] shrink-0 text-ui-4")}
      >
        {title}
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ui-5" />
      <button type="button" onClick={onWidget} title="Show the widget's settings" className={cn(crumb, "text-ui-2")}>
        {widget}
      </button>
    </nav>
  );
}

/** The single-zone header: icon, editable name, meta line, zone actions, panel crumbs. */
export function ZoneHeader({
  icon,
  name,
  placeholder,
  onName,
  meta,
  visible,
  widget,
  onZoneCrumb,
  onWidgetCrumb,
  onToggleVisible,
  onDuplicate,
  onRemove,
}: {
  icon: ReactNode;
  name: string;
  /** Shown while the name is empty (the widget's own name). */
  placeholder?: string;
  /** Rename; omitted when the zone has no name of its own (a blank zone). */
  onName?: (name: string) => void;
  meta: string;
  visible: boolean;
  /** The selected panel widget's name (a breadcrumb under the header). */
  widget?: string;
  onZoneCrumb: () => void;
  onWidgetCrumb: () => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <HeaderIcon>{icon}</HeaderIcon>
        <div className="min-w-0 flex-1">
          {onName ? (
            <input
              value={name}
              placeholder={placeholder}
              aria-label="Zone name"
              spellCheck={false}
              onChange={(e) => onName(e.target.value)}
              className={cn(
                TITLE,
                "-ml-1 block h-6 w-full rounded-md border border-transparent bg-transparent px-1 outline-none placeholder:text-ui-4 hover:border-ui-default focus:border-ui-accent"
              )}
            />
          ) : (
            <div className={TITLE}>{name}</div>
          )}
          <div className={META}>{meta}</div>
        </div>
        <ZoneActions
          hidden={!visible}
          onToggleVisible={onToggleVisible}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          zoneKeys={widget === undefined}
        />
      </div>
      {widget !== undefined && (
        <Breadcrumb title={name || placeholder || ""} widget={widget} onZone={onZoneCrumb} onWidget={onWidgetCrumb} />
      )}
    </div>
  );
}

/** Several zones: the count, removable chips and the shared actions. */
export function MultiHeader({
  zones,
  onDeselect,
  onToggleVisible,
  onDuplicate,
  onRemove,
}: {
  zones: { id: string; name: string; visible: boolean }[];
  /** Drop one zone from the selection. */
  onDeselect: (id: string) => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <HeaderIcon>
          <Layers />
        </HeaderIcon>
        <div className="min-w-0 flex-1">
          <div className={TITLE}>{zones.length} zones selected</div>
          <div className={META}>Style changes apply to all of them</div>
        </div>
        <ZoneActions
          hidden={zones.every((z) => !z.visible)}
          onToggleVisible={onToggleVisible}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {zones.map((z) => (
          <span
            key={z.id}
            className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-ui-default bg-ui-raised pl-2 pr-0.5 text-[11.5px] text-ui-2"
          >
            <span className="truncate">{z.name}</span>
            <button
              type="button"
              onClick={() => onDeselect(z.id)}
              aria-label={`Remove ${z.name} from the selection`}
              title="Remove from the selection"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ui-4 hover:bg-ui-hover hover:text-ui-1"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Nothing selected: the dashboard's header. */
export function DashboardHeader({ profileName }: { profileName: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <HeaderIcon>
        <LayoutDashboard />
      </HeaderIcon>
      <div className="min-w-0 flex-1">
        <div className={TITLE}>Dashboard</div>
        <div className={META}>{profileName} · nothing selected</div>
      </div>
    </div>
  );
}

const ZONE_FIELDS = [
  { key: "col", label: "COL" },
  { key: "row", label: "ROW" },
  { key: "cols", label: "W" },
  { key: "rows", label: "H" },
] as const;

type BoxKey = (typeof ZONE_FIELDS)[number]["key"];

/** One placement field: a draft while typing, red while the zone could not take it. */
function BoxField({
  label,
  value,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const refused = draft !== "" && Number(draft) !== value;
  return (
    <label
      title={refused ? "That spot overlaps another widget or is below the minimum size" : undefined}
      className={cn(
        "flex h-[30px] items-center gap-1.5 rounded-md border bg-ui-app px-2 focus-within:border-ui-accent",
        refused ? "border-ui-danger" : "border-ui-default"
      )}
    >
      <span className="font-ui-mono text-[10px] text-ui-4">{label}</span>
      <input
        type="number"
        min={1}
        max={max}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onCommit(Math.max(1, n));
        }}
        onBlur={() => setDraft(String(value))}
        className="w-full min-w-0 bg-transparent font-ui-mono text-[12px] text-ui-1 outline-none"
      />
    </label>
  );
}

/**
 * The placement row: column, row, width and height in cells. The studio
 * checks every value against the grid, the other zones and the minimum size.
 */
export function ZoneBoxFields({
  placement,
  cols,
  rows,
  onZoneBox,
}: {
  placement: Placement;
  cols: number;
  rows: number;
  onZoneBox: (patch: Partial<ZoneRect>) => void;
}) {
  const values: Record<BoxKey, number> = {
    col: placement.colStart,
    row: placement.rowStart,
    cols: placement.colSpan,
    rows: placement.rowSpan,
  };
  return (
    <div className="grid grid-cols-4 gap-1.5" title="Placement (grid cells)">
      {ZONE_FIELDS.map(({ key, label }) => (
        <BoxField
          key={key}
          label={label}
          value={values[key]}
          max={key === "col" || key === "cols" ? cols : rows}
          onCommit={(v) => onZoneBox({ [key]: v } as Partial<ZoneRect>)}
        />
      ))}
    </div>
  );
}

/** The zone's widget, and a button that opens the widget picker. */
export function WidgetPicker({ placement, onPickWidget }: { placement: Placement; onPickWidget: () => void }) {
  const blank = placement.module === BLANK_MODULE;
  return (
    <div className="space-y-1.5">
      <div className="text-[12.5px] text-ui-2">Widget type</div>
      <button
        type="button"
        onClick={onPickWidget}
        title="Pick a widget for this zone"
        className={cn(FIELD, "flex h-[30px] w-full items-center gap-2 text-left hover:border-ui-strong")}
      >
        <span className={cn("flex-1 truncate", blank && "text-ui-4")}>
          {blank ? "Blank — no widget" : placement.panel ? "Custom panel" : placementTitle(placement)}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-ui-4">
          {blank ? "Pick" : "Change"} <ChevronDown className="h-3 w-3" />
        </span>
      </button>
      {placement.panel && (
        <p className="text-[11px] text-ui-4">Edit the panel&apos;s widgets in Content; picking another widget replaces the panel.</p>
      )}
    </div>
  );
}

/** The settings search box; Esc clears it. */
export function SettingsSearch({ query, onQuery }: { query: string; onQuery: (query: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-4" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape" || query === "") return;
          e.stopPropagation();
          onQuery("");
        }}
        placeholder="Search settings"
        aria-label="Search settings"
        className={cn(FIELD, "h-[30px] w-full pl-8 pr-7")}
      />
      {query !== "" && (
        <button
          type="button"
          onClick={() => onQuery("")}
          title="Clear search (Esc)"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ui-4 hover:text-ui-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
