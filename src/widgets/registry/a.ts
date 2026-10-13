// Template widgets, group A: system and hardware (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule } from "@/modules/types";
import { THERMALS_SETTINGS } from "@/modules/hardware-modern";
import { templateModule } from "../module";
import * as S from "./a-settings";
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
    toProps: systemOverviewProps,
  }),
  templateModule({ meta: MenuBar.meta, Component: MenuBar.default, settings: S.MENUBAR_SETTINGS, toProps: S.menuBarProps }),
  templateModule({ meta: KpiTiles.meta, Component: KpiTiles.default, settings: S.KPITILES_SETTINGS, toProps: S.kpiTilesProps }),
  templateModule({ meta: StatusTracker.meta, Component: StatusTracker.default, settings: S.STATUSTRACKER_SETTINGS, toProps: S.statusTrackerProps }),
  templateModule({ meta: SystemStatus.meta, Component: SystemStatus.default, settings: S.SYSTEMSTATUS_SETTINGS, toProps: S.systemStatusProps }),
  templateModule({ meta: Vitals.meta, Component: Vitals.default, settings: S.VITALS_SETTINGS, toProps: S.vitalsProps }),
  templateModule({ meta: ServiceHealth.meta, Component: ServiceHealth.default, settings: S.SERVICEHEALTH_SETTINGS, toProps: S.serviceHealthProps }),
  templateModule({ meta: ProcessList.meta, Component: ProcessList.default, settings: S.PROCESSLIST_SETTINGS, toProps: S.processListProps }),
  templateModule({ meta: Uptime.meta, Component: Uptime.default, settings: S.UPTIME_SETTINGS, toProps: S.uptimeProps }),
  templateModule({ meta: CpuMonitor.meta, Component: CpuMonitor.default, settings: S.CPUMONITOR_SETTINGS, toProps: S.cpuMonitorProps }),
  templateModule({ meta: CoreHeatmap.meta, Component: CoreHeatmap.default, settings: S.COREHEATMAP_SETTINGS, toProps: S.coreHeatmapProps }),
  templateModule({ meta: GpuRings.meta, Component: GpuRings.default, settings: S.GPURINGS_SETTINGS, toProps: S.gpuRingsProps }),
  templateModule({ meta: GpuMonitor.meta, Component: GpuMonitor.default, settings: S.GPUMONITOR_SETTINGS, toProps: S.gpuMonitorProps }),
  templateModule({ meta: MemoryUsage.meta, Component: MemoryUsage.default, settings: S.MEMORYUSAGE_SETTINGS, toProps: S.memoryUsageProps }),
  templateModule({ meta: Thermals.meta, Component: Thermals.default, settings: [...THERMALS_SETTINGS, ...S.THERMALS_EXTRA_SETTINGS], toProps: S.thermalsProps }),
  templateModule({ meta: PowerDraw.meta, Component: PowerDraw.default, settings: S.POWERDRAW_SETTINGS, toProps: S.powerDrawProps }),
  templateModule({ meta: Fans.meta, Component: Fans.default, settings: S.FANS_SETTINGS, toProps: S.fansProps }),
];
