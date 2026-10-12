import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, Num, Spark, LedLadder, STATE, hue, useHistory, type ShellProps, type WidgetMeta, type Data } from "./kit";

export const meta: WidgetMeta = {
  id: "AudioMeter",
  name: "Audio Meter",
  category: "Audio",
  icon: "graphic_eq",
  prefixes: ["plugins.audio-level-meter."],
  defaultSize: [2, 1],
  minSize: [1, 1],
  description: "L/R level, peak, RMS and peak-hold for one device, or a meter bridge for all devices.",
};

const ids = (d: Data): string[] => [...new Set(Object.keys(d || {}).map((k) => k.match(/^plugins\.audio-level-meter\.([^.]+)\.device-name$/)?.[1]).filter((id): id is string => !!id))];
const read = (d: Data, id: string) => {
  const k = (s: string) => get(d, `plugins.audio-level-meter.${id}.${s}`);
  const hold = num(k("peak-hold"));
  return { id, name: String(k("device-name")).replace(/\s*\(.+\)$/, ""), l: num(k("left-channel")), r: num(k("right-channel")), level: num(k("audio-level")), peak: num(k("peak-level")), rms: num(k("rms-level")), hold: hold < -200 ? -96 : hold };
};
const db2pct = (db: number) => Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
const P = (a: number, r: number, cx = 50, cy = 56): [number, number] => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
// Analog VU: needle springs with a slight overshoot
function Vu({ v, label }: { v: number; label: string }) {
  const a = -48 + (Math.min(100, Math.max(0, v)) / 100) * 96;
  return (
    <svg viewBox="0 0 100 64" className="h-full w-full">
      {Array.from({ length: 13 }, (_, i) => {
        const ang = -48 + i * 8;
        const [x1, y1] = P(ang, 38);
        const [x2, y2] = P(ang, i % 2 ? 41 : 44);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i >= 10 ? STATE.crit : "var(--w-muted)"} strokeWidth={i % 2 ? 0.6 : 1} />;
      })}
      <path d={`M${P(32, 46).join(",")}A46,46 0 0 1 ${P(48, 46).join(",")}`} fill="none" stroke={STATE.crit} strokeWidth="2" />
      <path d={`M${P(-48, 46).join(",")}A46,46 0 0 1 ${P(32, 46).join(",")}`} fill="none" stroke="var(--accent)" strokeWidth="1" opacity=".6" />
      <text x="50" y="40" textAnchor="middle" fontSize="7" fill="var(--w-faint)" letterSpacing="1">
        VU · {label}
      </text>
      <g style={{ transform: `rotate(${a}deg)`, transformOrigin: "50px 56px", transition: "transform .45s cubic-bezier(.34,1.7,.5,1)" }}>
        <line x1="50" y1="58" x2="50" y2="12" stroke="var(--w-fg)" strokeWidth="1.1" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="56" r="3.2" fill="var(--w-track)" stroke="var(--w-faint)" strokeWidth=".6" />
    </svg>
  );
}

export interface AudioMeterProps extends ShellProps {
  look?: ModuleSettings;
  /** container id, default "default-audio" */
  device?: string;
  mode?: "single" | "bridge";
  segments?: number;
  meterStyle?: "led" | "bar" | "vu" | "ring" | "mirror" | "wave";
}

export default function AudioMeter(p: AudioMeterProps) {
  const d = p.data;
  const all = ids(d);
  const bridge = p.mode === "bridge";
  const one = read(d, p.device ?? (all.includes("default-audio") ? "default-audio" : all[0]));
  const lH = useHistory(one.l, 72, 0.6);
  const rH = useHistory(one.r, 72, 0.6);
  const st = p.meterStyle ?? "led";
  const holdPct = db2pct(one.hold);
  const channels: [string, number][] = [
    ["L", one.l],
    ["R", one.r],
  ];
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? (bridge ? "Audio levels" : one.name)}
      icon="graphic_eq"
      studio={
        bridge
          ? {
              label: "Audio levels",
              meters: all.filter((id) => id !== "default-audio").map((id) => {
                const m = read(d, id);
                return { n: m.name, v: Math.max(m.l, m.r) };
              }),
            }
          : { label: one.name, value: one.peak, d: 1, unit: "dB", meters: [{ n: "L", v: one.l }, { n: "R", v: one.r }] }
      }
      compact={bridge ? undefined : { label: one.name, value: one.peak, d: 1, pct: one.level, unit: "dB", sub: `L ${fmt(one.l)}% · R ${fmt(one.r)}%` }}
      right={bridge ? undefined : <span className="font-mono text-[10.5px] text-[color:var(--w-muted)]">{fmt(one.peak, 1)} dB</span>}
    >
      {({ size }) =>
        bridge ? (
          <div className="flex h-full gap-2">
            {all
              .filter((id) => id !== "default-audio")
              .map((id) => {
                const m = read(d, id);
                return (
                  <div key={id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div className="flex min-h-0 w-full flex-1 justify-center gap-[3px]">
                      <div className="flex w-2">
                        <LedLadder value={m.l} vertical n={size === "lg" ? 28 : 16} />
                      </div>
                      <div className="flex w-2">
                        <LedLadder value={m.r} vertical n={size === "lg" ? 28 : 16} />
                      </div>
                    </div>
                    {size !== "xs" && (
                      <span className="w-full truncate text-center text-[10px] text-[color:var(--w-muted)]" title={m.name}>
                        {m.name}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        ) : size === "xs" ? (
          <div className="flex h-full flex-col justify-center gap-1.5">
            <div className="flex h-2">
              <LedLadder value={one.l} n={16} />
            </div>
            <div className="flex h-2">
              <LedLadder value={one.r} n={16} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center gap-2">
            {st === "vu" ? (
              <div className="flex min-h-0 flex-1 gap-2">
                {channels.map(([c, v]) => (
                  <div key={c} className="flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-xl bg-[color:var(--w-track)] p-1">
                    <Vu v={v} label={c} />
                  </div>
                ))}
              </div>
            ) : st === "ring" ? (
              <div className="flex min-h-0 flex-1 items-center justify-center gap-4">
                <svg viewBox="0 0 100 100" className="aspect-square h-full max-h-full -rotate-90">
                  {(
                    [
                      [42, one.l],
                      [31, one.r],
                    ] as const
                  ).map(([r, v]) => {
                    const c = 2 * Math.PI * r;
                    return (
                      <g key={r}>
                        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--w-track)" strokeWidth="8" />
                        <circle cx="50" cy="50" r={r} fill="none" stroke={v > 85 ? STATE.crit : "var(--accent)"} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, v) / 100)} style={{ transition: "stroke-dashoffset .25s" }} />
                      </g>
                    );
                  })}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--w-fg)" strokeWidth="8" strokeDasharray={`1.2 ${2 * Math.PI * 42}`} strokeDashoffset={-2 * Math.PI * 42 * (holdPct / 100)} />
                </svg>
                {size !== "sm" && (
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="text-[color:var(--w-faint)]">Outer L · Inner R</span>
                    <Num className="text-2xl">
                      {fmt(one.level, 0)}
                      <span className="text-xs font-normal text-[color:var(--w-muted)]">%</span>
                    </Num>
                  </div>
                )}
              </div>
            ) : st === "mirror" ? (
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-1.5">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex h-full max-h-4 items-stretch gap-[3px]">
                    <div className="flex flex-1">
                      <LedLadder value={one.l * (1 - row * 0.18)} n={16} zones={[62, 81]} reverse />
                    </div>
                    <span className="w-px bg-[color:var(--w-faint)]" />
                    <div className="flex flex-1">
                      <LedLadder value={one.r * (1 - row * 0.18)} n={16} zones={[62, 81]} />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-[10px] font-semibold text-[color:var(--w-faint)]">
                  <span>L</span>
                  <span>R</span>
                </div>
              </div>
            ) : st === "wave" ? (
              <div className="relative min-h-0 flex-1">
                <Spark values={lH} min={0} max={100} graph="area" className="absolute inset-x-0 top-0 h-1/2" />
                <Spark values={rH} min={0} max={100} graph="area" className="absolute inset-x-0 bottom-0 h-1/2 -scale-y-100" color={hue(60)} />
                <div className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--w-track)]" />
              </div>
            ) : (
              channels.map(([c, v]) => (
                <div key={c} className={`flex items-center gap-2 ${size === "lg" ? "h-5" : "h-3"}`}>
                  <span className="w-3 text-[10px] font-semibold text-[color:var(--w-faint)]">{c}</span>
                  {st === "bar" ? (
                    <div className="relative h-full flex-1 overflow-hidden rounded-full bg-[color:var(--w-track)]">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100" style={{ width: `${Math.min(100, v)}%`, background: `linear-gradient(90deg, var(--accent) 0%, var(--accent) 60%, ${STATE.warn} 82%, ${STATE.crit} 100%)`, backgroundSize: `${(100 / Math.max(1, v)) * 100}% 100%` }} />
                      <div className="absolute inset-y-0 w-[2px] bg-[color:var(--w-fg)] transition-[left] duration-300" style={{ left: `${holdPct}%` }} />
                    </div>
                  ) : (
                    <div className="flex h-full flex-1">
                      <LedLadder value={v} n={p.segments ?? (size === "sm" ? 20 : 32)} />
                    </div>
                  )}
                </div>
              ))
            )}
            {size !== "sm" && (
              <div className="mt-1 grid grid-cols-4 gap-3 font-mono text-[11px]">
                {[
                  ["Peak", `${fmt(one.peak, 1)} dB`],
                  ["RMS", `${fmt(one.rms, 1)} dB`],
                  ["Hold", `${fmt(one.hold, 1)} dB`],
                  ["Level", `${fmt(one.level, 1)}%`],
                ].map(([l, v]) => (
                  <div key={l} className="flex min-w-0 flex-col">
                    <span className="font-sans text-[10px] text-[color:var(--w-faint)]">{l}</span>
                    <span className="truncate text-[color:var(--w-fg)]">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }
    </Widget>
  );
}
