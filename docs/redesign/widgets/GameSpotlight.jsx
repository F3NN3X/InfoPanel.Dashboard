import React, { useEffect, useRef, useState } from 'react';
import { Widget, shell, get, num, fmt, has, Img, Icon, Bar, Ring, Dot, MiniViz, KenBurns, Logo } from './kit';

export const meta = { id: 'GameSpotlight', name: 'Game Spotlight', category: 'Gaming', icon: 'stadia_controller',
  prefixes: [], defaultSize: [4, 2], minSize: [1, 1],
  description: 'Now-playing for games: Steam hero banner with slow Ken Burns motion, game logo, poster art and icon, plus session, playtime, FPS, achievements, friends — and an optional music overlay.' };

const GlassPill = ({ children, className = '' }) => <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-zinc-100 ring-1 ring-white/10 backdrop-blur-md ${className}`}>{children}</span>;

// props: layout 'hero' | 'poster' | 'logo' | 'ticker' | 'combo', motion (default true), scrim 0-1, music source 'media' | 'spotify',
//        progress 'wave' | 'visualizer' (combo music card), vizMode
export default function GameSpotlight(p) {
  const d = p.data;
  const P = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.${s}`);
  const S = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-Session.${s}`);
  const A = (s) => get(d, `plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.${s}`);
  const game = S('current-game'), banner = P('current_game_banner_url'), logo = P('game_logo_url'), poster = P('game_grid_url'), icon = P('game_icon_url');
  const fps = num(get(d, 'plugins.InfoPanel.RTSS.rtss.fps'));
  const un = num(A('achievements-unlocked')), tot = num(A('achievements-total')), ach = (un / tot) * 100;
  const inGame = num(get(d, 'plugins.InfoPanel.SteamAPI.SteamAPI-Social.friends-ingame'));
  const ms = p.music === 'spotify' ? 'plugins.spotify-plugin.spotify' : 'plugins.media-plugin.media';
  const track = get(d, `${ms}.current-track`), artist = get(d, `${ms}.artist`), prog = num(get(d, `${ms}.track-progress`));
  const motion = p.motion !== false, scrim = p.scrim ?? 0.6;
  const statusText = P('game-status-text') || 'Now playing';
  const stats = [['Session', S('current-session-time')], ['Playtime', S('current-game-playtime')], ['Avg session', S('avg-session-time')], ...(fps > 0 ? [['FPS', fmt(fps)]] : [])];

  return (
    <Widget {...shell(p)} bleed showHeader={false} studio={{ label: statusText, live: true, value: game, sub: `${S('current-session-time')} session · ${S('current-game-playtime')}`, img: poster || banner, kind: 'text', progress: { a: 'Achievements', pct: ach, b: `${fmt(ach)}%` } }}
      compact={(box) => box.shape === 'tile' ? { label: statusText, value: game, kind: 'text', sub: `${S('current-session-time')} session`, img: poster || banner, pct: ach, icon: 'stadia_controller' } : null}>
      {({ w, h, shape }) => {
        const lay = shape === 'strip' ? 'ticker' : shape === 'column' ? 'poster-tall' : p.layout ?? 'hero';
        const big = h > 260 ? 'text-5xl' : h > 180 ? 'text-4xl' : 'text-2xl';
        if (lay === 'ticker') return (
          <div className="relative flex h-full items-center gap-4 overflow-hidden px-4">
            <KenBurns src={banner} on={motion} className="opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
            <Img src={icon} icon="stadia_controller" className="relative aspect-square h-[58%] shrink-0 rounded-xl ring-1 ring-white/15" />
            <div className="relative flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-zinc-300"><Dot ok />{statusText}</span>
              <Logo src={logo} name={game} size="text-xl" className="max-h-9 max-w-full" />
            </div>
            <div className="relative flex shrink-0 items-center gap-2">
              {w > 520 && fps > 0 && <GlassPill><Icon name="speed" className="text-sm" />{fmt(fps)} fps</GlassPill>}
              <GlassPill><Icon name="timer" className="text-sm" />{S('current-session-time')}</GlassPill>
              {w > 420 && Number.isFinite(ach) && <div className="h-9 w-9"><Ring value={ach} thickness={12} className="h-full w-full"><span className="text-[9px] font-semibold">{fmt(ach)}</span></Ring></div>}
            </div>
          </div>
        );
        if (lay === 'poster' || lay === 'poster-tall') {
          const tall = lay === 'poster-tall' || h > w;
          return (
            <div className={`relative flex h-full overflow-hidden ${tall ? 'flex-col' : 'flex-row'}`}>
              <KenBurns src={banner} on={false} className="scale-110 opacity-60 blur-2xl" />
              <div className="absolute inset-0 bg-black/55" />
              <div className={`relative shrink-0 p-3 ${tall ? 'h-[58%]' : 'h-full'}`}><Img src={poster} icon="image" className={`h-full rounded-xl object-cover shadow-2xl ring-1 ring-white/10 ${tall ? 'w-full' : 'aspect-[2/3]'}`} /></div>
              <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 pl-1">
                <div className="flex flex-col gap-1"><span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-zinc-400">{statusText}</span><span className={`${tall ? 'text-base' : 'text-2xl'} font-bold leading-tight`}>{game}</span></div>
                <div className={`grid gap-x-4 gap-y-2 ${tall ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {stats.slice(0, tall ? 2 : 4).map(([l, v]) => <div key={l} className="flex flex-col"><span className="text-[10.5px] text-zinc-500">{l}</span><span className="text-sm font-semibold tabular-nums">{v}</span></div>)}
                </div>
                {Number.isFinite(ach) && !tall && <div className="flex flex-col gap-1"><div className="flex justify-between text-[10.5px] text-zinc-400"><span>Achievements</span><span className="tabular-nums">{fmt(un)}/{fmt(tot)}</span></div><Bar value={ach} className="h-1.5" track="bg-white/15" /></div>}
              </div>
            </div>
          );
        }
        if (lay === 'logo') return (
          <div className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden p-5 text-center">
            <KenBurns src={banner} on={motion} className="scale-110 blur-md" />
            <div className="absolute inset-0" style={{ background: `radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,${scrim * 0.3}), rgba(0,0,0,${Math.min(1, scrim + 0.25)}))` }} />
            <Logo src={logo} name={game} size={big} className="relative mx-auto max-h-[45%] max-w-[80%] !object-center text-center" />
            <span className="relative flex items-center gap-2 text-xs text-zinc-200"><Dot ok />{S('current-session-time')} this session · {S('current-game-playtime')}</span>
          </div>
        );
        return (
          <div className="relative h-full overflow-hidden">
            <KenBurns src={banner} on={motion} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, rgba(8,8,10,${Math.min(1, scrim + 0.35)}) 0%, rgba(8,8,10,${scrim * 0.5}) 45%, rgba(8,8,10,${scrim * 0.15}) 100%), linear-gradient(90deg, rgba(8,8,10,${scrim * 0.7}), transparent 60%)` }} />
            <div className="relative flex h-full flex-col p-4">
              <div className="flex items-center gap-2">
                <GlassPill><Dot ok />{statusText}</GlassPill>
                {inGame > 0 && w > 380 && <GlassPill><Icon name="group" className="text-sm" />{inGame} friend{inGame > 1 ? 's' : ''} in-game</GlassPill>}
                <GlassPill className="ml-auto"><Icon name="timer" className="text-sm" />{S('current-session-time')}</GlassPill>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <Logo src={logo} name={game} size={big} className={`${h > 220 ? 'max-h-24' : 'max-h-14'} max-w-[65%]`} />
                {lay === 'combo' && has(track) ? (
                  <div className="flex max-w-md items-center gap-3 rounded-2xl bg-black/45 p-2.5 ring-1 ring-white/10 backdrop-blur-xl">
                    <Img src={get(d, `${ms}.cover-art`)} icon="music_note" className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1"><span className="truncate text-xs font-semibold">{track}</span><span className="truncate text-[11px] text-zinc-400">{has(artist) ? artist : 'Now playing'}</span>{p.progress === 'visualizer'
                      ? <MiniViz l={num(get(d, 'plugins.audio-level-meter.default-audio.left-channel')) || 0} r={num(get(d, 'plugins.audio-level-meter.default-audio.right-channel')) || 0} level={num(get(d, 'plugins.audio-level-meter.default-audio.audio-level')) || 0} mode={p.vizMode ?? 'bars'} className="h-6" />
                      : <Bar value={prog > 1 ? prog : prog * 100} style="wave" className="h-2" />}</div>
                  </div>
                ) : h > 150 && (
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                    {stats.slice(0, w > 560 ? 4 : 2).map(([l, v]) => <div key={l} className="flex flex-col"><span className="text-[10.5px] uppercase tracking-[0.08em] text-zinc-400">{l}</span><span className="text-[15px] font-semibold tabular-nums">{v}</span></div>)}
                    {Number.isFinite(ach) && w > 420 && (
                      <div className="ml-auto flex min-w-[150px] max-w-[220px] flex-1 flex-col gap-1">
                        <div className="flex justify-between text-[10.5px]"><span className="flex items-center gap-1 text-zinc-400"><Icon name="trophy" className="text-sm text-amber-300" />{A('latest-achievement')}</span><span className="shrink-0 tabular-nums text-zinc-200">{fmt(ach)}%</span></div>
                        <Bar value={ach} className="h-1.5" track="bg-white/15" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </Widget>
  );
}
