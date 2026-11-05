/**
 * Widget rings (B3): the widgets that draw rings as part of their own settings. They are not gauges the
 * editor can open, so "On your screens" lists them by kind and "Open widget" goes to the widget. The kinds
 * are a short fixed list; a widget that draws rings in another way is not counted.
 */
import type { DashboardConfig, Placement } from "@/lib/layout";
import type { GaugeOn } from "./model";

export interface RingsEntry {
  /** `rings:<zone id>`: React keys and selection. */
  key: string;
  zoneId: string;
  name: string;
  /** How many rings it draws. */
  count: number;
  /** What they read: "VRAM, Load". */
  reads: string;
  on: GaugeOn;
}

const GPU_RINGS = { outer: { vram: "VRAM", load: "Load", power: "Power" } as Record<string, string>, inner: { load: "Load", vram: "VRAM", fan: "Fan" } as Record<string, string> };
const SECTION_LABEL: Record<string, string> = { cpu: "CPU", gpu: "GPU", ram: "RAM", disk: "Disks", net: "Network" };

const text = (v: unknown, fallback: string): string => (typeof v === "string" && v ? v : fallback);

/** The rings a zone draws, or null when it is not one of the ring widgets. */
export function ringsOf(zone: Placement, on: GaugeOn): RingsEntry | null {
  const s = zone.settings ?? {};
  const base = { key: `rings:${zone.id}`, zoneId: zone.id, on };
  if (zone.module === "GpuRings") {
    const outer = GPU_RINGS.outer[text(s.outer, "vram")] ?? "VRAM";
    const inner = GPU_RINGS.inner[text(s.inner, "load")] ?? "Load";
    return { ...base, name: text(s.title, "GPU Rings"), count: 2, reads: `${outer}, ${inner}` };
  }
  if (zone.module === "SystemOverview") {
    // The 1x1 view draws the loads as rings: VRAM is a detail of the GPU there, at most three.
    const sections = text(s.sections, "cpu,gpu,ram").split(",").map((k) => k.trim()).filter((k) => k in SECTION_LABEL).slice(0, 3);
    if (sections.length === 0) return null;
    return { ...base, name: text(s.title, "System overview"), count: sections.length, reads: sections.map((k) => SECTION_LABEL[k]).join(", ") };
  }
  return null;
}

/** The ring widgets on every screen and page of the config. */
export const configRings = (config: Pick<DashboardConfig, "profiles">): RingsEntry[] =>
  config.profiles.flatMap((p) => p.pages.flatMap((pg) => pg.placements.flatMap((z) => ringsOf(z, { profileId: p.id, pageId: pg.id, screen: p.name, page: pg.name }) ?? [])));
