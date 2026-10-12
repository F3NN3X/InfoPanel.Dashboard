import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, fmtRate, detect, Spark, useHistory, tone, TONES, hw, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "Vitals",
  name: "Vitals",
  category: "System",
  icon: "vital_signs",
  prefixes: [],
  defaultSize: [4, 1],
  minSize: [1, 1],
  description: "CPU, GPU, RAM and network side-by-side. Reflows into a row, 2×2 grid or stack to suit the zone.",
};

type Metric = "cpu" | "gpu" | "ram" | "net" | "vram" | "fps";
interface Vital {
  label: string;
  v: number;
  unit: string;
  max?: number;
  sub: string;
}

export interface VitalsProps extends ShellProps {
  look?: ModuleSettings;
  metrics?: Metric[];
}

export default function Vitals(p: VitalsProps) {
  const d = p.data;
  const cpu = hw(d).cpu,
    gpu = hw(d).gpu;
  const L = (k: string) => num(get(d, `libre.${k}`));
  const net = detect(d, /^libre\.(.+)_download_speed$/).reduce((a, n) => a + (L(`${n}_download_speed`) || 0), 0);
  const all: Record<Metric, Vital> = {
    cpu: { label: "CPU", v: L(`${cpu}_cpu_total`), unit: "%", max: 100, sub: `${fmt(L(`${cpu}_core__tctl_tdie`), 0)}°C` },
    gpu: { label: "GPU", v: L(`${gpu}_gpu_core_load`), unit: "%", max: 100, sub: `${fmt(L(`${gpu}_gpu_core`), 0)}°C` },
    ram: { label: "RAM", v: L("total_memory_memory"), unit: "%", max: 100, sub: `${fmt(L("total_memory_memory_used"), 1)} GB` },
    net: { label: "Net ↓", v: net / 1024, unit: "MB/s", sub: fmtRate(net) },
    vram: { label: "VRAM", v: (L(`${gpu}_gpu_memory_used`) / L(`${gpu}_gpu_memory_total`)) * 100, unit: "%", max: 100, sub: `${fmt(L(`${gpu}_gpu_memory_used`) / 1024, 1)} GB` },
    fps: { label: "FPS", v: num(get(d, "plugins.InfoPanel.RTSS.rtss.fps")), unit: "", sub: get(d, "plugins.InfoPanel.RTSS.rtss.resolution") },
  };
  const keys = p.metrics ?? (["cpu", "gpu", "ram", "net"] as Metric[]);
  const H: Record<Metric, number[]> = { cpu: useHistory(all.cpu.v), gpu: useHistory(all.gpu.v), ram: useHistory(all.ram.v), net: useHistory(all.net.v), vram: useHistory(all.vram.v), fps: useHistory(all.fps.v) };
  return (
    <Widget
      {...shell(p)}
      showHeader={false}
      studio={{ label: "Vitals", value: all.cpu.v, unit: "%", sub: "CPU", hist: H.cpu, min: 0, max: 100, rows: keys.map((k) => ({ n: all[k].label, v: `${fmt(all[k].v, all[k].unit === "MB/s" ? 1 : 0)} ${all[k].unit}`, pct: all[k].max ? all[k].v : undefined })) }}
      compact={(box) => (box.shape === "tile" ? { label: "CPU · GPU", value: all.cpu.v, unit: "%", sub: `GPU ${fmt(all.gpu.v, 0)}% · RAM ${fmt(all.ram.v, 0)}%`, hist: H.cpu, min: 0, max: 100, icon: "vital_signs" } : undefined)}
    >
      {({ w, h }) => {
        const cols = w / h > 2.4 ? keys.length : w / h < 0.7 ? 1 : 2;
        const cardW = (w - (cols - 1) * 8) / cols;
        return (
          <div className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridAutoRows: "minmax(0,1fr)" }}>
            {keys.map((k) => {
              const m = all[k];
              const t = m.max ? tone(m.v, 75, 90) : "ok";
              return (
                <div key={k} className="relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-[color:var(--w-track)] px-3 py-2">
                  <Spark values={H[k]} min={0} max={m.max} className="absolute inset-x-0 bottom-0 h-1/2 opacity-80" />
                  <div className="relative flex items-baseline justify-between gap-2">
                    <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[color:var(--w-muted)]">{m.label}</span>
                    {cardW > 110 && <span className="truncate text-[10.5px] text-[color:var(--w-faint)]">{m.sub}</span>}
                  </div>
                  <span className="relative mt-auto block max-w-full overflow-hidden whitespace-nowrap pb-1 font-semibold leading-none tabular-nums" style={{ fontSize: Math.round(Math.max(13, Math.min(24, (cardW - 26) / ((fmt(m.v, m.unit === "MB/s" ? 1 : 0).length + m.unit.length * 0.45) * 0.62)))), ...(t !== "ok" ? { color: TONES[t] } : null) }}>
                    {fmt(m.v, m.unit === "MB/s" ? 1 : 0)}
                    <span className="ml-0.5 text-[11px] font-medium text-[color:var(--w-muted)]">{m.unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        );
      }}
    </Widget>
  );
}
