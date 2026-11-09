import type { ModuleSettings } from "@/modules/types";
import { WIDGET_PRESET_CAPS, type UserWidgetPreset } from "./widget-presets";

// The guard for a saved `widgetPresets` list: in the config upgrade's chunk, so neither the kiosk nor the studio entry carries it.
const CAPS = { ...WIDGET_PRESET_CAPS, id: 64, settingsBytes: 16_384, span: 48 } as const;

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim() !== "" && v.length <= max;
const span = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= CAPS.span;

/**
 * A saved list, guarded: an id, a widget, a name, a settings object within its byte cap and a whole-cell size are required
 * (a name is cut to its cap, a view that is not text is dropped), a repeated id keeps its first entry, the list stops at its
 * cap, none kept = undefined. A widget id this build has no widget for stays, as a newer build's saved preset must survive.
 */
export function normalizeWidgetPresets(v: unknown): UserWidgetPreset[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const kept: UserWidgetPreset[] = [];
  for (const p of v as Partial<Record<keyof UserWidgetPreset, unknown>>[]) {
    if (kept.length >= CAPS.total) break;
    if (!isPlain(p) || !text(p.id, CAPS.id) || seen.has(p.id) || !text(p.widget, CAPS.id)) continue;
    if (typeof p.name !== "string" || p.name.trim() === "" || !isPlain(p.settings) || JSON.stringify(p.settings).length > CAPS.settingsBytes) continue;
    if (!Array.isArray(p.size) || p.size.length !== 2 || !span(p.size[0]) || !span(p.size[1])) continue;
    seen.add(p.id);
    kept.push({
      id: p.id,
      widget: p.widget,
      name: p.name.trim().slice(0, CAPS.name),
      ...(text(p.view, CAPS.id) ? { view: p.view } : {}),
      settings: p.settings as ModuleSettings,
      size: [p.size[0], p.size[1]],
      created: typeof p.created === "string" ? p.created.slice(0, 40) : "",
    });
  }
  return kept.length > 0 ? kept : undefined;
}
