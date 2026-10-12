import React from 'react';
import { Widget, shell, get, num, fmt, rows, has, Metric, Stat, Bar, Icon } from './kit';

export const meta = { id: 'SteamLibrary', name: 'Steam Library', category: 'Gaming', icon: 'library_books',
  prefixes: ['plugins.InfoPanel.SteamAPI.SteamAPI-Library.', 'plugins.InfoPanel.SteamAPI.SteamAPI-News.'], defaultSize: [3, 2], minSize: [1, 1],
  description: 'Games owned, total + recent playtime, recent games with 2-week hours, and game news.' };

// props: showNews (default: lg only)
export default function SteamLibrary(p) {
  const d = p.data;
  const L = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-Library.${s}`);
  const N = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-News.${s}`);
  const recent = rows(L('recent-games')).map(([name, two, total]) => ({ name, two: num(two), total: num(total) }));
  const news = rows(N('library-news')).map((r) => ({ game: r[0], title: r.slice(1, -1).join(', '), date: r.at(-1) }));
  const maxTwo = Math.max(1, ...recent.map((r) => r.two));
  return (
    <Widget {...shell(p)} title={p.title ?? 'Library'} icon="library_books" compact={{ label: 'Steam library', value: num(L('total-games')), unit: 'games', sub: `${fmt(num(L('total-playtime')))} hrs played`, kind: 'value' }}>
      {({ size }) => size === 'xs' ? (
        <Metric value={num(L('total-games'))} scale="lg" sub={`${fmt(num(L('total-playtime')))} hrs played`} label="Games" className="h-full justify-center" />
      ) : (
        <div className="flex h-full flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Games" value={num(L('total-games'))} scale={size === 'sm' ? 'md' : 'lg'} />
            <Metric label="Total hrs" value={num(L('total-playtime'))} scale={size === 'sm' ? 'md' : 'lg'} />
            <Metric label="2 weeks" value={num(L('recent-playtime'))} unit="h" scale={size === 'sm' ? 'md' : 'lg'} />
          </div>
          {size !== 'sm' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between text-[11px] text-zinc-500"><span>Recently played · {L('recent-sessions')}</span><span>2 wk / total</span></div>
              {recent.map((r) => (
                <div key={r.name} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-2 text-xs"><span className="truncate text-zinc-200">{r.name}</span><span className="shrink-0 tabular-nums text-zinc-400">{fmt(r.two, 1)}h / {fmt(r.total, 1)}h</span></div>
                  <Bar value={r.two} max={maxTwo} className="h-1" />
                </div>
              ))}
            </div>
          )}
          {(p.showNews ?? size === 'lg') && news.length > 0 && (
            <div className="flex min-h-0 flex-col gap-2 overflow-hidden border-t border-white/[0.06] pt-3">
              <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Icon name="newspaper" className="text-sm" />News</span>
              {news.map((n, i) => (
                <div key={i} className="flex min-w-0 flex-col">
                  <span className="line-clamp-1 text-xs text-zinc-200">{n.title}</span>
                  <span className="text-[10.5px] text-zinc-500">{n.game} · {n.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
