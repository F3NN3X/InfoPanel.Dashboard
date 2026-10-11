import { modules } from "@/modules";
import { CARDS_ID, type Placement } from "@/lib/layout";

/** Every widget the studio can place, with its minimum zone footprint. */
export const ALL_MODULES = [
  ...modules.map((m) => ({
    id: m.id,
    title: m.title,
    minCols: m.minCols ?? 2,
    minRows: m.minRows ?? 1,
  })),
  { id: CARDS_ID, title: "Other sensors", minCols: 4, minRows: 2 },
];

/** Drag-and-drop payload types for the widget and panel palettes. */
export const DND_MIME = "text/infopanel-module";
export const DND_MIME_PANEL = "text/infopanel-panel";

/** A module's minimum zone size (grid cells); unknown ids get 2×1. */
export function moduleMinSize(module: string): { cols: number; rows: number } {
  const meta = ALL_MODULES.find((m) => m.id === module);
  return { cols: meta?.minCols ?? 2, rows: meta?.minRows ?? 1 };
}

/** Display title of a placement: panel title, module title, or its id. */
export function placementTitle(p: Placement): string {
  return (
    p.panel?.title ??
    ALL_MODULES.find((m) => m.id === p.module)?.title ??
    p.module
  );
}
