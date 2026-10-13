import React from 'react';
import { Widget, shell, get, num, has, Img, Icon, Bar, Chip, MiniViz } from './kit';

export const meta = { id: 'NowPlaying', name: 'Now Playing', category: 'Media', icon: 'music_note',
  prefixes: ['plugins.media-plugin.', 'plugins.spotify-plugin.', 'spotify.'], defaultSize: [3, 1], minSize: [1, 1],
  description: 'Track, artist, album, cover art and progress from Windows Media, Spotify or a pushed source.' };

const SOURCES = {
  media: (d) => { const k = (s) => get(d, `plugins.media-plugin.media.${s}`); return { track: k('current-track'), artist: k('artist'), album: k('album'), elapsed: k('elapsed-time'), remaining: k('remaining-time'), progress: num(k('track-progress')), playing: num(k('playback-state')) === 4 || num(k('playback-state')) === 2, art: k('cover-art'), app: 'Media' }; },
  spotify: (d) => { const k = (s) => get(d, `plugins.spotify-plugin.spotify.${s}`); return { track: k('current-track'), artist: k('artist'), album: k('album'), elapsed: k('elapsed-time'), remaining: k('remaining-time'), progress: num(k('track-progress')), playing: num(k('playback-state')) === 1, art: k('cover-art'), app: 'Spotify' }; },
  pushed: (d) => { const k = (s) => get(d, `spotify.${s}`); return { track: k('track'), artist: k('artist'), album: k('album'), progress: num(k('progress')), playing: k('playing') === '1', art: k('art'), app: 'Pushed' }; },
};

function Eq({ on }) {
  return <span className="flex h-3 items-end gap-[2px]">{[0, 1, 2, 3].map((i) => <span key={i} className={`w-[3px] rounded-full bg-[var(--accent)] ${on ? 'animate-pulse' : ''}`} style={{ height: on ? `${[60, 100, 45, 80][i]}%` : '25%', animationDelay: `${i * 0.18}s`, animationDuration: `${0.6 + i * 0.15}s` }} />)}</span>;
}
// Vinyl: grooved record with the cover as the centre label, spins while playing
function Vinyl({ art, playing, className = '' }) {
  return (
    <div className={`relative aspect-square shrink-0 ${className}`}>
      <div className={`absolute inset-0 rounded-full ${playing ? 'animate-spin' : ''}`} style={{ animationDuration: '3.2s', background: 'repeating-radial-gradient(circle at 50% 50%, #0b0b0d 0 1.5px, #1a1a1e 1.5px 3px)', boxShadow: '0 10px 30px -8px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.06)' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 30deg, transparent 0 20%, rgba(255,255,255,.08) 25%, transparent 32% 70%, rgba(255,255,255,.06) 75%, transparent 82%)' }} />
        <div className="absolute inset-[31%] overflow-hidden rounded-full ring-2 ring-black/60"><Img src={art} icon="album" className="h-full w-full" /></div>
        <div className="absolute left-1/2 top-1/2 h-[5%] w-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c0c0e]" />
      </div>
      <div className="absolute -right-[4%] top-[2%] h-[62%] w-[3%] origin-top rounded-full bg-gradient-to-b from-zinc-300 to-zinc-500 transition-transform duration-700" style={{ transform: `rotate(${playing ? 24 : 8}deg)` }} />
    </div>
  );
}

// props: source 'auto' | 'media' | 'spotify' | 'pushed', showArt (default true), layout 'card' | 'vinyl' | 'backdrop' | 'wave',
//        progress 'bar' | 'wave' | 'visualizer', vizMode 'bars' | 'mirror' | 'wave' | 'dots' | 'line', vizDevice (audio-level-meter container), vizRamp, showTimeline (thin progress under the visualiser, default true)
export default function NowPlaying(p) {
  const d = p.data;
  const src = p.source && p.source !== 'auto' ? p.source : (/idle/i.test(get(d, 'plugins.spotify-plugin.spotify.current-track')) ? 'media' : 'spotify');
  const m = SOURCES[src](d);
  const pct = m.progress > 1 ? m.progress : m.progress * 100;
  const art = p.showArt !== false;
  const viz = p.progress === 'visualizer';
  const A = (s) => num(get(d, `plugins.audio-level-meter.${p.vizDevice ?? 'default-audio'}.${s}`)) || 0;
  const vizEl = (h) => <MiniViz l={A('left-channel')} r={A('right-channel')} level={A('audio-level')} mode={p.vizMode ?? 'bars'} ramp={p.vizRamp ?? 'accent'} playing={m.playing} className={h} />;
  const Viz = ({ h = 'h-8' }) => ( // called as a function so the canvas keeps its state between renders
    <div className="flex flex-col gap-1">
      <MiniViz l={A('left-channel')} r={A('right-channel')} level={A('audio-level')} mode={p.vizMode ?? 'bars'} ramp={p.vizRamp ?? 'accent'} playing={m.playing} className={h} />
      {p.showTimeline !== false && <div className="h-px w-full bg-white/10"><div className="h-full bg-white/50 transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>}
      {has(m.elapsed) && <div className="flex justify-between font-mono text-[10px] text-zinc-400"><span>{m.elapsed}</span><span>-{m.remaining}</span></div>}
    </div>
  );
  return (
    <Widget {...shell(p)} title={p.title ?? 'Now playing'} icon="music_note" studio={{ label: m.app, live: m.playing, value: m.track || '—', sub: m.artist, img: art ? m.art : null, kind: 'text', progress: { a: m.elapsed, b: m.remaining, pct }, viz: viz ? vizEl : null }} compact={{ label: m.app, value: m.track || '—', sub: m.artist, kind: 'text', pct, img: art ? m.art : null, icon: 'music_note', viz: viz ? vizEl : null }} right={<Chip><span className="text-[9px]">{m.playing ? '▶' : '❚❚'}</span>{m.app}</Chip>}>
      {({ size }) => {
        const Text = ({ big }) => (
          <div className="flex min-w-0 flex-col">
            <span className={`${big} truncate font-semibold leading-tight`}>{m.track || '—'}</span>
            <span className="truncate text-xs text-zinc-400">{has(m.artist) ? m.artist : ''}{size === 'lg' && has(m.album) ? ` · ${m.album}` : ''}</span>
          </div>
        );
        const Progress = viz ? Viz({ h: size === 'lg' ? 'h-12' : size === 'md' ? 'h-9' : 'h-6' }) : (
          <div className="flex flex-col gap-1">
            <Bar value={pct} style={p.progress === 'wave' ? 'wave' : undefined} className={p.progress === 'wave' ? 'h-2.5' : 'h-1'} />
            {has(m.elapsed) && <div className="flex justify-between font-mono text-[10px] text-zinc-500"><span>{m.elapsed}</span><span>-{m.remaining}</span></div>}
          </div>
        );
        const lay = p.layout ?? 'card';
        const WaveProg = viz ? Viz({ h: size === 'lg' ? 'h-12' : 'h-9' }) : (
          <div className="flex flex-col gap-1">
            <Bar value={pct} style="wave" className="h-2.5" />
            {has(m.elapsed) && <div className="flex justify-between font-mono text-[10px] text-zinc-400"><span>{m.elapsed}</span><span>-{m.remaining}</span></div>}
          </div>
        );
        if (lay === 'backdrop' && size !== 'xs') return (
          <div className="absolute -inset-5 overflow-hidden">
            <Img src={m.art} icon="album" className="absolute inset-0 h-full w-full scale-125 opacity-70 blur-2xl" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, color-mix(in oklab, var(--accent) 35%, transparent), rgba(0,0,0,.55) 55%, rgba(0,0,0,.8))' }} />
            <div className="relative flex h-full items-end gap-4 p-5">
              <Img src={m.art} icon="album" className={`aspect-square shrink-0 rounded-xl shadow-2xl ${size === 'lg' ? 'h-[62%]' : 'h-[58%]'} max-h-[180px]`} />
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1"><div className="flex items-center gap-2"><Eq on={m.playing} /><span className="text-[10.5px] uppercase tracking-[0.1em] text-zinc-300">{m.app}</span></div><Text big={size === 'lg' ? 'text-2xl' : 'text-base'} />{WaveProg}</div>
            </div>
          </div>
        );
        if (lay === 'vinyl' && size !== 'xs') return (
          <div className="flex h-full items-center gap-4">
            <Vinyl art={m.art} playing={m.playing} className="h-full max-h-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5"><Text big={size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'} />{size !== 'sm' && WaveProg}</div>
          </div>
        );
        if (lay === 'wave' && size !== 'xs') return (
          <div className="flex h-full flex-col justify-between gap-3">
            <div className="flex items-center gap-3">{art && <Img src={m.art} icon="album" className={`aspect-square shrink-0 rounded-lg ${size === 'sm' ? 'h-11' : 'h-14'}`} />}<div className="min-w-0 flex-1"><Text big={size === 'lg' ? 'text-xl' : 'text-base'} /></div><Eq on={m.playing} /></div>
            {WaveProg}
          </div>
        );
        if (size === 'xs') return <div className="flex h-full flex-col justify-center gap-2"><Text big="text-sm" />{viz ? <MiniViz l={A('left-channel')} r={A('right-channel')} level={A('audio-level')} mode={p.vizMode ?? 'bars'} ramp={p.vizRamp ?? 'accent'} playing={m.playing} className="h-5" /> : <Bar value={pct} className="h-1" />}</div>;
        if (size === 'lg' && art) return (
          <div className="flex h-full gap-5">
            <Img src={m.art} icon="album" className="aspect-square h-full max-h-full shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col justify-end gap-3"><Text big="text-2xl" />{Progress}</div>
          </div>
        );
        return (
          <div className="flex h-full items-center gap-3">
            {art && <Img src={m.art} icon="album" className={`aspect-square shrink-0 rounded-lg ${size === 'sm' ? 'h-14' : 'h-full max-h-28'}`} />}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5"><Text big={size === 'md' ? 'text-lg' : 'text-sm'} />{Progress}</div>
          </div>
        );
      }}
    </Widget>
  );
}
