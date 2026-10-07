import type { DashboardModule, SensorMap } from "./types";

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
  matches: (key) => key.startsWith("libre.") || key.startsWith("hwinfo."),
  render: (sensors) => {
    const entries = Object.entries(sensors).filter(
      ([key]) => hardwareModule.matches(key)
    );

    if (entries.length === 0) return null;

    return (
      <div className="max-h-[65vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
          {entries.map(([key, sensor]) => (
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
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800/60 bg-zinc-950/60 px-3 py-1.5">
      <span className="truncate text-xs text-zinc-400" title={title}>
        {title}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums text-zinc-100">
        {display}
      </span>
    </div>
  );
}
