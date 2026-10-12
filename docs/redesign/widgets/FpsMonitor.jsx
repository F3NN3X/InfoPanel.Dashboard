import React from 'react';
import { Widget, shell, get, num, fmt, has, Metric, Spark, Stat, Chip, useHistory, Icon } from './kit';

export const meta = { id: 'FpsMonitor', name: 'FPS Monitor', category: 'Gaming', icon: 'speed',
  prefixes: ['plugins.InfoPanel.RTSS.'], defaultSize: [3, 2], minSize: [1, 1],
  description: 'RTSS frame rate, 1% low, frame time graph, game and display info.' };

// props: target (fps target line, default = refresh rate)
export default function FpsMonitor(p) {
  const d = p.data;
  const k = (s) => get(d, `plugins.InfoPanel.RTSS.rtss.${s}`);
  const fps = num(k('fps')), low = num(k('1% low fps')), ft = num(k('current frame time'));
  const hz = num(k('refreshrate')), target = p.target ?? hz;
  const title = k('windowtitle'); const idle = !fps || /no games/i.test(title);
  const hist = useHistory(ft, 90);
  const fpsH = useHistory(fps, 60);
  const pct = Number.isFinite(target) && target > 0 ? fps / target : 1;
  const t = pct >= 0.9 ? 'ok' : pct >= 0.5 ? 'warn' : 'crit';
  return (
    <Widget {...shell(p)} title={p.title ?? (idle ? 'FPS' : title)} icon="speed" compact={{ label: idle ? 'FPS' : title, value: idle ? '–' : fps, unit: idle ? '' : 'FPS', sub: idle ? 'No game running' : `1% ${fmt(low)} · ${fmt(ft, 1)} ms`, hist: idle ? null : fpsH, kind: idle ? 'value' : 'spark', t: idle ? 'ok' : t }} right={has(k('graphics-api')) && <Chip>{k('graphics-api')}</Chip>}>
      {({ size }) => idle && size !== 'xs' ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <Icon name="sports_esports" className="text-3xl text-zinc-600" />
          <span className="text-sm text-zinc-300">No game running</span>
          {size !== 'sm' && <span className="text-[11px] text-zinc-500">{k('gpu-name')} · {k('resolution')} @ {fmt(hz)} Hz</span>}
        </div>
      ) : size === 'xs' ? (
        <Metric value={idle ? '–' : fps} unit="FPS" scale="lg" sub={idle ? 'Idle' : `1% ${fmt(low)}`} t={idle ? 'ok' : t} className="h-full justify-center" />
      ) : size === 'sm' ? (
        <div className="flex h-full items-end justify-between gap-3">
          <Metric value={fps} unit="FPS" scale="xl" t={t} />
          <div className="grid gap-1.5 text-right"><Stat label="1% low" value={fmt(low)} /><Stat label="Frame" value={`${fmt(ft, 1)} ms`} /></div>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-end gap-5">
            <Metric value={fps} unit="FPS" scale={size === 'lg' ? '2xl' : 'xl'} t={t} />
            <div className="grid flex-1 grid-cols-3 gap-3">
              <Stat label="1% low" value={fmt(low)} />
              <Stat label="Avg" value={fmt(num(k('avg-fps')))} />
              <Stat label="Frame time" value={`${fmt(ft, 1)} ms`} />
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <Spark values={hist} min={0} className="absolute inset-0 h-full" />
            <span className="absolute right-0 top-0 text-[10px] text-zinc-500">frame time</span>
          </div>
          {size === 'lg' && (
            <div className="grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-3">
              <Stat label="Min / Max" value={`${fmt(num(k('min-fps')))} / ${fmt(num(k('max-fps')))}`} />
              <Stat label="Display" value={`${k('resolution')} · ${fmt(hz)} Hz`} />
              <Stat label="Mode" value={has(k('display-mode')) ? k('display-mode') : '–'} />
              <Stat label="Benchmark" value={k('benchmark-mode') || '–'} />
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
