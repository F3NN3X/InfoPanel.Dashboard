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
}

// A rate readout; called as a function so nothing is defined during render.
const rate = (dir: "down" | "up", v: number, big: string) => (
  <div className="flex min-w-0 items-center gap-1.5">
    <Icon name={dir === "down" ? "south" : "north"} className={`text-[15px] ${dir === "down" ? "text-[color:var(--accent)]" : "text-violet-400"}`} />
    <Num className={`${big} truncate font-semibold`}>{fmtRate(v)}</Num>
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
  const name = p.title ?? pretty(id).replace(/  +/g, " ");
  return (
    <Widget
      {...shell(p)}
      title={name}
      icon="swap_vert"
      compact={{ label: name, value: fmtRate(dn), sub: `↑ ${fmtRate(up)}`, hist: dH, min: 0, icon: "south" }}
      right={<span className="tabular-nums text-[color:var(--w-muted)]">{fmt(k("network_utilization"), 1)}%</span>}
    >
      {({ size }) =>
        size === "xs" ? (
          <div className="flex h-full flex-col justify-center gap-1">
            {rate("down", dn, "text-base")}
            {rate("up", up, "text-base")}
          </div>
        ) : (
          <div className="flex h-full flex-col gap-2">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {rate("down", dn, size === "lg" ? "text-3xl" : "text-xl")}
              {rate("up", up, size === "lg" ? "text-3xl" : "text-xl")}
            </div>
            {p.chart === "mirrored" ? (
              <div className="relative min-h-[24px] flex-1">
                <Spark values={dH} min={0} max={Math.max(1, ...dH, ...uH)} className="absolute inset-x-0 top-0 h-1/2" />
                <Spark values={uH} min={0} max={Math.max(1, ...dH, ...uH)} color={hue(70)} className="absolute inset-x-0 bottom-0 h-1/2 -scale-y-100" />
                <div className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--w-track)]" />
              </div>
            ) : (
              <div className="relative min-h-[24px] flex-1">
                <Spark values={dH} min={0} className="absolute inset-0 h-full" />
                <Spark values={uH} min={0} fill={false} color="#a78bfa" className="absolute inset-0 h-full" />
              </div>
            )}
            {size !== "sm" && (
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
