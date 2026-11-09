import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SensorMap } from "@/modules/types";
import snapshot from "@/widgets/__fixtures__/snapshot.json";
import type { ShellProps, WidgetMeta } from "@/widgets/core/types";
import { toFlat } from "@/widgets/shared/data-adapter";
import { GROUP_A_IDS, groupOf } from "./group-of";
import * as SystemOverview from "@/widgets/system-overview/SystemOverview";
import * as MenuBar from "@/widgets/menu-bar/MenuBar";
import * as KpiTiles from "@/widgets/kpi-tiles/KpiTiles";
import * as StatusTracker from "@/widgets/status-tracker/StatusTracker";
import * as SystemStatus from "@/widgets/system-status/SystemStatus";
import * as ServiceHealth from "@/widgets/service-health/ServiceHealth";
import * as ProcessList from "@/widgets/process-list/ProcessList";
import * as Uptime from "@/widgets/uptime/Uptime";
import * as CpuMonitor from "@/widgets/cpu-monitor/CpuMonitor";
import * as CoreHeatmap from "@/widgets/core-heatmap/CoreHeatmap";
import * as GpuMonitor from "@/widgets/gpu-monitor/GpuMonitor";
import * as MemoryUsage from "@/widgets/memory-usage/MemoryUsage";
import * as Thermals from "@/widgets/thermals/Thermals";
import * as PowerDraw from "@/widgets/power-draw/PowerDraw";
import * as Fans from "@/widgets/fans/Fans";

// Group A as the registry lists it, wherever each widget lives (group file or folder).
const GROUP_A = groupOf(GROUP_A_IDS);

interface Entry {
  meta: WidgetMeta;
  default: ComponentType<ShellProps>;
}
const WIDGETS = [SystemOverview, MenuBar, KpiTiles, StatusTracker, SystemStatus, ServiceHealth, ProcessList, Uptime, CpuMonitor, CoreHeatmap, GpuMonitor, MemoryUsage, Thermals, PowerDraw, Fans] as unknown as Entry[];

const DATA = toFlat(snapshot.sensors as SensorMap);
// Widgets whose source keys are absent from the captured snapshot, so no live value shows.
const NO_LIVE: Record<string, string> = {};

const render = (C: ComponentType<ShellProps>, data: ShellProps["data"], extra: Partial<ShellProps> = {}) => renderToString(createElement(C, { data, ...extra }));

describe("group A modules", () => {
  it("covers the 15 widgets in order", () => {
    expect(GROUP_A.map((m) => m.id)).toEqual(WIDGETS.map((w) => w.meta.id));
    expect(GROUP_A).toHaveLength(15);
  });

  // One test per kind: its module mirrors its meta, and it renders (a live value, the extremes, no data) without throwing.
  it.each(WIDGETS.map((w) => [w.meta.id, w] as const))("%s: mirrors its meta and renders", (id, w) => {
    const mod = GROUP_A.find((m) => m.id === w.meta.id)!;
    expect(mod.minCols).toBe(w.meta.minSize[0]);
    expect(mod.minRows).toBe(w.meta.minSize[1]);
    expect(mod.defaultSize).toEqual(w.meta.defaultSize);
    expect(mod.category).toBe(w.meta.category);
    if (!(id in NO_LIVE)) expect(render(w.default, DATA, { size: "md" })).toMatch(/\d/);
    expect(render(w.default, DATA, { size: "xs", variant: "studio", skin: "tui" }).length).toBeGreaterThan(0);
    expect(render(w.default, {}).length).toBeGreaterThan(0);
  });

  // The Vitals widget's render check, kept for the view it became (config v19).
  it("KpiTiles' cards view (the Vitals widget) renders a live value, the extremes and no data", () => {
    const cards = { view: "cards" } as Partial<ShellProps>;
    expect(render(KpiTiles.default, DATA, { ...cards, size: "md" })).toMatch(/d/);
    expect(render(KpiTiles.default, DATA, { ...cards, size: "xs", variant: "studio", skin: "tui" }).length).toBeGreaterThan(0);
    expect(render(KpiTiles.default, {}, cards).length).toBeGreaterThan(0);
  });

  // The GPU Rings widget's render check, kept for the view it became (config v19).
  it("GpuMonitor's rings view (the GPU Rings widget) renders a live value, the extremes and no data", () => {
    const rings = { view: "rings" } as Partial<ShellProps>;
    expect(render(GpuMonitor.default, DATA, { ...rings, size: "md" })).toMatch(/\d/);
    expect(render(GpuMonitor.default, DATA, { ...rings, size: "xs", variant: "studio", skin: "tui" }).length).toBeGreaterThan(0);
    expect(render(GpuMonitor.default, {}, rings).length).toBeGreaterThan(0);
  });

  it("passes stored settings through by prop name", () => {
    const mod = GROUP_A.find((m) => m.id === "Uptime")!;
    expect(mod.render(snapshot.sensors as SensorMap, { showSeconds: false })).toBeTruthy();
  });
});
