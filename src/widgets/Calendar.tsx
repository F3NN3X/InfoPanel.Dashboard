import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, Num, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "Calendar",
  name: "Calendar",
  category: "Info",
  icon: "calendar_today",
  prefixes: [],
  defaultSize: [2, 2],
  minSize: [1, 1],
  description: "Today plus a month grid, driven by the clock plugin date. Week starts Monday by default.",
};

const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const W = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface CalendarProps extends ShellProps {
  look?: ModuleSettings;
  /** 0 = Sunday, 1 = Monday (default). */
  weekStart?: number;
}

export default function Calendar(p: CalendarProps) {
  const d = p.data;
  const k = (s: string) => num(get(d, `plugins.clock-plugin.clock.${s}`));
  const day = k("day"),
    mon = k("month"),
    yr = k("year");
  const date = new Date(yr, mon - 1, day);
  const ws = p.weekStart ?? 1;
  const first = (new Date(yr, mon - 1, 1).getDay() - ws + 7) % 7;
  const len = new Date(yr, mon, 0).getDate();
  const cells: (number | null)[] = [...Array(Number.isFinite(first) ? first : 0).fill(null), ...Array.from({ length: Number.isFinite(len) ? len : 0 }, (_, i) => i + 1)];
  const week = Math.ceil((date.getTime() - new Date(yr, 0, 1).getTime()) / 864e5 / 7);
  return (
    <Widget {...shell(p)} title={p.title} showHeader={false} compact={{ label: W[date.getDay()], value: day, sub: `${M[mon - 1]} ${yr}`, kind: "value", icon: "calendar_today" }}>
      {({ size, w }) => (
        <div className="flex h-full gap-5">
          {(size === "lg" || w > 420) && (
            <div className="flex shrink-0 flex-col justify-between">
              <span className="text-sm font-medium text-[color:var(--accent)]">{W[date.getDay()]}</span>
              <Num className="text-7xl font-semibold leading-none tracking-tight">{day}</Num>
              <span className="text-sm text-[color:var(--w-muted)]">
                {M[mon - 1]} {yr} · W{week}
              </span>
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-semibold text-[color:var(--w-fg)]">{M[mon - 1]}</span>
            <div className="grid min-h-0 flex-1 grid-cols-7 gap-0.5 text-center text-[11px]" style={{ gridAutoRows: "minmax(0,1fr)" }}>
              {Array.from({ length: 7 }, (_, i) => (
                <span key={`h${i}`} className="text-[10px] font-medium text-[color:var(--w-faint)]">
                  {W[(i + ws) % 7][0]}
                </span>
              ))}
              {cells.map((c, i) => (
                <span
                  key={i}
                  className={`flex items-center justify-center rounded-md tabular-nums ${c === day ? "font-semibold text-[#0c0c0e]" : c ? "text-[color:var(--w-fg)]" : ""}`}
                  style={c === day ? { background: "var(--accent)" } : undefined}
                >
                  {c ?? ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Widget>
  );
}
