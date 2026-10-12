import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, detect, pretty, tone, TONES, useHistory, Empty, hw, type Tone, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "Thermals",
  name: "Thermals",
  category: "Hardware",
  icon: "device_thermostat",
  prefixes: [],
  defaultSize: [2, 2],
  minSize: [1, 1],
  description: "Every temperature sensor in one place — CPU, GPU core + hotspot, NVMe/SSD, VRM — hottest first.",
};

export interface ThermalsProps extends ShellProps {
  look?: ModuleSettings;
  sortBy?: "hottest" | "fixed";
  /** Overrides the per-sensor warn / crit. */
  warn?: number;
  crit?: number;
  /** Bar scale, default 100. */
  max?: number;
}

interface Sensor {
  id: string;
  label: string;
  v: number;
  warn: number;
  crit: number;
  t: Tone;
}

export default function Thermals(p: ThermalsProps) {
  const d = p.data;
  const cpu = hw(d).cpu,
    gpu = hw(d).gpu;
  const L = (k: string) => num(get(d, `libre.${k}`));
  const raw: { id: string; label: string; v: number; warn: number; crit: number }[] = [];
  if (cpu) raw.push({ id: "cpu", label: "CPU", v: L(`${cpu}_core__tctl_tdie`), warn: 80, crit: 90 });
  if (gpu) {
    raw.push({ id: "gpu", label: "GPU", v: L(`${gpu}_gpu_core`), warn: 75, crit: 85 });
    raw.push({ id: "hot", label: "GPU memory", v: L(`${gpu}_gpu_memory_junction`), warn: 90, crit: 100 });
  }
  for (const s of detect(d, /^libre\.(.+)_power_on_hours$/))
    raw.push({ id: s, label: pretty(s).split(" ")[0], v: [`${s}_composite_temperature`, `${s}_temperature`, `${s}_temperature__2`].map(L).find(Number.isFinite) ?? NaN, warn: L(`${s}_warning_temperature`) || 70, crit: L(`${s}_critical_temperature`) || 85 });
  raw.push({ id: "vrm", label: "VRM", v: L("embedded_controller_vrm"), warn: 90, crit: 105 });
  const list: Sensor[] = raw.filter((x) => Number.isFinite(x.v) && x.v > 0).map((x) => ({ ...x, t: tone(x.v, p.warn ?? x.warn, p.crit ?? x.crit) }));
  if (p.sortBy !== "fixed") list.sort((a, b) => b.v - a.v);
  const top = list[0];
  const hist = useHistory(top?.v ?? NaN);
  const max = p.max ?? 100;
  if (!top)
    return (
      <Widget {...shell(p)} title="Thermals" icon="device_thermostat">
        <Empty />
      </Widget>
    );
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Thermals"}
      icon="device_thermostat"
      studio={{ label: "Thermals", value: top.v, unit: "°C", sub: `Hottest · ${top.label}`, t: top.t, rows: list.map((x) => ({ n: x.label, v: `${fmt(x.v, 0)}°C`, pct: (x.v / max) * 100 })) }}
      compact={{ label: `Hottest · ${top.label}`, value: top.v, unit: "°C", sub: list.slice(1, 3).map((x) => `${x.label} ${fmt(x.v, 0)}°`).join(" · "), hist, t: top.t }}
    >
      {({ size, h }) => {
        const n = Math.max(1, Math.floor(h / (size === "lg" ? 36 : 28)));
        return (
          <ul className="flex h-full flex-col justify-center gap-2.5 overflow-hidden">
            {list.slice(0, n).map((x) => (
              <li key={x.id} className="grid grid-cols-[minmax(56px,90px)_minmax(0,1fr)_48px] items-center gap-3 text-xs">
                <span className="truncate text-[color:var(--w-fg)]">{x.label}</span>
                <div className="relative h-2 overflow-hidden rounded-full bg-[color:var(--w-track)]">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(x.v / max) * 100}%`, background: `linear-gradient(90deg, ${TONES.ok}, ${TONES[x.t]})` }} />
                  <div className="absolute inset-y-0 w-px bg-amber-300/50" style={{ left: `${((p.warn ?? x.warn) / max) * 100}%` }} />
                </div>
                <span className="text-right font-medium tabular-nums" style={x.t !== "ok" ? { color: TONES[x.t] } : undefined}>
                  {fmt(x.v, 0)}°C
                </span>
              </li>
            ))}
          </ul>
        );
      }}
    </Widget>
  );
}
