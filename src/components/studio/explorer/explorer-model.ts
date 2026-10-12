import type { SensorMap } from "@/modules/types";
import {
  searchPoints,
  type DataContainer,
  type DataPoint,
  type DataSource,
  type Health,
} from "@/lib/data-points";
import type { UsageIndex } from "@/lib/data-usage";

/** Pure filtering, grouping and windowing behind the Data Explorer. */

export type TypeFilter = "all" | "number" | "text" | "list" | "url";

/** What the tree selected: everything, one source, or one container. */
export type Scope =
  | { kind: "all" }
  | { kind: "source"; id: string }
  | { kind: "container"; id: string; sourceId: string };

export const ALL_SCOPE: Scope = { kind: "all" };

export interface PointFilter {
  scope: Scope;
  query: string;
  type: TypeFilter;
  hideEmpty: boolean;
  inUse: boolean;
  usage: UsageIndex;
}

/** Whether a point's type belongs to the table's type control. */
export function matchesType(point: DataPoint, type: TypeFilter): boolean {
  switch (type) {
    case "all":
      return true;
    case "number":
      return point.type === "number";
    case "text":
      return point.type === "text" || point.type === "bool" || point.type === "empty";
    case "list":
      return point.type === "list";
    case "url":
      return point.type === "url";
  }
}

export function inScope(point: DataPoint, scope: Scope): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "source") return point.sourceId === scope.id;
  return point.containerId === scope.id;
}

/** The table's points: scope, then search, type and the Hide empty / In use chips. */
export function filterPoints(points: readonly DataPoint[], f: PointFilter): DataPoint[] {
  const scoped = points.filter((p) => inScope(p, f.scope));
  return searchPoints(scoped, f.query).filter(
    (p) =>
      matchesType(p, f.type) &&
      (!f.hideEmpty || p.type !== "empty") &&
      (!f.inUse || (f.usage.byKey.get(p.key)?.length ?? 0) > 0)
  );
}

const fold = (text: string): string => text.toLowerCase();

/**
 * The tree after the filter field and the health chip: a source stays when
 * its name or one of its containers matches (showing only the matching
 * containers when the name does not), and when its status is the chip's.
 */
export function filterSources(
  sources: readonly DataSource[],
  query: string,
  health: Health | null
): DataSource[] {
  const q = fold(query.trim());
  return sources.flatMap((s) => {
    if (health && s.status !== health) return [];
    if (!q || fold(s.name).includes(q)) return [s];
    const containers = s.containers.filter((c) => fold(c.title).includes(q));
    return containers.length > 0 ? [{ ...s, containers }] : [];
  });
}

/** Row heights of the virtual table (px). */
export const POINT_ROW_H = 46;
export const GROUP_ROW_H = 28;

export type TableRow =
  | { kind: "group"; id: string; label: string; count: number }
  | { kind: "point"; point: DataPoint };

/** The group header text: "Source › Container", or the source alone for flat sources. */
export function groupLabel(point: DataPoint): string {
  const title = point.containerTitle.trim();
  return title && title !== point.sourceName ? `${point.sourceName} › ${title}` : point.sourceName;
}

/** Points in order, each run of one container preceded by a group header row. */
export function flattenRows(points: readonly DataPoint[]): TableRow[] {
  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.containerId, (counts.get(p.containerId) ?? 0) + 1);
  const rows: TableRow[] = [];
  let current: string | null = null;
  for (const point of points) {
    if (point.containerId !== current) {
      current = point.containerId;
      rows.push({ kind: "group", id: current, label: groupLabel(point), count: counts.get(current) ?? 0 });
    }
    rows.push({ kind: "point", point });
  }
  return rows;
}

export const rowHeight = (row: TableRow): number => (row.kind === "group" ? GROUP_ROW_H : POINT_ROW_H);

/** Top offset of every row, plus the total height as the last entry. */
export function rowOffsets(rows: readonly TableRow[]): number[] {
  const offsets = [0];
  for (const row of rows) offsets.push(offsets[offsets.length - 1] + rowHeight(row));
  return offsets;
}

/** The index of the row containing `y` (clamped), by binary search over `offsets`. */
export function rowAt(offsets: readonly number[], y: number): number {
  const count = offsets.length - 1;
  if (count <= 0) return 0;
  let lo = 0;
  let hi = count - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The rows to render for a scroll position: `[start, end)` with `overscan` rows either side. */
export function windowRange(
  offsets: readonly number[],
  scrollTop: number,
  viewportH: number,
  overscan = 6
): { start: number; end: number } {
  const count = offsets.length - 1;
  if (count <= 0) return { start: 0, end: 0 };
  const first = rowAt(offsets, Math.max(0, scrollTop));
  const last = rowAt(offsets, Math.max(0, scrollTop) + viewportH);
  return { start: Math.max(0, first - overscan), end: Math.min(count, last + 1 + overscan) };
}

/** Index of the group header governing the row at `index` (-1 before the first). */
export function stickyIndex(rows: readonly TableRow[], index: number): number {
  for (let i = Math.min(index, rows.length - 1); i >= 0; i--) {
    if (rows[i].kind === "group") return i;
  }
  return -1;
}

/** The containers of a source or the whole tree, for the group summary. */
export function scopeContainers(sources: readonly DataSource[], scope: Scope): DataContainer[] {
  if (scope.kind === "all") return sources.flatMap((s) => s.containers);
  if (scope.kind === "source") return sources.find((s) => s.id === scope.id)?.containers ?? [];
  return sources.flatMap((s) => s.containers).filter((c) => c.id === scope.id);
}

/** The longest dotted key prefix shared by the points ("" for everything), for a group stream URL. */
export function streamPrefix(points: readonly DataPoint[]): string {
  if (points.length === 0) return "";
  const first = points[0].key;
  let end = first.length;
  for (const p of points) {
    let i = 0;
    while (i < end && p.key[i] === first[i]) i++;
    end = i;
  }
  const common = first.slice(0, end);
  const dot = common.lastIndexOf(".");
  return dot >= 0 ? common.slice(0, dot + 1) : common;
}

/** The value to show for a point: the live reading when the stream has one, else the snapshot's. */
export function displayValue(point: DataPoint, values: SensorMap): string {
  const live = values[point.key];
  if (!live) return point.raw;
  if (typeof live.value === "number") return live.unit ? `${live.value} ${live.unit}` : String(live.value);
  return live.text?.trim() || point.raw;
}
