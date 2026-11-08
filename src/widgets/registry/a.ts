// Template widgets, group A: system and hardware (see _docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule } from "@/modules/types";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import * as M from "../meta";
import * as S from "./a-settings";

export const GROUP_A: DashboardModule[] = [
  templateModule({ meta: M.KpiTiles, Component: lazyWidget(() => import("../KpiTiles")), settings: S.KPITILES_SETTINGS, toProps: S.kpiTilesProps }),
  templateModule({ meta: M.Vitals, Component: lazyWidget(() => import("../Vitals")), settings: S.VITALS_SETTINGS, toProps: S.vitalsProps }),
];
