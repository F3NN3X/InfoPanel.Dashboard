import { Fragment } from "react";
import type { ModuleSettings } from "@/modules/types";
import { bodyGap, Widget, shell, get, num, Num, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "Uptime",
  name: "Uptime",
  category: "System",
  icon: "timer",
  prefixes: ["plugins.system-info-plugin.uptime."],
  defaultSize: [2, 1],
  minSize: [1, 1],
  description: "Time since boot as days / hours / minutes / seconds.",
};

export interface UptimeProps extends ShellProps {
  look?: ModuleSettings;
  showSeconds?: boolean;
}

export default function Uptime(p: UptimeProps) {
  const d = p.data;
  const k = (s: string) => num(get(d, `plugins.system-info-plugin.uptime.${s}`));
  const parts: [string, number, string][] = [
    ["d", k("days"), "days"],
    ["h", k("hours"), "hours"],
    ["m", k("minutes"), "min"],
    ["s", k("seconds"), "sec"],
  ];
  const shown = parts.filter((_, i) => i < 3 || p.showSeconds !== false);
  const pad = (v: number) => String(Number.isFinite(v) ? v : 0).padStart(2, "0");
  return (
    <Widget {...shell(p)} title={p.title ?? "Uptime"} icon="timer" compact={{ label: "Uptime", value: `${k("days")}d ${k("hours")}h`, sub: `${pad(k("minutes"))}m ${pad(k("seconds"))}s`, kind: "value" }}>
      {({ size, w }) =>
        size === "xs" ? (
          <div className="flex h-full flex-col justify-center">
            <span className="text-[11px] text-[color:var(--w-muted)]">Uptime</span>
            <Num className="text-2xl font-semibold">
              {k("days")}d {k("hours")}h {pad(k("minutes"))}m
            </Num>
          </div>
        ) : (
          // the look's gap is the space between two numbers, split around the colon
          <div className="flex h-full items-center justify-between gap-2" style={{ columnGap: bodyGap(p.look, 16, w) / 2 }}>
            {shown.map(([u, v, l], i) => (
              <Fragment key={u}>
                {i > 0 && <span className="pb-4 text-2xl font-light text-[color:var(--w-faint)]">:</span>}
                <div className="flex flex-1 flex-col items-center">
                  <Num className={`${size === "lg" ? "text-7xl" : size === "md" ? "text-5xl" : "text-3xl"} font-semibold leading-none tracking-tight`} style={u === "d" ? { color: "var(--accent)" } : undefined}>
                    {pad(v)}
                  </Num>
                  <span className="mt-1.5 text-[10.5px] uppercase tracking-wider text-[color:var(--w-faint)]">{l}</span>
                </div>
              </Fragment>
            ))}
          </div>
        )
      }
    </Widget>
  );
}
