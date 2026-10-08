import { effectiveSettings, type DashboardModule, type SensorMap } from "./types";

/**
 * Hardware module — InfoPanel's native hardware values as exported by the
 * main process: LibreHardwareMonitor (`libre.*`) and HWiNFO (`hwinfo.*`).
 *
 * Renders a compact, scrollable grid since these sources can expose
 * hundreds of sensors.
 */
export const hardwareModule: DashboardModule = {
  id: "hardware",
  title: "Hardware",
  minCols: 2,
  minRows: 2,
  matches: (key) => key.startsWith("libre.") || key.startsWith("hwinfo."),
  settings: [
    {
      key: "maxEntries",
      label: "Max rows (0 = all)",
      type: "number",
      default: 0,
      min: 0,
      max: 100,
      step: 5,
    },
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(hardwareModule, s);
    const entries = Object.entries(sensors).filter(
      ([key]) => hardwareModule.matches(key)
    );

    if (entries.length === 0) return null;

    const max = Math.max(0, Math.round(Number(cfg.maxEntries) || 0));
    const shown = max > 0 ? entries.slice(0, max) : entries;

    return (
      <div className="h-full w-full overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(([key, sensor]) => (
            <ValueRow key={key} sensorKey={key} sensor={sensor} />
          ))}
        </div>
      </div>
    );
  },
};

function ValueRow({ sensorKey, sensor }: { sensorKey: string; sensor: SensorMap[string] }) {
  const title = sensor.name ?? sensorKey;
  const display =
    sensor.text !== undefined
      ? sensor.text
      : sensor.value !== undefined
        ? `${sensor.value.toFixed(1)}${sensor.unit}`
        : "—";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/60 px-3 py-1.5">
      <span className="truncate text-xs text-muted-foreground" title={title}>
        {title}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
        {display}
      </span>
    </div>
  );
}
