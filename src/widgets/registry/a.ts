// Template widgets, group A: system and hardware (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule } from "@/modules/types";
import { THERMALS_SETTINGS } from "@/modules/hardware-modern";
import { templateModule } from "../module";
import { pass } from "./settings-kit";
import * as SystemOverview from "../SystemOverview";
import * as MenuBar from "../MenuBar";
import * as KpiTiles from "../KpiTiles";
import * as StatusTracker from "../StatusTracker";
import * as SystemStatus from "../SystemStatus";
import * as Vitals from "../Vitals";
import * as ServiceHealth from "../ServiceHealth";
import * as ProcessList from "../ProcessList";
import * as Uptime from "../Uptime";
import * as CpuMonitor from "../CpuMonitor";
import * as CoreHeatmap from "../CoreHeatmap";
import * as GpuRings from "../GpuRings";
import * as GpuMonitor from "../GpuMonitor";
import * as MemoryUsage from "../MemoryUsage";
import * as Thermals from "../Thermals";
import * as PowerDraw from "../PowerDraw";
import * as Fans from "../Fans";
import { SYSTEM_OVERVIEW_SETTINGS, systemOverviewProps } from "./system-overview";

export const GROUP_A: DashboardModule[] = [
  templateModule({
    meta: SystemOverview.meta,
    Component: SystemOverview.default,
    settings: SYSTEM_OVERVIEW_SETTINGS,
    toProps: (s) => {
      const base = pass<Partial<SystemOverview.SystemOverviewProps>>("sections", "colors", "unifiedColor", "ring", "coreView", "heatRamp", "details", "warn", "crit")(s);
      const ext = systemOverviewProps(s);
      return { ...base, ...ext, colors: base.colors || ext.colors ? { ...base.colors, ...ext.colors } : undefined };
    },
  }),
  templateModule({ meta: MenuBar.meta, Component: MenuBar.default, settings: [], toProps: pass<Partial<MenuBar.MenuBarProps>>("items", "stacked", "dropdown") }),
  templateModule({ meta: KpiTiles.meta, Component: KpiTiles.default, settings: [], toProps: pass<Partial<KpiTiles.KpiTilesProps>>("metrics", "lookback") }),
  templateModule({ meta: StatusTracker.meta, Component: StatusTracker.default, settings: [], toProps: pass<Partial<StatusTracker.StatusTrackerProps>>("tracks", "samples") }),
  templateModule({ meta: SystemStatus.meta, Component: SystemStatus.default, settings: [], toProps: pass<Partial<SystemStatus.SystemStatusProps>>("warn", "crit") }),
  templateModule({ meta: Vitals.meta, Component: Vitals.default, settings: [], toProps: pass<Partial<Vitals.VitalsProps>>("metrics") }),
  templateModule({ meta: ServiceHealth.meta, Component: ServiceHealth.default, settings: [], toProps: pass<Partial<ServiceHealth.ServiceHealthProps>>("layout") }),
  templateModule({ meta: ProcessList.meta, Component: ProcessList.default, settings: [], toProps: pass<Partial<ProcessList.ProcessListProps>>("sort", "rows") }),
  templateModule({ meta: Uptime.meta, Component: Uptime.default, settings: [], toProps: pass<Partial<Uptime.UptimeProps>>("showSeconds") }),
  templateModule({ meta: CpuMonitor.meta, Component: CpuMonitor.default, settings: [], toProps: pass<Partial<CpuMonitor.CpuMonitorProps>>("cpu", "coreView", "coreMetric", "heatRamp", "warn", "crit") }),
  templateModule({ meta: CoreHeatmap.meta, Component: CoreHeatmap.default, settings: [], toProps: pass<Partial<CoreHeatmap.CoreHeatmapProps>>("cpu", "shape", "ramp", "metric", "showValues", "history", "hotOutline") }),
  templateModule({ meta: GpuRings.meta, Component: GpuRings.default, settings: [], toProps: pass<Partial<GpuRings.GpuRingsProps>>("gpu", "outer", "inner", "colors") }),
  templateModule({ meta: GpuMonitor.meta, Component: GpuMonitor.default, settings: [], toProps: pass<Partial<GpuMonitor.GpuMonitorProps>>("gpu", "warnTemp", "critTemp") }),
  templateModule({ meta: MemoryUsage.meta, Component: MemoryUsage.default, settings: [], toProps: pass<Partial<MemoryUsage.MemoryUsageProps>>("warn", "crit") }),
  templateModule({ meta: Thermals.meta, Component: Thermals.default, settings: THERMALS_SETTINGS, toProps: pass<Partial<Thermals.ThermalsProps>>("sortBy", "warn", "crit", "max", "view", "discover", "showFans", "fanColor") }),
  templateModule({ meta: PowerDraw.meta, Component: PowerDraw.default, settings: [], toProps: pass<Partial<PowerDraw.PowerDrawProps>>("budget") }),
  templateModule({ meta: Fans.meta, Component: Fans.default, settings: [], toProps: pass<Partial<Fans.FansProps>>("maxRpm", "spin") }),
];
