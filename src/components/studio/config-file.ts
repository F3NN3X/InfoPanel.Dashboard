import { mergeConfig, type DashboardConfig, type MonitorProfile } from "@/lib/layout";

/** Copy one profile (zones, style) to the clipboard as JSON. */
export function copyProfileJson(profile: MonitorProfile): Promise<void> {
  return navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
}

/** Download the config as `infopanel-dashboard-config.json`. */
export function exportConfigFile(config: DashboardConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "infopanel-dashboard-config.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a config file and hand the migrated config to `onLoad`. */
export function importConfigFile(
  file: File,
  onLoad: (config: DashboardConfig) => void
): void {
  file.text().then((text) => {
    try {
      const parsed = JSON.parse(text) as Partial<DashboardConfig>;
      if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
        throw new Error("Missing profiles");
      }
      // mergeConfig runs the v1→v2 migration (explicit zone boxes, rows).
      onLoad(mergeConfig(parsed));
    } catch (err) {
      console.error("Failed to import dashboard config", err);
    }
  });
}
