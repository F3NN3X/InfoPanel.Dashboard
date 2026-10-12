import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Copy, Link2, Search } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import type { DataPoint } from "@/lib/data-points";
import type { UsageIndex } from "@/lib/data-usage";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import {
  GROUP_ROW_H,
  POINT_ROW_H,
  displayValue,
  rowAt,
  rowOffsets,
  stickyIndex,
  windowRange,
  type TableRow,
  type TypeFilter,
} from "./explorer-model";
import { Chip, TypeIcon, ToggleChip } from "./explorer-parts";
import { useCopy } from "./use-copy";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "number", label: "Numbers" },
  { value: "text", label: "Text" },
  { value: "list", label: "Lists" },
  { value: "url", label: "Links" },
];

interface PointTableProps {
  breadcrumb: string;
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
  breadcrumb,
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
  const cols = showUsedBy ? "grid-cols-[1.5fr_1fr_110px_56px]" : "grid-cols-[1.5fr_1fr_56px]";
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-ui-app font-ui">
      <div className="space-y-2.5 border-b border-ui-subtle px-4 py-3">
        <div className="flex items-baseline gap-2 text-[12.5px]">
          <span className="min-w-0 truncate font-medium text-ui-1">{breadcrumb}</span>
          <span className="shrink-0 text-ui-4">
            {shown} of {total}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-4" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search key, name or value"
              aria-label="Search key, name or value"
              className="h-8 w-full rounded-md border border-ui-default bg-ui-panel pl-8 pr-2 text-[12.5px] text-ui-1 placeholder:text-ui-5 focus:border-ui-accent/60 focus:outline-none"
            />
          </div>
          <Segmented label="Type" options={TYPE_OPTIONS} value={type} onChange={onType} />
          <ToggleChip active={hideEmpty} onClick={() => onHideEmpty(!hideEmpty)}>
            Hide empty
          </ToggleChip>
          <ToggleChip active={inUse} onClick={() => onInUse(!inUse)}>
            In use
          </ToggleChip>
        </div>
      </div>

      <div className={cn("grid gap-3 border-b border-ui-subtle px-4 py-1.5 text-[11px] text-ui-4", cols)}>
        <span>Data point</span>
        <span>Live value</span>
        {showUsedBy && <span>Used by</span>}
        <span />
      </div>

      {rows.length === 0 ? (
        <div className="p-8 text-center text-[12.5px] text-ui-4">No data points match these filters.</div>
      ) : (
        <VirtualRows
          rows={rows}
          renderPoint={(p) => (
            <PointRow
              point={p}
              cols={cols}
              values={values}
              usage={usage}
              selected={p.key === selectedKey}
              onSelect={onSelect}
              showUsedBy={showUsedBy}
            />
          )}
        />
      )}
    </div>
  );
}

interface VirtualRowsProps {
  rows: TableRow[];
  renderPoint: (point: DataPoint) => ReactNode;
}

/** A fixed-row-height window over the flat list; the current group header stays pinned on top. */
function VirtualRows({ rows, renderPoint }: VirtualRowsProps) {
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
          <GroupHeader row={pinned} />
        </div>
      )}
      <div className="relative" style={{ height: offsets[offsets.length - 1] }}>
        {rows.slice(start, end).map((row, i) => (
          <div
            key={row.kind === "group" ? `g:${row.id}` : row.point.key}
            className="absolute inset-x-0"
            style={{ top: offsets[start + i], height: row.kind === "group" ? GROUP_ROW_H : POINT_ROW_H }}
          >
            {row.kind === "group" ? <GroupHeader row={row} /> : renderPoint(row.point)}
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupHeader({ row }: { row: Extract<TableRow, { kind: "group" }> }) {
  return (
    <div
      style={{ height: GROUP_ROW_H }}
      className="flex items-center gap-2 border-b border-ui-subtle bg-ui-chrome px-4 text-[11px] font-medium uppercase tracking-wider text-ui-4"
    >
      <span className="truncate">{row.label}</span>
      <span className="font-ui-mono normal-case tracking-normal">{row.count}</span>
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
}

function PointRow({ point, cols, values, usage, selected, onSelect, showUsedBy }: PointRowProps) {
  const copy = useCopy();
  const used = usage.byKey.get(point.key)?.length ?? 0;
  const value = displayValue(point, values);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected}
      onClick={() => onSelect(point.key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(point.key);
        }
      }}
      style={{ height: POINT_ROW_H }}
      className={cn(
        "grid cursor-pointer items-center gap-3 border-b border-ui-subtle px-4 transition-colors",
        cols,
        selected ? "bg-ui-active" : "hover:bg-ui-hover"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TypeIcon type={point.type} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] text-ui-1">{point.name}</span>
            {point.kind && <Chip>{point.kind}</Chip>}
          </div>
          <div className="truncate font-ui-mono text-[10.5px] text-ui-5">{point.key}</div>
        </div>
      </div>
      <span title={value} className={cn("truncate font-ui-mono text-[12px]", value ? "text-ui-2" : "text-ui-5")}>
        {value.split("\n")[0] || "—"}
      </span>
      {showUsedBy && (
        <span className={cn("text-[11.5px]", used > 0 ? "text-ui-accent-text" : "text-ui-5")}>
          {used > 0 ? `${used} widget${used > 1 ? "s" : ""}` : "—"}
        </span>
      )}
      <div className="flex justify-end gap-0.5">
        <button
          type="button"
          aria-label="Copy key"
          title="Copy key"
          onClick={(e) => {
            e.stopPropagation();
            copy(point.key);
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-ui-4 hover:bg-ui-active hover:text-ui-1"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Bind"
          title="Bind"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(point.key);
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-ui-4 hover:bg-ui-active hover:text-ui-1"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
