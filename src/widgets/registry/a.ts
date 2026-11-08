// Template widgets, group A: system and hardware (see _docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule } from "@/modules/types";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import * as M from "../meta";
import * as S from "./a-settings";
import { SYSTEM_OVERVIEW_SETTINGS, systemOverviewProps } from "../shared/system-overview";

export const GROUP_A: DashboardModule[] = [
  templateModule({
    meta: M.SystemOverview,
    Component: lazyWidget(() => import("../SystemOverview")),
    settings: SYSTEM_OVERVIEW_SETTINGS,
    toProps: systemOverviewProps,
  }),
  templateModule({ meta: M.KpiTiles, Component: lazyWidget(() => import("../KpiTiles")), settings: S.KPITILES_SETTINGS, toProps: S.kpiTilesProps }),
  templateModule({ meta: M.Vitals, Component: lazyWidget(() => import("../Vitals")), settings: S.VITALS_SETTINGS, toProps: S.vitalsProps }),
  templateModule({ meta: M.CpuMonitor, Component: lazyWidget(() => import("../CpuMonitor")), settings: S.CPUMONITOR_SETTINGS, toProps: S.cpuMonitorProps }),
  templateModule({ meta: M.CoreHeatmap, Component: lazyWidget(() => import("../CoreHeatmap")), settings: S.COREHEATMAP_SETTINGS, toProps: S.coreHeatmapProps }),
  templateModule({ meta: M.GpuMonitor, Component: lazyWidget(() => import("../GpuMonitor")), settings: S.GPUMONITOR_SETTINGS, toProps: S.gpuMonitorProps }),
];
