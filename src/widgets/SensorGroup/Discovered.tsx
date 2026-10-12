// SensorGroup in auto-discovery mode: every `libre.*` / `hwinfo.*` reading as a dot-and-value row,
// temperatures first, then fans, power and the rest (the hardware list).
import { Widget, shell, Num, Empty, STATE } from "../kit";
import { readings, type Reading, type ReadingKind } from "../hardware-readings";
import type { SensorGroupProps } from "../SensorGroup";

const DOTS: Record<ReadingKind, string> = { temp: STATE.crit, fan: "#38bdf8", power: STATE.warn, other: "var(--accent)" };

export default function Discovered(p: SensorGroupProps) {
  const all = readings(p.data);
  const list = p.maxRows && p.maxRows > 0 ? all.slice(0, p.maxRows) : all;
  const dot = (r: Reading) => (p.tempColor && r.kind === "temp" ? p.tempColor : p.fanColor && r.kind === "fan" ? p.fanColor : p.powerColor && r.kind === "power" ? p.powerColor : DOTS[r.kind]);
  const first = list[0];
  if (!first)
    return (
      <Widget {...shell(p)} title={p.title ?? "Hardware"} icon="view_list">
        <Empty />
      </Widget>
    );
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Hardware"}
      icon="view_list"
      studio={{ label: p.title ?? "Hardware", value: first.value, unit: first.unit, sub: first.label, rows: list.map((r) => ({ n: r.label, v: r.text })) }}
      compact={{ label: first.label, value: first.value, unit: first.unit, sub: list.slice(1, 3).map((r) => `${r.label} ${r.text}`).join(" · ") }}
    >
      {({ w }) => (
        <div className="grid h-full auto-rows-min gap-1.5 overflow-y-auto" style={{ gridTemplateColumns: `repeat(${w < 260 ? 1 : w < 420 ? 2 : 3}, minmax(0,1fr))` }}>
          {list.map((r) => (
            <div key={r.key} className="flex min-w-0 items-center gap-2 rounded-lg bg-[color:var(--w-track)] px-2.5 py-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot(r) }} />
              <span className="min-w-0 truncate text-xs text-[color:var(--w-fg)]" title={r.label}>
                {r.label}
              </span>
              <Num className="ml-auto shrink-0 text-sm font-semibold" weight={600}>
                {r.text}
              </Num>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}
