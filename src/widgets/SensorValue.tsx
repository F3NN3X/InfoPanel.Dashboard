import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, has, Metric, Ring, Spark, Bar, Num, useHistory, tone, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "SensorValue",
  name: "Sensor",
  category: "Generic",
  icon: "sensors",
  prefixes: [],
  defaultSize: [1, 1],
  minSize: [1, 1],
  description: "Bind any single data point. Shows it as a value, gauge, bar or sparkline with thresholds.",
};

export interface SensorValueProps extends ShellProps {
  look?: ModuleSettings;
  /** The data key to bind. */
  sensor?: string;
  label?: string;
  display?: "value" | "gauge" | "bar" | "spark";
  min?: number;
  max?: number;
  warn?: number;
  crit?: number;
  decimals?: number;
  /** Overrides the unit read from the value. */
  unit?: string;
}

export default function SensorValue(p: SensorValueProps) {
  const d = p.data;
  const raw = get(d, p.sensor ?? "");
  const v = num(raw);
  const unit = p.unit ?? String(raw).replace(/^[-\d.,\s]+/, "").trim();
  const numeric = Number.isFinite(v) && /^-?[\d.,]+\s*\S*$/.test(String(raw).trim());
  const hist = useHistory(v);
  const min = p.min ?? 0,
    max = p.max ?? (unit === "%" ? 100 : unit.includes("°") ? 100 : Math.max(1, ...hist) * 1.1);
  const t = tone(v, p.warn, p.crit);
  const label = p.label ?? p.title ?? String(p.sensor ?? "").split(".").pop()!.replace(/[_-]+/g, " ");
  const disp = p.display ?? "value";
  return (
    <Widget
      {...shell(p)}
      title={label}
      icon="sensors"
      compact={
        numeric
          ? { label, value: v, d: p.decimals ?? (Math.abs(v) < 10 ? 1 : 0), unit, t, hist: disp === "spark" ? hist : undefined, pct: disp === "bar" || disp === "gauge" ? ((v - min) / (max - min)) * 100 : undefined, kind: ({ gauge: "ring", bar: "bar", spark: "spark" } as const)[disp as "gauge" | "bar" | "spark"] ?? "value" }
          : undefined
      }
    >
      {({ size }) =>
        !numeric ? (
          <div className="flex h-full flex-col justify-center">
            {size === "xs" && <span className="text-[11px] text-[color:var(--w-muted)]">{label}</span>}
            <span className="line-clamp-3 text-base font-medium">{has(raw) ? raw : "—"}</span>
          </div>
        ) : disp === "gauge" ? (
          <div className="flex h-full items-center justify-center">
            <Ring value={v - min} max={max - min} t={t} thickness={size === "xs" ? 10 : 8} className="h-full">
              <Num className={`${size === "xs" ? "text-base" : size === "sm" ? "text-2xl" : "text-4xl"} font-semibold`}>{fmt(v, p.decimals ?? 0)}</Num>
              <span className="text-[10.5px] text-[color:var(--w-muted)]">{unit}</span>
            </Ring>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center gap-2">
            <Metric label={size === "xs" ? label : null} value={v} d={p.decimals ?? (Math.abs(v) < 10 ? 1 : 0)} unit={unit} t={t} scale={{ xs: "lg", sm: "xl", md: "2xl", lg: "2xl" }[size] as "lg" | "xl" | "2xl"} />
            {disp === "bar" && <Bar value={v - min} max={max - min} t={t} className="h-2" />}
            {disp === "spark" && <Spark values={hist} className="min-h-0 flex-1" />}
          </div>
        )
      }
    </Widget>
  );
}
