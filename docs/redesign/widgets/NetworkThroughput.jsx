import React from 'react';
import { Widget, shell, get, num, fmt, fmtGB, fmtRate, detect, pretty, Spark, Stat, Icon, useHistory, Empty } from './kit';

export const meta = { id: 'NetworkThroughput', name: 'Network Traffic', category: 'Network', icon: 'swap_vert',
  prefixes: ['libre.ethernet', 'libre.wifi', 'libre.tailscale', 'libre.bluetooth_network', 'libre.vethernet'], defaultSize: [3, 1], minSize: [1, 1],
  description: 'Live download / upload rate with history, totals and utilisation per adapter.' };

// props: adapter (slug, e.g. "ethernet", "wifi", "tailscale"); default = busiest adapter
export default function NetworkThroughput(p) {
  const d = p.data;
  const all = detect(d, /^libre\.(.+)_download_speed$/);
  const rate = (a) => num(get(d, `libre.${a}_download_speed`)) + num(get(d, `libre.${a}_upload_speed`));
  const id = p.adapter ?? [...all].sort((a, b) => rate(b) - rate(a))[0];
  if (!id) return <Widget {...shell(p)} title="Network" icon="swap_vert"><Empty /></Widget>;
  const k = (s) => num(get(d, `libre.${id}_${s}`));
  const dn = k('download_speed'), up = k('upload_speed');
  const dH = useHistory(dn), uH = useHistory(up);
  const name = p.title ?? pretty(id).replace(/  +/g, ' ');
  const Rate = ({ dir, v, big }) => (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon name={dir === 'down' ? 'south' : 'north'} className={`text-[15px] ${dir === 'down' ? 'text-[color:var(--accent)]' : 'text-violet-400'}`} />
      <span className={`${big} truncate font-semibold tabular-nums`}>{fmtRate(v)}</span>
    </div>
  );
  return (
    <Widget {...shell(p)} title={name} icon="swap_vert" compact={{ label: name, value: fmtRate(dn), sub: `↑ ${fmtRate(up)}`, hist: dH, min: 0, icon: 'south' }} right={<span className="tabular-nums text-zinc-400">{fmt(k('network_utilization'), 1)}%</span>}>
      {({ size }) => size === 'xs' ? (
        <div className="flex h-full flex-col justify-center gap-1"><Rate dir="down" v={dn} big="text-base" /><Rate dir="up" v={up} big="text-base" /></div>
      ) : (
        <div className="flex h-full flex-col gap-2">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Rate dir="down" v={dn} big={size === 'lg' ? 'text-3xl' : 'text-xl'} />
            <Rate dir="up" v={up} big={size === 'lg' ? 'text-3xl' : 'text-xl'} />
          </div>
          {p.chart === 'mirrored' ? (
            <div className="relative min-h-[24px] flex-1">
              <Spark values={dH} min={0} max={Math.max(1, ...dH, ...uH)} className="absolute inset-x-0 top-0 h-1/2" />
              <Spark values={uH} min={0} max={Math.max(1, ...dH, ...uH)} color="oklch(from var(--accent) l c calc(h + 70))" className="absolute inset-x-0 bottom-0 h-1/2 -scale-y-100" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
            </div>
          ) : (
            <div className="relative min-h-[24px] flex-1">
              <Spark values={dH} min={0} className="absolute inset-0 h-full" />
              <Spark values={uH} min={0} fill={false} color="#a78bfa" className="absolute inset-0 h-full" />
            </div>
          )}
          {size !== 'sm' && (
            <div className="grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-2.5">
              <Stat label="Downloaded" value={fmtGB(k('data_downloaded'))} />
              <Stat label="Uploaded" value={fmtGB(k('data_uploaded'))} />
              <Stat label="Utilisation" value={`${fmt(k('network_utilization'), 2)}%`} />
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
