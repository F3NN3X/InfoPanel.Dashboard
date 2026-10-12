import { useRef } from "react";
import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, Dot, LedLadder, STATE, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "MeterBridge",
  name: "Meter Bridge",
  category: "Audio",
  icon: "graphic_eq",
  prefixes: [],
  defaultSize: [4, 3],
  minSize: [1, 1],
  description: "Studio-style multi-channel level meters: dB scale, stereo LED ladders with dimmed zone colours, peak-hold markers, per-channel volume and live L/R dB readouts.",
};

const dbOf = (pct: number) => (pct > 0 ? 20 * Math.log10(pct / 100) : -Infinity);
const fmtDb = (db: number) => (Number.isFinite(db) ? fmt(db, db > -10 ? 1 : 0) : "-∞");
const SCALE = [0, -6, -12, -18, -24, -36, -48, -60];

interface Channel {
  id: string;
  name: string;
  full: string;
  l: number;
  r: number;
  vol: number;
  lh: number;
  rh: number;
}
interface Held {
  v: number;
  t: number;
}

export interface MeterBridgeProps extends ShellProps {
  look?: ModuleSettings;
  /** device names / ids; default all */
  channels?: string[];
  orientation?: "vertical" | "horizontal";
  /** dB, default -60 */
  floor?: number;
  segments?: number;
  /** default 1500 */
  holdMs?: number;
  /** default -18 */
  warnDb?: number;
  /** default -6 */
  clipDb?: number;
  showScale?: boolean;
  showVolume?: boolean;
  ladder?: "led" | "smooth";
}

export default function MeterBridge(p: MeterBridgeProps) {
  const d = p.data;
  const floor = p.floor ?? -60,
    warnDb = p.warnDb ?? -18,
    clipDb = p.clipDb ?? -6,
    holdMs = p.holdMs ?? 1500;
  const ids = [...new Set(Object.keys(d || {}).map((k) => k.match(/^plugins\.audio-level-meter\.([^.]+)\.device-name$/)?.[1]).filter((id): id is string => !!id))].filter((id) => id !== "default-audio");
  const volFor = (id: string) => {
    const g = id.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1];
    const key = g && Object.keys(d).find((k) => k.startsWith("plugins.volume-plugin") && k.includes(`{${g}}`) && k.endsWith(".volume"));
    return key ? num(get(d, key)) : NaN;
  };
  const found = ids.map((id) => {
    const k = (s: string) => get(d, `plugins.audio-level-meter.${id}.${s}`);
    const full = String(k("device-name"));
    return { id, name: full.replace(/\s*\(.+\)$/, ""), full, l: dbOf(num(k("left-channel"))), r: dbOf(num(k("right-channel"))), vol: volFor(id) };
  });
  const picked = p.channels ? p.channels.map((c) => found.find((x) => x.id === c || x.name.toLowerCase() === String(c).toLowerCase())).filter((x): x is (typeof found)[number] => !!x) : found;
  // peak hold: the held value lives in a ref and is stamped onto each channel
  const hold = useRef<Record<string, Held>>({});
  const now = Date.now();
  const holdOf = (key: string, cur: number) => {
    const hv = hold.current[key];
    if (!hv || cur >= hv.v || now - hv.t > holdMs) hold.current[key] = { v: cur, t: now };
    return hold.current[key].v;
  };
  const ch: Channel[] = picked.map((c) => ({ ...c, lh: holdOf(c.id + "l", c.l), rh: holdOf(c.id + "r", c.r) }));
  const pos = (db: number) => Math.min(100, Math.max(0, ((Math.max(floor, db) - floor) / -floor) * 100));
  const vertical = p.orientation !== "horizontal";
  const anyLive = ch.some((c) => c.l > floor || c.r > floor);

  // called as a function (not a component): a plain render helper over the numbers it is given
  const ladder = (db: number, hdb: number, n: number, horiz = false) => {
    const held = Number.isFinite(hdb) && hdb > floor ? pos(hdb) : undefined;
    if (p.ladder !== "smooth") return <LedLadder value={pos(db)} n={n} vertical={!horiz} zones={[pos(warnDb), pos(clipDb)]} hold={held} />;
    return (
      <div className={`relative flex ${horiz ? "h-full flex-1 flex-row gap-[2px]" : "w-full flex-1 flex-col-reverse gap-[2px]"}`}>
        <div className="absolute inset-0 rounded-[2px] bg-[color:var(--w-track)]" />
        <div
          className="absolute rounded-[2px] transition-all duration-100"
          style={{
            ...(horiz ? { left: 0, top: 0, bottom: 0, width: `${pos(db)}%` } : { left: 0, right: 0, bottom: 0, height: `${pos(db)}%` }),
            background: `linear-gradient(${horiz ? "90deg" : "0deg"}, var(--accent) 0%, var(--accent) ${pos(warnDb)}%, ${STATE.warn} ${pos(warnDb)}%, ${STATE.warn} ${pos(clipDb)}%, ${STATE.crit} ${pos(clipDb)}%)`,
            backgroundSize: horiz ? `${(100 / Math.max(1, pos(db))) * 100}% 100%` : `100% ${(100 / Math.max(1, pos(db))) * 100}%`,
            backgroundPosition: horiz ? "left" : "bottom",
          }}
        />
        {held !== undefined && <span className="absolute rounded-full bg-[color:var(--w-fg)] transition-all duration-150" style={horiz ? { left: `calc(${held}% - 1px)`, top: -1, bottom: -1, width: 2 } : { bottom: `calc(${held}% - 1px)`, left: -1, right: -1, height: 2 }} />}
      </div>
    );
  };

  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Levels"}
      icon="graphic_eq"
      studio={{ label: "Levels", live: anyLive, meters: ch.map((c) => ({ n: c.name, v: pos(Math.max(c.l, c.r)) })), value: fmtDb(Math.max(...ch.map((c) => Math.max(c.l, c.r)))), unit: "dB" }}
      right={
        <span className="flex items-center gap-1.5 text-[color:var(--w-fg)]">
          <Dot ok={anyLive} />
          {anyLive ? "Live" : "Idle"}
        </span>
      }
    >
      {({ w, h }) => {
        if (!vertical || h < 120) {
          const rowH = 30,
            n = Math.max(1, Math.floor((h + 8) / (rowH + 8)));
          const segs = p.segments ?? Math.max(12, Math.floor(w / 14));
          return (
            <ul className="flex h-full flex-col justify-center gap-2 overflow-hidden">
              {ch.slice(0, n).map((c) => (
                <li key={c.id} className="grid items-center gap-x-3" style={{ gridTemplateColumns: `${w > 340 ? 88 : 60}px minmax(0,1fr) ${w > 300 ? 72 : 40}px` }} title={c.full}>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-xs font-semibold">{c.name}</span>
                    {p.showVolume !== false && Number.isFinite(c.vol) && <span className="text-[10.5px] tabular-nums text-[color:var(--w-faint)]">{fmt(c.vol)}%</span>}
                  </div>
                  <div className="flex h-[22px] flex-col gap-[3px]">
                    {ladder(c.l, c.lh, segs, true)}
                    {ladder(c.r, c.rh, segs, true)}
                  </div>
                  <div className="flex flex-col text-right font-mono text-[10px] leading-tight tabular-nums text-[color:var(--w-muted)]">
                    <span>{fmtDb(c.l)}</span>
                    {w > 300 && <span>{fmtDb(c.r)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          );
        }
        const colMin = 74,
          n = Math.max(1, Math.min(ch.length, Math.floor((w + 14) / (colMin + 14))));
        const colW = (w - (n - 1) * 14) / n,
          scale = p.showScale !== false && colW > 92;
        const segs = p.segments ?? Math.max(10, Math.min(36, Math.floor((h - 52) / 7.5)));
        return (
          <div className="grid h-full gap-x-3.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
            {ch.slice(0, n).map((c) => (
              <div key={c.id} className="flex min-h-0 min-w-0 flex-col gap-2" title={c.full}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">{c.name}</span>
                    {p.showVolume !== false && Number.isFinite(c.vol) && <span className="shrink-0 text-[13px] font-semibold tabular-nums">{fmt(c.vol)}%</span>}
                  </div>
                  {p.showVolume !== false && Number.isFinite(c.vol) && (
                    <div className="h-[3px] overflow-hidden rounded-full bg-[color:var(--w-track)]">
                      <div className="h-full rounded-full bg-[color:var(--w-muted)] transition-[width] duration-300" style={{ width: `${c.vol}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 gap-2">
                  {scale && (
                    <div className="relative w-[30px] shrink-0 font-mono text-[10px] tabular-nums text-[color:var(--w-faint)]">
                      {SCALE.filter((s) => s >= floor).map((s) => (
                        <span key={s} className="absolute right-0 flex -translate-y-1/2 items-center gap-1" style={{ top: `${100 - pos(s)}%` }}>
                          <span className="h-px w-1.5 bg-[color:var(--w-faint)]" />
                          {s === 0 ? "0" : `−${-s}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-1 justify-center gap-[5px]">
                    <div className="flex w-[7px]">{ladder(c.l, c.lh, segs)}</div>
                    <div className="flex w-[7px]">{ladder(c.r, c.rh, segs)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px] tabular-nums text-[color:var(--w-faint)]">
                  <span className="flex justify-between gap-1">
                    <span className="font-sans font-semibold text-[color:var(--w-muted)]">L</span>
                    {fmtDb(c.l)}
                  </span>
                  <span className="flex justify-between gap-1">
                    <span className="font-sans font-semibold text-[color:var(--w-muted)]">R</span>
                    {fmtDb(c.r)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      }}
    </Widget>
  );
}
