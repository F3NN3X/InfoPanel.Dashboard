import React from 'react';
import { Widget, shell, get, rows, has } from './kit';

export const meta = { id: 'SteamNews', name: 'Game News', category: 'Gaming', icon: 'newspaper',
  prefixes: [], defaultSize: [3, 1], minSize: [1, 1],
  description: 'Latest headlines for the current game and your library. Long titles clamp to fit.' };

// props: lines (title line clamp, default 2)
export default function SteamNews(p) {
  const d = p.data;
  const N = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-News.${s}`);
  const items = rows(N('library-news')).map((r) => ({ game: r[0], title: r.slice(1, -1).join(', '), date: r.at(-1) }));
  if (!items.length && has(N('current_game_news_title'))) items.push({ game: get(d, 'plugins.InfoPanel.SteamAPI.SteamAPI-Session.current-game'), title: N('current_game_news_title') });
  const first = items[0] ?? {};
  return (
    <Widget {...shell(p)} title={p.title ?? 'News'} icon="newspaper"
      compact={{ label: first.game ?? 'News', value: first.title, sub: first.date, kind: 'text', icon: 'newspaper' }}>
      {({ size, h }) => (
        <ul className="flex h-full flex-col gap-3 overflow-hidden">
          {items.slice(0, Math.max(1, Math.floor((h + 12) / (18 + 22 * (p.lines ?? 2) + 12)))).map((n, i) => (
            <li key={i} className="flex min-w-0 gap-3">
              <span className="mt-1 h-auto w-0.5 shrink-0 rounded-full" style={{ background: i === 0 ? 'var(--accent)' : 'rgba(255,255,255,.12)' }} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-zinc-500">{n.game}{n.date ? ` · ${n.date}` : ''}</span>
                <span className={`${size === 'lg' ? 'text-base' : 'text-[13px]'} leading-snug text-zinc-100`} style={{ display: '-webkit-box', WebkitLineClamp: p.lines ?? 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
