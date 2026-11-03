import { useId } from "react";
import { VectorGaugeSvg } from "@/components/infopanel/VectorGaugeSvg";
import { STARTERS } from "@/lib/infopanel/gauges/presets";
import { fraction, normalizeGauge, type VectorGauge } from "@/lib/infopanel/gauges/vector";
import { Widget, shell, get, num, type ShellProps } from "./kit";
import { meta } from "./meta/CustomGauge";

export { meta };

export interface CustomGaugeProps extends ShellProps {
  /** The data key to bind. */
  sensor?: string;
  label?: string;
  gauge?: VectorGauge;
}

/** The spec a new Custom gauge starts from. */
export const DEFAULT_GAUGE_SPEC: VectorGauge = normalizeGauge(STARTERS.find((s) => s.name === "Theme ring with value")!.gauge);

/** A stored `gauge` setting (JSON text) as a spec; the default spec for blank or bad JSON. */
export function parseGaugeSetting(raw: unknown): VectorGauge {
  if (typeof raw !== "string" || !raw) return DEFAULT_GAUGE_SPEC;
  try {
    return normalizeGauge(JSON.parse(raw));
  } catch {
    return DEFAULT_GAUGE_SPEC;
  }
}

/** The label line under a gauge in a tall body, px (11px text and its gap). */
const LABEL_H = 22;

/** The spec's shape scaled to fit a `w` × `h` body (before it is measured: its own size, clipped); a `label` takes a line under it from 160px tall. */
export function FittedVectorGauge({ gauge, p, id, width, height, label }: { gauge: VectorGauge; p: number; id: string; width: number; height: number; label?: string }) {
  const named = !!label && height >= 160;
  const room = named ? height - LABEL_H : height;
  const k = width > 0 && height > 0 ? Math.min(width / gauge.width, room / gauge.height) : 1;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <VectorGaugeSvg gauge={gauge} p={p} id={id} width={Math.floor(gauge.width * k)} height={Math.floor(gauge.height * k)} />
      {named && <span className="mt-1.5 max-w-full shrink-0 truncate px-4 text-center text-micro text-[color:var(--w-muted)]">{label}</span>}
    </div>
  );
}

export default function CustomGauge(p: CustomGaugeProps) {
  const id = useId();
  const g = p.gauge ?? DEFAULT_GAUGE_SPEC;
  const v = num(get(p.data, p.sensor ?? ""));
  const frac = fraction(Number.isFinite(v) ? v : null, g.scale?.min ?? 0, g.scale?.max ?? 100);
  const label = p.label ?? p.title ?? String(p.sensor ?? "").split(".").pop()!.replace(/[_-]+/g, " ");
  return (
    <Widget {...shell(p)} title={label} icon="gauge">
      {({ w, h }) => <FittedVectorGauge gauge={g} p={frac} id={id} width={w} height={h} label={label} />}
    </Widget>
  );
}
