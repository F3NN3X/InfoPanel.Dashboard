import { ModernNetwork } from "@/components/ModernNetwork";
import { liveValue } from "@/lib/sensors";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

const NET = "libre.ethernet_";

/**
 * Modern network widget — current download / upload speed (the
 * `libre.ethernet_*` LibreHardwareMonitor keys) with a session totals row
 * and link utilization, plus optional rolling speed sparklines. One
 * component (`ModernNetwork`) picks card / standard / compact / simple
 * from the measured zone size.
 *
 * The classic `hardware` module also surfaces the same ethernet keys as
 * plain rows; this widget gives them a dedicated, formatted view.
 */

const NETWORK_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  { key: "showTotals", label: "Session totals", type: "boolean", default: true },
  { key: "sparkline", label: "Trend sparkline", type: "boolean", default: false },
  {
    key: "view",
    label: "View",
    type: "select",
    default: "speeds",
    options: [
      { value: "speeds", label: "Speeds" },
      {
        value: "totals",
        label: "Totals",
        applies: { showTotals: true, sparkline: true },
      },
    ],
  },
];

export const networkModernModule: DashboardModule = {
  id: "networkmodern",
  title: "Network (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(NET),
  settings: NETWORK_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(networkModernModule, s);
    const download = liveValue(sensors[NET + "download_speed"]);
    const upload = liveValue(sensors[NET + "upload_speed"]);
    const downloadTotal = liveValue(sensors[NET + "data_downloaded"]);
    const uploadTotal = liveValue(sensors[NET + "data_uploaded"]);
    const utilization = liveValue(sensors[NET + "network_utilization"]);

    if (
      download === undefined &&
      upload === undefined &&
      downloadTotal === undefined &&
      utilization === undefined
    )
      return null;

    return (
      <ModernNetwork
        download={download}
        upload={upload}
        downloadTotal={downloadTotal}
        uploadTotal={uploadTotal}
        utilization={utilization}
        sparkline={Boolean(cfg.sparkline)}
        showTotals={Boolean(cfg.showTotals)}
        layout={String(cfg.layout) as
          | "auto"
          | "card"
          | "standard"
          | "compact"
          | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
        chrome={chromeOf(cfg)}
      />
    );
  },
};
