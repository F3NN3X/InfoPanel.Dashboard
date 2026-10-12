import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Copy, EyeOff, Link2, Search } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import type { DataPoint } from "@/lib/data-points";
import type { UsageIndex } from "@/lib/data-usage";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import {
  GROUP_ROW_H,
  POINT_ROW_H,
  isBoundTo,
  rowAt,
  rowOffsets,
  stickyIndex,
  usedByCell,
  valueCell,
  windowRange,
  type BindOption,
  type Crumb,
  type Scope,
  type TableRow,
  type TypeFilter,
} from "./explorer-model";
import { CAPTION, Chip, TypeIcon, ToggleChip } from "./explorer-parts";
import { useCopy } from "./use-copy";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "number", label: "Numbers" },
  { value: "text", label: "Text" },
  { value: "list", label: "Lists" },
  { value: "url", label: "Links" },
];

type GroupRow = Extract<TableRow, { kind: "group" }>;

interface PointTableProps {
  crumbs: Crumb[];
  onScope: (scope: Scope) => void;
  /** A group header was clicked: scope to that container. */
  onGroup: (row: GroupRow) => void;
  /** Where a row's quick-bind button binds; null when nothing can be bound. */
  target: BindOption | null;
  onToggleBind: (point: DataPoint, bound: boolean) => void;
  shown: number;
  total: number;
  rows: TableRow[];
  values: SensorMap;
  usage: UsageIndex;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  query: string;
  onQuery: (query: string) => void;
  type: TypeFilter;
  onType: (type: TypeFilter) => void;
  hideEmpty: boolean;
  onHideEmpty: (on: boolean) => void;
  inUse: boolean;
  onInUse: (on: boolean) => void;
  /** Show the "Used by" column (hidden on narrow windows). */
  showUsedBy: boolean;
}

/** The explorer's centre column: breadcrumb, search, filters and the virtualised point list. */
export function PointTable({
  crumbs,
  onScope,
  onGroup,
  target,
  onToggleBind,
  shown,
  total,
  rows,
  values,
  usage,
  selectedKey,
  onSelect,
  query,
  onQuery,
  type,
  onType,
  hideEmpty,
  onHideEmpty,
  inUse,
  onInUse,
  showUsedBy,
}: PointTableProps) {
  const cols = showUsedBy ? "grid-cols-[1.5fr_1fr_110px_56px]" : "grid-cols-[1.4fr_1fr_56px]";
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-ui-app font-ui">
      <div className="space-y-2.5 border-b border-ui-subtle px-4 pb-2.5 pt-3">
        <div className="flex flex-wrap items-center gap-1 text-[12.5px]">
          {crumbs.map((c, i) => {
            const tone = i === crumbs.length - 1 ? "font-semibold text-ui-1" : "text-[#8f8f99]";
            return (
              <span key={`${i}:${c.label}`} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4 text-ui-5" aria-hidden />}
                {c.scope ? (
                  <button
                    type="button"
                    onClick={() => c.scope && onScope(c.scope)}
                    className={cn("rounded px-1 py-0.5 hover:bg-ui-hover", tone)}
                  >
                    {c.label}
                  </button>
                ) : (
                  <span className={cn("px-1 py-0.5", tone)}>{c.label}</span>
                )}
              </span>
            );
          })}
          <span className="ml-1.5 whitespace-nowrap font-ui-mono text-[11px] text-ui-4">
            {shown} of {total}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] max-w-[380px] flex-[1_1_220px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-4" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search key, name or value"
              aria-label="Search key, name or value"
              className="h-[30px] w-full rounded-[7px] border border-ui-default bg-ui-app pl-8 pr-2 text-[12.5px] text-ui-1 placeholder:text-ui-4 focus:border-ui-accent/60 focus:outline-none"
            />
          </div>
          <Segmented label="Type" options={TYPE_OPTIONS} value={type} onChange={onType} />
          <ToggleChip active={hideEmpty} onClick={() => onHideEmpty(!hideEmpty)}>
            <EyeOff className="h-[15px] w-[15px]" />
            Hide empty
          </ToggleChip>
          <ToggleChip active={inUse} onClick={() => onInUse(!inUse)}>
            <Link2 className="h-[15px] w-[15px]" />
            In use
          </ToggleChip>
        </div>
      </div>

      <div className={cn("grid gap-3 whitespace-nowrap border-b border-ui-subtle px-4 py-[7px]", CAPTION, cols)}>
        <span>Data point</span>
        <span>Live value</span>
        {showUsedBy && <span>Used by</span>}
        <span />
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-ui-4">No data points match these filters.</div>
      ) : (
        <VirtualRows
          key={`${crumbs.map((c) => c.label).join(">")}|${query}|${type}|${hideEmpty}|${inUse}|${shown}`}
          rows={rows}
          onGroup={onGroup}
          renderPoint={(p) => (
            <PointRow
              point={p}
              cols={cols}
              values={values}
              usage={usage}
              selected={p.key === selectedKey}
              onSelect={onSelect}
              showUsedBy={showUsedBy}
              target={target}
              onToggleBind={onToggleBind}
            />
          )}
        />
      )}
    </div>
  );
}

interface VirtualRowsProps {
  rows: TableRow[];
  onGroup: (row: GroupRow) => void;
  renderPoint: (point: DataPoint) => ReactNode;
}

/**
 * A fixed-row-height window over the flat list; the current group header stays pinned on top.
 * The caller keys it on the filters, so a new result list starts scrolled to the top.
 */
function VirtualRows({ rows, onGroup, renderPoint }: VirtualRowsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, height: 600 });
  const offsets = useMemo(() => rowOffsets(rows), [rows]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { start, end } = windowRange(offsets, view.top, view.height);
  const pinned = rows[stickyIndex(rows, rowAt(offsets, view.top))];

  return (
    <div
      ref={ref}
      onScroll={(e) => setView({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight })}
      className="relative min-h-0 flex-1 overflow-y-auto"
    >
      {pinned?.kind === "group" && (
        <div className="sticky top-0 z-10 h-0">
          <GroupHeader row={pinned} onGroup={onGroup} />
        </div>
      )}
      <div className="relative" style={{ height: offsets[offsets.length - 1] }}>
        {rows.slice(start, end).map((row, i) => (
          <div
            key={row.kind === "group" ? `g:${row.id}` : row.point.key}
            className="absolute inset-x-0"
            style={{ top: offsets[start + i], height: row.kind === "group" ? GROUP_ROW_H : POINT_ROW_H }}
          >
            {row.kind === "group" ? <GroupHeader row={row} onGroup={onGroup} /> : renderPoint(row.point)}
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupHeader({ row, onGroup }: { row: GroupRow; onGroup: (row: GroupRow) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onGroup(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onGroup(row);
        }
      }}
      style={{ height: GROUP_ROW_H }}
      className="flex cursor-pointer items-center gap-2 border-b border-ui-subtle bg-[#101013] px-4"
    >
      <span className="truncate text-[12px] font-semibold text-ui-1">{row.title}</span>
      {row.sourceName !== row.title && <span className="truncate text-[11px] text-ui-4">{row.sourceName}</span>}
      <span className="ml-auto font-ui-mono text-[10.5px] text-ui-5">{row.count}</span>
    </div>
  );
}

interface PointRowProps {
  point: DataPoint;
  cols: string;
  values: SensorMap;
  usage: UsageIndex;
  selected: boolean;
  onSelect: (key: string) => void;
  showUsedBy: boolean;
  target: BindOption | null;
  onToggleBind: (point: DataPoint, bound: boolean) => void;
}

const ROW_ACTION = "flex h-6 w-6 items-center justify-center rounded-[5px] hover:bg-[#26262c]";

function PointRow({ point, cols, values, usage, selected, onSelect, showUsedBy, target, onToggleBind }: PointRowProps) {
  const copy = useCopy();
  const usedBy = usage.byKey.get(point.key) ?? [];
  const cell = valueCell(point, values);
  const used = usedByCell(usedBy);
  const bound = isBoundTo(usedBy, target);
  const bindTitle = target ? `${bound ? "Unbind from" : "Bind to"} ${target.label}` : "Bind";
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected}
      onClick={() => onSelect(point.key)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(point.key);
        }
      }}
      style={{ height: POINT_ROW_H }}
      className={cn(
        "grid cursor-pointer items-center gap-3 border-b border-ui-raised px-4 transition-colors",
        cols,
        selected ? "bg-ui-accent/12" : "hover:bg-ui-tile"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TypeIcon type={point.type} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[12.5px] text-ui-1">{point.name}</span>
            {point.kind && <Chip>{point.kind}</Chip>}
          </div>
          <div className="truncate font-ui-mono text-[10.5px] text-ui-5">{point.key}</div>
        </div>
      </div>
      <span
        title={cell.text}
        className={cn(
          "truncate text-[12px]",
          cell.tone === "number" && "font-ui-mono text-ui-1",
          cell.tone === "text" && "text-ui-2",
          cell.tone === "empty" && "text-[#5f5f68]"
        )}
      >
        {cell.text}
      </span>
      {showUsedBy && (
        <span className={cn("truncate text-[11.5px]", used.used ? "text-ui-accent-text" : "text-[#55555e]")}>{used.text}</span>
      )}
      <div className="flex justify-end gap-0.5">
        <button
          type="button"
          aria-label={`Copy key of ${point.name}`}
          title="Copy key"
          onClick={(e) => {
            e.stopPropagation();
            copy(point.key);
          }}
          className={cn(ROW_ACTION, "text-ui-4 hover:text-ui-1")}
        >
          <Copy className="h-[15px] w-[15px]" />
        </button>
        <button
          type="button"
          aria-label={`${bindTitle}: ${point.name}`}
          aria-pressed={bound}
          title={bindTitle}
          disabled={!target}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBind(point, bound);
          }}
          className={cn(ROW_ACTION, "disabled:opacity-40", bound ? "text-ui-accent" : "text-ui-4")}
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
