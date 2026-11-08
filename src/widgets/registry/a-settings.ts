// Inspector settings of the group A templates: every widget-specific prop of the spec as a setting,
// with the adapters back to props (_docs/redesign/phase9/brief-9.5-inspector.md). Only KpiTiles and Vitals are left
// here (merge M5); the widgets with a folder (`src/widgets/<kebab-id>/widget.ts`) carry their own.
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { enumSetting, listPick, numberOf, numberSetting, optionPairs as opts } from "../shared/settings-kit";
import type { KpiTilesProps } from "../KpiTiles";
import type { VitalsProps } from "../Vitals";

/* ───────── KpiTiles ───────── */
const KPI_METRICS = ["cpu", "gpu", "ram", "net", "vram", "power"] as const;
export const KPITILES_SETTINGS: ModuleSetting[] = [
  enumSetting("metrics", "Tiles", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "Memory"], ["net", "Network"], ["vram", "VRAM"], ["power", "Power"]), { multiple: true, group: "Tiles" }),
  numberSetting("lookback", "Change over (readings)", 10, { min: 2, max: 60, step: 1, group: "History", tab: "behaviour" }),
];
export const kpiTilesProps = (s: ModuleSettings): Partial<KpiTilesProps> => ({ metrics: listPick(s.metrics, KPI_METRICS), lookback: numberOf(s.lookback) });

/* ───────── Vitals ───────── */
const VITALS_METRICS = ["cpu", "gpu", "ram", "net", "vram", "fps"] as const;
export const VITALS_SETTINGS: ModuleSetting[] = [
  enumSetting("metrics", "Metrics", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "RAM"], ["net", "Network"], ["vram", "VRAM"], ["fps", "FPS"]), { multiple: true, group: "Metrics" }),
];
export const vitalsProps = (s: ModuleSettings): Partial<VitalsProps> => ({ metrics: listPick(s.metrics, VITALS_METRICS) });
