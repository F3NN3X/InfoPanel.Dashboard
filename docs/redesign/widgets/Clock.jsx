import React from 'react';
import { Widget, shell, get, num } from './kit';

export const meta = { id: 'Clock', name: 'Clock', category: 'Info', icon: 'schedule',
  prefixes: ['plugins.clock-plugin.'], defaultSize: [2, 1], minSize: [1, 1],
  description: 'Digital or analog clock with date, 12/24h and seconds.' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Analog({ h, m, s, seconds }) {
  const hand = (deg, len, w, c) => <line x1="50" y1="50" x2={50 + len * Math.sin((deg * Math.PI) / 180)} y2={50 - len * Math.cos((deg * Math.PI) / 180)} stroke={c} strokeWidth={w} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 100 100" className="aspect-square h-full max-h-full">
      <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="7" x2="50" y2={i % 3 ? 10 : 13} stroke="rgba(255,255,255,0.35)" strokeWidth={i % 3 ? 1 : 2} transform={`rotate(${i * 30} 50 50)`} />)}
      {hand(((h % 12) + m / 60) * 30, 24, 3.5, '#f4f4f5')}
      {hand((m + s / 60) * 6, 34, 2.5, '#d4d4d8')}
      {seconds && hand(s * 6, 38, 1.2, 'var(--accent)')}
      <circle cx="50" cy="50" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

// props: format '24h' | '12h', showSeconds, showDate, face 'digital' | 'analog'
export default function Clock(p) {
  const d = p.data;
  const k = (s) => num(get(d, `plugins.clock-plugin.clock.${s}`));
  const H = k('24-hour'), M = k('minute'), S = k('second'), day = k('day'), mon = k('month'), yr = k('year');
  const h12 = p.format === '12h';
  const hh = h12 ? k('12-hour') : H;
  const pad = (v) => String(Number.isFinite(v) ? v : 0).padStart(2, '0');
  const date = new Date(yr, mon - 1, day);
  const secs = p.showSeconds ?? true;
  return (
    <Widget {...shell(p)} title={p.title} showHeader={!!p.title} studio={{ label: `${DAYS[date.getDay()]} · ${day} ${MONTHS[mon - 1]}`, value: `${pad(hh)}:${pad(M)}`, unit: h12 ? (k('pm') ? 'PM' : 'AM') : secs ? pad(S) : '', kind: 'value' }}>
      {({ size }) => p.face === 'analog' ? (
        <div className="flex h-full items-center justify-center gap-5">
          <Analog h={H} m={M} s={S} seconds={secs} />
          {size !== 'xs' && size !== 'sm' && p.showDate !== false && (
            <div className="flex flex-col">
              <span className="text-sm text-zinc-400">{DAYS[date.getDay()]}</span>
              <span className="text-3xl font-semibold tabular-nums">{pad(hh)}:{pad(M)}</span>
              <span className="text-sm text-zinc-400">{day} {MONTHS[mon - 1]} {yr}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col justify-center">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className={`${{ xs: 'text-3xl', sm: 'text-5xl', md: 'text-7xl', lg: 'text-8xl' }[size]} font-semibold tabular-nums tracking-tight`}>
              {pad(hh)}<span className="animate-pulse text-[color:var(--accent)]">:</span>{pad(M)}
            </span>
            {secs && size !== 'xs' && <span className="font-mono text-lg tabular-nums text-zinc-500">{pad(S)}</span>}
            {h12 && <span className="text-sm font-medium text-zinc-400">{k('pm') ? 'PM' : 'AM'}</span>}
          </div>
          {p.showDate !== false && <span className={`${size === 'xs' ? 'mt-1 text-[11px]' : 'mt-2 text-sm'} text-zinc-400`}>{DAYS[date.getDay()]}, {day} {MONTHS[mon - 1]}{size === 'lg' ? ` ${yr}` : ''}</span>}
        </div>
      )}
    </Widget>
  );
}
