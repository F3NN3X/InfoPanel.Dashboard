import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, Search, Trash2, X } from "lucide-react";
import { BLANK_MODULE, type Placement } from "@/lib/layout";
import { placementTitle } from "./studio-modules";
import { KEYS } from "./use-studio-shortcuts";
import type { ZoneRect } from "./zone-geometry";

const ICON_BUTTON =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground";

function HeaderButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title} className={ICON_BUTTON}>
      {children}
    </button>
  );
}

const CRUMB = "min-w-0 truncate rounded hover:text-foreground hover:underline";

/**
 * "Zone › Widget" when a panel widget is selected: the zone crumb goes
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
  return (
    <nav aria-label="Selection" className="flex min-w-0 items-center gap-1 text-sm font-medium">
      <button type="button" onClick={onZone} title={`Select the panel (${KEYS.deselect})`} className={`${CRUMB} max-w-[45%] shrink-0 text-muted-foreground`}>
        {title}
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <button type="button" onClick={onWidget} title="Show the widget's settings" className={`${CRUMB} text-foreground`}>
        {widget}
      </button>
    </nav>
  );
}

/** The inspector's title row: widget name, live-sensor count, zone actions. */
export function ZoneHeader({
  title,
  widget,
  onZoneCrumb,
  onWidgetCrumb,
  sensors,
  visible,
  onToggleVisible,
  onDuplicate,
  onRemove,
  onClose,
}: {
  title: string;
  /** The selected panel widget's name (shown as a breadcrumb after the title). */
  widget?: string;
  onZoneCrumb?: () => void;
  onWidgetCrumb?: () => void;
  /** Live sensors the widget reads (undefined = not applicable). */
  sensors: number | undefined;
  visible: boolean;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  /** Ctrl+D / Del act on the zone only while no widget is selected. */
  const zoneKeys = widget === undefined;
  return (
    <div className="flex items-center gap-1">
      <div className="min-w-0 flex-1">
        {widget !== undefined && onZoneCrumb && onWidgetCrumb ? (
          <Breadcrumb title={title} widget={widget} onZone={onZoneCrumb} onWidget={onWidgetCrumb} />
        ) : (
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
        )}
        {sensors !== undefined && (
          <div className="text-[11px] text-muted-foreground">
            {sensors} live sensor{sensors === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <HeaderButton title={`${visible ? "Hide" : "Show"} (${KEYS.hide})`} onClick={onToggleVisible}>
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </HeaderButton>
      <HeaderButton title={zoneKeys ? `Duplicate (${KEYS.duplicate})` : "Duplicate zone"} onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" />
      </HeaderButton>
      <HeaderButton title={zoneKeys ? `Remove (${KEYS.remove})` : "Remove zone"} onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </HeaderButton>
      <HeaderButton title={`Deselect (${KEYS.deselect})`} onClick={onClose}>
        <X className="h-4 w-4" />
      </HeaderButton>
    </div>
  );
}

const ZONE_FIELDS = [
  { key: "col", label: "Col" },
  { key: "row", label: "Row" },
  { key: "cols", label: "W" },
  { key: "rows", label: "H" },
] as const;

/** The zone's grid box (column, row, width, height in cells) on one line. */
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
  const values: Record<(typeof ZONE_FIELDS)[number]["key"], number> = {
    col: placement.colStart,
    row: placement.rowStart,
    cols: placement.colSpan,
    rows: placement.rowSpan,
  };
  return (
    <div className="grid grid-cols-4 gap-1.5" title="Zone box (grid cells)">
      {ZONE_FIELDS.map(({ key, label }) => (
        <label
          key={key}
          className="flex items-center gap-1 rounded-md border border-border bg-background px-1.5 focus-within:border-ring"
        >
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {label}
          </span>
          <input
            type="number"
            min={1}
            max={key === "col" || key === "cols" ? cols : rows}
            value={values[key]}
            onChange={(e) =>
              onZoneBox({
                [key]: Math.max(1, parseInt(e.target.value, 10) || 1),
              } as Partial<ZoneRect>)
            }
            className="w-full min-w-0 bg-transparent py-1 text-xs tabular-nums text-foreground outline-none"
          />
        </label>
      ))}
    </div>
  );
}

/** The zone's widget, and a button that opens the widget picker. */
export function WidgetPicker({
  placement,
  onPickWidget,
}: {
  placement: Placement;
  onPickWidget: () => void;
}) {
  const blank = placement.module === BLANK_MODULE;
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">Widget</div>
      <button
        type="button"
        onClick={onPickWidget}
        title="Pick a widget for this zone"
        className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs text-foreground outline-none hover:border-ring/50 focus-visible:border-ring"
      >
        <span className={blank ? "flex-1 truncate text-muted-foreground" : "flex-1 truncate"}>
          {blank ? "Blank — no widget" : placement.panel ? "Custom panel" : placementTitle(placement)}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
          {blank ? "Pick" : "Change"} <ChevronDown className="h-3 w-3" />
        </span>
      </button>
      {placement.panel && (
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          Edit the panel&apos;s widgets below; picking another widget replaces the panel.
        </p>
      )}
    </div>
  );
}

/** The settings search box; Esc clears it. */
export function SettingsSearch({
  query,
  onQuery,
}: {
  query: string;
  onQuery: (query: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
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
        className="w-full rounded-md border border-border bg-background py-1 pl-7 pr-6 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-ring"
      />
      {query !== "" && (
        <button
          type="button"
          onClick={() => onQuery("")}
          title="Clear search (Esc)"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
