import React from 'react';
import { Widget, shell, get, num, fmt, has, rows, Icon, Stat, weatherIcon } from './kit';

export const meta = { id: 'Weather', name: 'Weather', category: 'Info', icon: 'partly_cloudy_day',
  prefixes: ['plugins.yr-weather-plugin.', 'plugins.weather-plugin.'], defaultSize: [3, 2], minSize: [1, 1],
  description: 'Current conditions, feels-like, wind, humidity, pressure, rain/snow and 7-day forecast (MET/Yr or OpenWeatherMap).' };

const ICON = weatherIcon;
const compass = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) / 45)) % 8];

// props: provider 'yr' | 'owm' (default: yr if available), location (yr container slug), units 'C' | 'F'
export default function Weather(p) {
  const d = p.data;
  const yr = [...new Set(Object.keys(d || {}).map((k) => k.match(/^plugins\.yr-weather-plugin\.([^.]+)\.temp$/)?.[1]).filter(Boolean))];
  const prov = p.provider ?? (yr.length ? 'yr' : 'owm');
  const base = prov === 'yr' ? `plugins.yr-weather-plugin.${p.location ?? yr[0]}` : 'plugins.weather-plugin.weather';
  const k = (s) => get(d, `${base}.${s}`);
  const F = p.units === 'F'; const T = (c) => (F ? c * 9 / 5 + 32 : c);
  const temp = num(k('temp')), feels = num(k('feels_like'));
  const fc = rows(k('forecast')).map(([date, cond, range, rain, wind]) => { const [hi, lo] = String(range).split('/').map(num); return { date: date?.split(' ')[0], cond, hi, lo, rain: num(rain), wind }; });
  const lo = Math.min(...fc.map((f) => f.lo)), hi = Math.max(...fc.map((f) => f.hi));
  const icon = ICON(`${k('weather_icon')} ${k('weather_desc')}`);
  return (
    <Widget {...shell(p)} title={p.title ?? (has(k('name')) ? k('name') : 'Weather')} icon="location_on" compact={{ label: has(k('name')) ? k('name') : 'Weather', value: `${fmt(T(temp), 0)}°`, sub: `${k('weather_desc')} · feels ${fmt(T(feels), 0)}°`, icon, kind: 'value' }} right={has(k('last_refreshed')) && <span className="font-mono text-[10px] text-zinc-500">{String(k('last_refreshed')).slice(11)}</span>}>
      {({ size }) => {
        const Now = (
          <div className="flex min-w-0 items-center gap-3">
            <Icon name={icon} fill className={`${{ xs: 'text-3xl', sm: 'text-5xl', md: 'text-6xl', lg: 'text-7xl' }[size]} text-[color:var(--accent)]`} />
            <div className="flex min-w-0 flex-col">
              <span className={`${{ xs: 'text-2xl', sm: 'text-4xl', md: 'text-5xl', lg: 'text-6xl' }[size]} font-semibold leading-none tabular-nums tracking-tight`}>{fmt(T(temp), 0)}°</span>
              {size !== 'xs' && <span className="mt-1 truncate text-xs text-zinc-400">{k('weather_desc')} · feels {fmt(T(feels), 0)}°</span>}
            </div>
          </div>
        );
        if (size === 'xs' || size === 'sm') return <div className="flex h-full items-center">{Now}</div>;
        return (
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              {Now}
              <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-2">
                <Stat label="Wind" value={`${fmt(num(k('wind_speed')), 1)} m/s ${compass(num(k('wind_deg')))}`} />
                <Stat label="Humidity" value={`${fmt(num(k('humidity')))}%`} />
                {size === 'lg' && <><Stat label="Gusts" value={`${fmt(num(k('wind_gust')), 1)} m/s`} /><Stat label="Pressure" value={`${fmt(num(k('pressure')))} hPa`} />
                  <Stat label="Clouds" value={`${fmt(num(k('clouds')))}%`} /><Stat label={num(k('snow')) > 0 ? 'Snow' : 'Rain'} value={`${fmt(num(k(num(k('snow')) > 0 ? 'snow' : 'rain')), 1)} mm/h`} /></>}
              </div>
            </div>
            {fc.length > 0 && (
              <div className="mt-auto grid gap-1.5 border-t border-white/[0.06] pt-3" style={{ gridTemplateColumns: `repeat(${size === 'lg' ? fc.length : Math.min(5, fc.length)}, minmax(0,1fr))` }}>
                {fc.slice(0, size === 'lg' ? 7 : 5).map((f, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5" title={`${f.cond} · ${f.rain} mm · ${f.wind}`}>
                    <span className="text-[11px] text-zinc-400">{i === 0 ? 'Tmrw' : f.date}</span>
                    <Icon name={ICON(f.cond)} className="text-xl text-zinc-200" />
                    <span className="text-xs font-semibold tabular-nums">{fmt(T(f.hi), 0)}°</span>
                    {size === 'lg' && (
                      <div className="relative h-10 w-1 rounded-full bg-white/[0.08]">
                        <div className="absolute inset-x-0 rounded-full" style={{ background: 'var(--accent)', bottom: `${((f.lo - lo) / (hi - lo || 1)) * 100}%`, top: `${100 - ((f.hi - lo) / (hi - lo || 1)) * 100}%` }} />
                      </div>
                    )}
                    <span className="text-[11px] tabular-nums text-zinc-500">{fmt(T(f.lo), 0)}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </Widget>
  );
}
