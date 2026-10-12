import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CloudUpload,
  Cpu,
  Database,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Puzzle,
  Search,
  Server,
  type LucideIcon,
} from "lucide-react";
import { ContextMenu, type ContextMenuEntry } from "@/components/ui/context-menu";
import {
  CATEGORIES,
  type DataContainer,
  type DataSource,
  type Health,
  type SourceCategory,
} from "@/lib/data-points";
import { sourcePrefKey, type SourcePref } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { Scope } from "./explorer-model";
import { HEALTH_LABEL, StatusDot, CAPTION } from "./explorer-parts";

const CATEGORY_ICON: Record<SourceCategory, LucideIcon> = {
  "Built-in": Server,
  Plugins: Puzzle,
  "Hardware monitors": Cpu,
  "Pushed via API": CloudUpload,
};

const HEALTHS: Health[] = ["ok", "warn", "off"];

interface SourceTreeProps {
  /** Sources after the filter field and health chip. */
  sources: DataSource[];
  counts: Record<Health, number>;
  totalPoints: number;
  scope: Scope;
  onScope: (scope: Scope) => void;
  query: string;
  onQuery: (query: string) => void;
  health: Health | null;
  onHealth: (health: Health | null) => void;
  sourcePrefs: Record<string, SourcePref> | undefined;
  onPrefsChange: (key: string, pref: Partial<SourcePref>) => void;
}

interface PrefMenu {
  x: number;
  y: number;
  key: string;
}

/**
 * The preference key a tree row edits: a plugin's container (its source row
 * when it has just one), or any other source as a whole, as the old panel did.
 */
function prefKeyOf(s: DataSource, c?: DataContainer): string | null {
  if (s.category !== "Plugins") return c ? null : sourcePrefKey(s.id, "");
  const container = c ?? (s.containers.length === 1 ? s.containers[0] : undefined);
  return container ? sourcePrefKey(s.id, container.id.slice(s.id.length + 1)) : null;
}

/** The explorer's left column: filter, health chips, "All data points" and the categorised sources. */
export function SourceTree({
  sources,
  counts,
  totalPoints,
  scope,
  onScope,
  query,
  onQuery,
  health,
  onHealth,
  sourcePrefs,
  onPrefsChange,
}: SourceTreeProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<PrefMenu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const searching = query.trim() !== "";

  /** The label, overflow menu and rename field of the row that edits preference `key`. */
  const prefProps = (key: string | null, name: string) => {
    const pref = key ? sourcePrefs?.[key] : undefined;
    return {
      label: pref?.displayName?.trim() || name,
      muted: pref?.enabled === false,
      onMenu:
        key === null ? undefined : (rect: DOMRect) => setMenu({ x: rect.left, y: rect.bottom + 4, key }),
      rename:
        key !== null && renaming === key
          ? {
              value: pref?.displayName ?? "",
              placeholder: name,
              onCommit: (value: string) => {
                setRenaming(null);
                onPrefsChange(key, { displayName: value.trim() || undefined });
              },
              onCancel: () => setRenaming(null),
            }
          : undefined,
    };
  };

  const menuEntries = (m: PrefMenu): ContextMenuEntry[] => {
    const enabled = sourcePrefs?.[m.key]?.enabled !== false;
    return [
      {
        id: "visibility",
        label: enabled ? "Hide in dashboard" : "Show in dashboard",
        icon: enabled ? <EyeOff /> : <Eye />,
        onSelect: () => onPrefsChange(m.key, { enabled: !enabled }),
      },
      { id: "rename", label: "Rename…", icon: <Pencil />, onSelect: () => setRenaming(m.key) },
    ];
  };

  return (
    <div className="flex w-[264px] shrink-0 flex-col border-r border-ui-subtle bg-ui-panel font-ui">
      <div className="space-y-2 border-b border-ui-subtle p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-4" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Filter sources"
            aria-label="Filter sources"
            className="h-8 w-full rounded-md border border-ui-default bg-ui-app pl-8 pr-2 text-[12.5px] text-ui-1 placeholder:text-ui-5 focus:border-ui-accent/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HEALTHS.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={health === h}
              onClick={() => onHealth(health === h ? null : h)}
              className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11.5px] transition-colors",
                health === h ? "border-ui-accent/50 bg-ui-accent-soft text-ui-1" : "border-ui-default text-ui-3 hover:bg-ui-hover"
              )}
            >
              <StatusDot health={h} />
              {counts[h]} {HEALTH_LABEL[h]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        <Row
          selected={scope.kind === "all"}
          onClick={() => onScope({ kind: "all" })}
          icon={Database}
          label="All data points"
          count={totalPoints}
          indent={12}
        />
        {sources.length === 0 && (
          <div className="px-4 py-3 text-xs text-ui-4">No sources match.</div>
        )}
        {CATEGORIES.map((category) => {
          const inCategory = sources.filter((s) => s.category === category);
          if (inCategory.length === 0) return null;
          return (
            <div key={category}>
              <div className={cn(CAPTION, "px-3 pb-1 pt-3")}>{category}</div>
              {inCategory.map((s) => {
                const expandable = s.containers.length > 1;
                const expanded = expandable && (searching || open[s.id] === true);
                return (
                  <div key={s.id}>
                    <Row
                      selected={scope.kind === "source" && scope.id === s.id}
                      onClick={() => onScope({ kind: "source", id: s.id })}
                      icon={CATEGORY_ICON[category]}
                      {...prefProps(prefKeyOf(s), s.name)}
                      count={s.count}
                      status={s.status}
                      indent={12}
                      chevron={expandable ? (expanded ? "open" : "closed") : undefined}
                      chevronDisabled={searching}
                      onChevron={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
                    />
                    {expanded &&
                      s.containers.map((c) => (
                        <Row
                          key={c.id}
                          selected={scope.kind === "container" && scope.id === c.id}
                          onClick={() => onScope({ kind: "container", id: c.id, sourceId: s.id })}
                          {...prefProps(prefKeyOf(s, c), c.title)}
                          count={c.points.length}
                          status={c.status}
                          indent={46}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} entries={menuEntries(menu)} onClose={() => setMenu(null)} />}
    </div>
  );
}

interface RowProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  count: number;
  indent: number;
  icon?: LucideIcon;
  status?: Health;
  muted?: boolean;
  chevron?: "open" | "closed";
  /** A filtered tree is forced open, so the chevron has nothing to do. */
  chevronDisabled?: boolean;
  onChevron?: () => void;
  /** Opens the row's show / rename menu, anchored at its button. */
  onMenu?: (anchor: DOMRect) => void;
  /** Swaps the label for a text field. */
  rename?: { value: string; placeholder: string; onCommit: (value: string) => void; onCancel: () => void };
}

function Row({
  selected,
  onClick,
  label,
  count,
  indent,
  icon: Icon,
  status,
  muted,
  chevron,
  chevronDisabled,
  onChevron,
  onMenu,
  rename,
}: RowProps) {
  const Chevron = chevron === "open" ? ChevronDown : ChevronRight;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ paddingLeft: indent }}
      className={cn(
        "flex h-8 cursor-pointer items-center gap-2 pr-3 text-[12.5px] transition-colors",
        selected ? "bg-ui-active text-ui-1" : "text-ui-2 hover:bg-ui-hover"
      )}
    >
      {chevron ? (
        <button
          type="button"
          aria-label={`${chevron === "open" ? "Collapse" : "Expand"} ${label}`}
          aria-expanded={chevron === "open"}
          disabled={chevronDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onChevron?.();
          }}
          className="-ml-1 flex h-5 w-4 items-center justify-center text-ui-4 hover:text-ui-1 disabled:opacity-40 disabled:hover:text-ui-4"
        >
          <Chevron className="h-3.5 w-3.5" />
        </button>
      ) : (
        Icon && indent < 40 && <span className="-ml-1 w-4" />
      )}
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-ui-4" />}
      {rename ? (
        <input
          autoFocus
          defaultValue={rename.value}
          placeholder={rename.placeholder}
          aria-label={`Display name for ${rename.placeholder}`}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => rename.onCommit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.stopPropagation();
              e.currentTarget.value = rename.value; // the blur that follows must not save the edit
              rename.onCancel();
            }
          }}
          className="h-6 min-w-0 flex-1 rounded border border-ui-default bg-ui-app px-1.5 text-[12px] text-ui-1 placeholder:text-ui-5 focus:border-ui-accent/60 focus:outline-none"
        />
      ) : (
        <span className={cn("min-w-0 flex-1 truncate", muted && "text-ui-4 line-through")}>{label}</span>
      )}
      <span className="font-ui-mono text-[11px] tabular-nums text-ui-4">{count}</span>
      {onMenu && (
        <button
          type="button"
          aria-label={`Options for ${label}`}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e.currentTarget.getBoundingClientRect());
          }}
          className="-mr-1 flex h-5 w-5 items-center justify-center rounded text-ui-4 hover:bg-ui-active hover:text-ui-1"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      )}
      {status && <StatusDot health={status} />}
    </div>
  );
}
