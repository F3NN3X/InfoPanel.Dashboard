import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, fmt, fmtGB, fmtRate, detect, pretty, hue, Spark, Stat, Icon, Num, useHistory, Empty, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "NetworkThroughput",
  name: "Network Traffic",
  category: "Network",
  icon: "swap_vert",
  prefixes: ["libre.ethernet", "libre.wifi", "libre.tailscale", "libre.bluetooth_network", "libre.vethernet"],
  defaultSize: [3, 1],
  minSize: [1, 1],
  description: "Live download / upload rate with history, totals and utilisation per adapter.",
};

export interface NetworkThroughputProps extends ShellProps {
  look?: ModuleSettings;
  /** Adapter slug, e.g. "ethernet", "wifi", "tailscale"; default = busiest adapter. */
  adapter?: string;
  chart?: "overlay" | "mirrored";
  /** `totals` leads with the session totals row (kept at every tier above xs). */
  view?: "speeds" | "totals";
  /** The session totals + utilisation row (default on). */
  showTotals?: boolean;
  /** The rolling download / upload trend (default off, as the setting). */
  sparkline?: boolean;
  /** Download / upload colours; empty = accent / violet. */
  downloadColor?: string;
  uploadColor?: string;
}

// A rate readout; called as a function so nothing is defined during render.
const UP = "#a78bfa";
const rate = (dir: "down" | "up", v: number, big: string, color: string, custom: boolean, label?: string) => (
  <div className="flex min-w-0 flex-col" style={{ color }}>
    <div className="flex items-center gap-1.5">
      <Icon name={dir === "down" ? "south" : "north"} className="text-[15px]" />
      {label && <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[color:var(--w-muted)]">{label}</span>}
      {!label && <Num className={`${big} truncate font-semibold`} style={custom ? undefined : { color: "var(--w-fg)" }}>{fmtRate(v)}</Num>}
    </div>
    {label && <Num className={`${big} truncate font-semibold`} style={custom ? undefined : { color: "var(--w-fg)" }}>{fmtRate(v)}</Num>}
  </div>
);

export default function NetworkThroughput(p: NetworkThroughputProps) {
  const d = p.data;
  const all = detect(d, /^libre\.(.+)_download_speed$/);
  const sum = (a: string) => num(get(d, `libre.${a}_download_speed`)) + num(get(d, `libre.${a}_upload_speed`));
  const id = p.adapter ?? [...all].sort((a, b) => sum(b) - sum(a))[0];
  const k = (s: string) => num(get(d, `libre.${id}_${s}`));
  const dn = k("download_speed"),
    up = k("upload_speed");
  const dH = useHistory(dn),
    uH = useHistory(up);
  if (!id)
    return (
      <Widget {...shell(p)} title="Network" icon="swap_vert">
        <Empty />
      </Widget>
    );
  const dlColor = p.downloadColor || "var(--accent)";
  const ulColor = p.uploadColor || UP;
  const showTotals = p.showTotals !== false;
  const showChart = p.sparkline === true;
  const name = p.title ?? pretty(id).replace(/  +/g, " ");
  return (
    <Widget
      {...shell(p)}
      title={name}
      icon="swap_vert"
      compact={(box) =>
        // a 2x1 tile has no room for the sub line: lay both speeds out instead of dropping the upload
        box.shape === "tile" && box.w >= 200 ? undefined : { label: name, value: fmtRate(dn), sub: `↑ ${fmtRate(up)}`, hist: dH, min: 0, icon: "south" }
      }
      right={<span className="tabular-nums text-[color:var(--w-muted)]">{fmt(k("network_utilization"), 1)}%</span>}
    >
      {({ size }) =>
        size === "xs" ? (
          <div className="flex h-full flex-col justify-center gap-1">
            {rate("down", dn, "text-base", dlColor, !!p.downloadColor)}
            {rate("up", up, "text-base", ulColor, !!p.uploadColor)}
          </div>
        ) : (
          <div className={`flex h-full flex-col gap-2 ${showChart ? "" : "justify-center gap-4"}`}>
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              {rate("down", dn, size === "lg" ? "text-3xl" : "text-xl", dlColor, !!p.downloadColor, "Download")}
              {rate("up", up, size === "lg" ? "text-3xl" : "text-xl", ulColor, !!p.uploadColor, "Upload")}
            </div>
            {!showChart ? null : p.chart === "mirrored" ? (
              <div className="relative min-h-[24px] flex-1">
                <Spark values={dH} min={0} max={Math.max(1, ...dH, ...uH)} color={dlColor} className="absolute inset-x-0 top-0 h-1/2" />
                <Spark values={uH} min={0} max={Math.max(1, ...dH, ...uH)} color={p.uploadColor || hue(70)} className="absolute inset-x-0 bottom-0 h-1/2 -scale-y-100" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--w-track)]" />
              </div>
            ) : (
              <div className="relative min-h-[24px] flex-1">
                <Spark values={dH} min={0} color={dlColor} className="absolute inset-0 h-full" />
                <Spark values={uH} min={0} fill={false} color={ulColor} className="absolute inset-0 h-full" />
              </div>
            )}
            {showTotals && (size !== "sm" || p.view === "totals") && (
              <div className="grid grid-cols-3 gap-3 border-t border-[color:var(--w-track)] pt-2.5">
                <Stat label="Downloaded" value={fmtGB(k("data_downloaded"))} />
                <Stat label="Uploaded" value={fmtGB(k("data_uploaded"))} />
                <Stat label="Utilisation" value={`${fmt(k("network_utilization"), 2)}%`} />
              </div>
            )}
          </div>
        )
      }
    </Widget>
  );
}
