import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, Num, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "Clock",
  name: "Clock",
  category: "Info",
  icon: "schedule",
  prefixes: ["plugins.clock-plugin."],
  defaultSize: [2, 1],
  minSize: [1, 1],
  description: "Digital or analog clock with date, 12/24h and seconds.",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Analog({ h, m, s, seconds }: { h: number; m: number; s: number; seconds: boolean }) {
  const hand = (deg: number, len: number, w: number, c: string) => (
    <line x1="50" y1="50" x2={50 + len * Math.sin((deg * Math.PI) / 180)} y2={50 - len * Math.cos((deg * Math.PI) / 180)} stroke={c} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <svg viewBox="0 0 100 100" className="aspect-square h-full max-h-full">
      <circle cx="50" cy="50" r="47" fill="var(--w-track)" stroke="var(--w-track)" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="50" y1="7" x2="50" y2={i % 3 ? 10 : 13} stroke="var(--w-faint)" strokeWidth={i % 3 ? 1 : 2} transform={`rotate(${i * 30} 50 50)`} />
      ))}
      {hand(((h % 12) + m / 60) * 30, 24, 3.5, "var(--w-fg)")}
      {hand((m + s / 60) * 6, 34, 2.5, "var(--w-muted)")}
      {seconds && hand(s * 6, 38, 1.2, "var(--accent)")}
      <circle cx="50" cy="50" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

export interface ClockProps extends ShellProps {
  look?: ModuleSettings;
  format?: "24h" | "12h";
  showSeconds?: boolean;
  showDate?: boolean;
  face?: "digital" | "analog";
}

export default function Clock(p: ClockProps) {
  const d = p.data;
  const k = (s: string) => num(get(d, `plugins.clock-plugin.clock.${s}`));
  const H = k("24-hour"),
    M = k("minute"),
    S = k("second"),
    day = k("day"),
    mon = k("month"),
    yr = k("year");
  const h12 = p.format === "12h";
  const hh = h12 ? k("12-hour") : H;
  const pad = (v: number) => String(Number.isFinite(v) ? v : 0).padStart(2, "0");
  const date = new Date(yr, mon - 1, day);
  const secs = p.showSeconds ?? true;
  return (
    <Widget
      {...shell(p)}
      title={p.title}
      showHeader={!!p.title}
      studio={{ label: `${DAYS[date.getDay()]} · ${day} ${MONTHS[mon - 1]}`, value: `${pad(hh)}:${pad(M)}`, unit: h12 ? (k("pm") ? "PM" : "AM") : secs ? pad(S) : "", kind: "value" }}
    >
      {({ size }) =>
        p.face === "analog" ? (
          <div className="flex h-full items-center justify-center gap-5">
            <Analog h={H} m={M} s={S} seconds={secs} />
            {size !== "xs" && size !== "sm" && p.showDate !== false && (
              <div className="flex flex-col">
                <span className="text-sm text-[color:var(--w-muted)]">{DAYS[date.getDay()]}</span>
                <Num className="text-3xl font-semibold">
                  {pad(hh)}:{pad(M)}
                </Num>
                <span className="text-sm text-[color:var(--w-muted)]">
                  {day} {MONTHS[mon - 1]} {yr}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center">
            <div className="flex items-baseline gap-1.5 leading-none">
              <Num className={`${{ xs: "text-3xl", sm: "text-5xl", md: "text-7xl", lg: "text-8xl" }[size]} font-semibold tracking-tight`}>
                {pad(hh)}
                <span className="animate-pulse text-[color:var(--accent)]">:</span>
                {pad(M)}
              </Num>
              {secs && size !== "xs" && <span className="font-mono text-lg tabular-nums text-[color:var(--w-faint)]">{pad(S)}</span>}
              {h12 && <span className="text-sm font-medium text-[color:var(--w-muted)]">{k("pm") ? "PM" : "AM"}</span>}
            </div>
            {p.showDate !== false && (
              <span className={`${size === "xs" ? "mt-1 text-[11px]" : "mt-2 text-sm"} text-[color:var(--w-muted)]`}>
                {DAYS[date.getDay()]}, {day} {MONTHS[mon - 1]}
                {size === "lg" ? ` ${yr}` : ""}
              </span>
            )}
          </div>
        )
      }
    </Widget>
  );
}
