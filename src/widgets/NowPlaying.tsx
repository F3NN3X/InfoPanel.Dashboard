import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, num, has, Img, Chip, MediaProgress, type MediaProgressMode, type ShellProps, type WidgetMeta, type Data } from "./kit";
import { widgetImage } from "./data-adapter";

export const meta: WidgetMeta = {
  id: "NowPlaying",
  name: "Now Playing",
  category: "Media",
  icon: "music_note",
  prefixes: ["plugins.media-plugin.", "plugins.spotify-plugin.", "spotify."],
  defaultSize: [3, 1],
  minSize: [1, 1],
  description: "Track, artist, album, cover art and progress from Windows Media, Spotify or a pushed source.",
};

interface Track {
  track: string;
  artist: string;
  album: string;
  elapsed?: string;
  remaining?: string;
  progress: number;
  playing: boolean;
  art: string;
  app: string;
}

const SOURCES: Record<string, (d: Data) => Track> = {
  media: (d) => {
    const k = (s: string) => get(d, `plugins.media-plugin.media.${s}`);
    const state = num(k("playback-state"));
    return { track: k("current-track"), artist: k("artist"), album: k("album"), elapsed: k("elapsed-time"), remaining: k("remaining-time"), progress: num(k("track-progress")), playing: state === 4 || state === 2, art: k("cover-art"), app: "Media" };
  },
  spotify: (d) => {
    const k = (s: string) => get(d, `plugins.spotify-plugin.spotify.${s}`);
    return { track: k("current-track"), artist: k("artist"), album: k("album"), elapsed: k("elapsed-time"), remaining: k("remaining-time"), progress: num(k("track-progress")), playing: num(k("playback-state")) === 1, art: k("cover-art"), app: "Spotify" };
  },
  pushed: (d) => {
    const k = (s: string) => get(d, `spotify.${s}`);
    return { track: k("track"), artist: k("artist"), album: k("album"), progress: num(k("progress")), playing: k("playing") === "1", art: k("art"), app: "Pushed" };
  },
};

function Eq({ on }: { on: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`w-[3px] rounded-full bg-[var(--accent)] ${on ? "animate-pulse" : ""}`} style={{ height: on ? `${[60, 100, 45, 80][i]}%` : "25%", animationDelay: `${i * 0.18}s`, animationDuration: `${0.6 + i * 0.15}s` }} />
      ))}
    </span>
  );
}
// Vinyl: grooved record with the cover as the centre label, spins while playing
function Vinyl({ art, playing, className = "" }: { art?: string; playing: boolean; className?: string }) {
  return (
    <div className={`relative aspect-square shrink-0 ${className}`}>
      <div className={`absolute inset-0 rounded-full ${playing ? "animate-spin" : ""}`} style={{ animationDuration: "3.2s", background: "repeating-radial-gradient(circle at 50% 50%, #0b0b0d 0 1.5px, #1a1a1e 1.5px 3px)", boxShadow: "0 10px 30px -8px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.06)" }}>
        <div className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 30deg, transparent 0 20%, rgba(255,255,255,.08) 25%, transparent 32% 70%, rgba(255,255,255,.06) 75%, transparent 82%)" }} />
        <div className="absolute inset-[31%] overflow-hidden rounded-full ring-2 ring-black/60">
          <Img src={art} icon="album" className="h-full w-full" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-[5%] w-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c0c0e]" />
      </div>
      <div className="absolute -right-[4%] top-[2%] h-[62%] w-[3%] origin-top rounded-full bg-gradient-to-b from-zinc-300 to-zinc-500 transition-transform duration-700" style={{ transform: `rotate(${playing ? 24 : 8}deg)` }} />
    </div>
  );
}

export interface NowPlayingProps extends ShellProps {
  look?: ModuleSettings;
  source?: "auto" | "media" | "spotify" | "pushed";
  showArt?: boolean;
  layout?: "card" | "vinyl" | "backdrop" | "wave";
  progress?: "bar" | "wave" | "visualizer";
  vizMode?: "bars" | "mirror" | "wave" | "dots" | "line";
  /** audio-level-meter container */
  vizDevice?: string;
  vizRamp?: string;
  /** thin progress under the visualiser, default true */
  showTimeline?: boolean;
}

export default function NowPlaying(p: NowPlayingProps) {
  const d = p.data;
  const src = p.source && p.source !== "auto" ? p.source : /idle/i.test(get(d, "plugins.spotify-plugin.spotify.current-track")) ? "media" : "spotify";
  const m = (SOURCES[src] ?? SOURCES.media)(d);
  const pct = m.progress > 1 ? m.progress : m.progress * 100;
  const cover = widgetImage(m.art);
  const art = p.showArt !== false;
  const viz = p.progress === "visualizer";
  const A = (s: string) => num(get(d, `plugins.audio-level-meter.${p.vizDevice ?? "default-audio"}.${s}`)) || 0;
  const media = (mode: MediaProgressMode, h = "", barClassName?: string) => (
    <MediaProgress mode={mode} pct={pct} l={A("left-channel")} r={A("right-channel")} level={A("audio-level")} vizMode={p.vizMode} ramp={p.vizRamp} playing={m.playing} className={h} barClassName={barClassName} />
  );
  const miniViz = (h: string) => media("visualizer", h);
  // called as functions (not components) so the canvas keeps its state between renders
  const times = (cls: string) =>
    has(m.elapsed) && (
      <div className={`flex justify-between font-mono text-[10px] ${cls}`}>
        <span>{m.elapsed}</span>
        <span>-{m.remaining}</span>
      </div>
    );
  const vizBlock = (h: string, onImage = false) => (
    <div className="flex flex-col gap-1">
      {miniViz(h)}
      {p.showTimeline !== false && (
        <div className={`h-px w-full ${onImage ? "bg-white/10" : "bg-[color:var(--w-track)]"}`}>
          <div className={`h-full transition-[width] duration-500 ${onImage ? "bg-white/50" : "bg-[color:var(--w-muted)]"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {times(onImage ? "text-zinc-300" : "text-[color:var(--w-muted)]")}
    </div>
  );
  const waveBlock = (h: string, onImage = false) =>
    viz ? (
      vizBlock(h, onImage)
    ) : (
      <div className="flex flex-col gap-1">
        {media("wave")}
        {times(onImage ? "text-zinc-300" : "text-[color:var(--w-muted)]")}
      </div>
    );
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Now playing"}
      icon="music_note"
      studio={{ label: m.app, live: m.playing, value: m.track || "—", sub: m.artist, img: art ? cover : undefined, kind: "text", progress: { a: m.elapsed, b: m.remaining, pct }, viz: viz ? miniViz : undefined }}
      compact={{ label: m.app, value: m.track || "—", sub: m.artist, kind: "text", pct, img: art ? cover : undefined, icon: "music_note", viz: viz ? miniViz : undefined }}
      right={
        <Chip>
          <span className="text-[9px]">{m.playing ? "▶" : "❚❚"}</span>
          {m.app}
        </Chip>
      }
    >
      {({ size }) => {
        const text = (big: string, onImage = false) => (
          <div className="flex min-w-0 flex-col">
            <span className={`${big} truncate font-semibold leading-tight ${onImage ? "text-white" : ""}`}>{m.track || "—"}</span>
            <span className={`truncate text-xs ${onImage ? "text-zinc-300" : "text-[color:var(--w-muted)]"}`}>
              {has(m.artist) ? m.artist : ""}
              {size === "lg" && has(m.album) ? ` · ${m.album}` : ""}
            </span>
          </div>
        );
        const progress = viz ? (
          vizBlock(size === "lg" ? "h-12" : size === "md" ? "h-9" : "h-6")
        ) : (
          <div className="flex flex-col gap-1">
            {media(p.progress === "wave" ? "wave" : "bar")}
            {times("text-[color:var(--w-faint)]")}
          </div>
        );
        const lay = p.layout ?? "card";
        if (lay === "backdrop" && size !== "xs")
          return (
            <div className="absolute -inset-5 overflow-hidden">
              <Img src={cover} icon="album" className="absolute inset-0 h-full w-full scale-125 opacity-70 blur-2xl" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, color-mix(in oklab, var(--accent) 35%, transparent), rgba(0,0,0,.55) 55%, rgba(0,0,0,.8))" }} />
              <div className="relative flex h-full items-end gap-4 p-5">
                <Img src={cover} icon="album" className={`aspect-square shrink-0 rounded-xl shadow-2xl ${size === "lg" ? "h-[62%]" : "h-[58%]"} max-h-[180px]`} />
                <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1">
                  <div className="flex items-center gap-2">
                    <Eq on={m.playing} />
                    <span className="text-[10.5px] uppercase tracking-[0.1em] text-zinc-300">{m.app}</span>
                  </div>
                  {text(size === "lg" ? "text-2xl" : "text-base", true)}
                  {waveBlock(size === "lg" ? "h-12" : "h-9", true)}
                </div>
              </div>
            </div>
          );
        if (lay === "vinyl" && size !== "xs")
          return (
            <div className="flex h-full items-center gap-4">
              <Vinyl art={cover} playing={m.playing} className="h-full max-h-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                {text(size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-sm")}
                {size !== "sm" && waveBlock(size === "lg" ? "h-12" : "h-9")}
              </div>
            </div>
          );
        if (lay === "wave" && size !== "xs")
          return (
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="flex items-center gap-3">
                {art && <Img src={cover} icon="album" className={`aspect-square shrink-0 rounded-lg ${size === "sm" ? "h-11" : "h-14"}`} />}
                <div className="min-w-0 flex-1">{text(size === "lg" ? "text-xl" : "text-base")}</div>
                <Eq on={m.playing} />
              </div>
              {waveBlock(size === "lg" ? "h-12" : "h-9")}
            </div>
          );
        if (size === "xs")
          return (
            <div className="flex h-full flex-col justify-center gap-2">
              {text("text-sm")}
              {media(viz ? "visualizer" : "bar", "h-5")}
            </div>
          );
        if (size === "lg" && art)
          return (
            <div className="flex h-full gap-5">
              <Img src={cover} icon="album" className="aspect-square h-full max-h-full shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col justify-end gap-3">
                {text("text-2xl")}
                {progress}
              </div>
            </div>
          );
        return (
          <div className="flex h-full items-center gap-3">
            {art && <Img src={cover} icon="album" className={`aspect-square shrink-0 rounded-lg ${size === "sm" ? "h-14" : "h-full max-h-28"}`} />}
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {text(size === "md" ? "text-lg" : "text-sm")}
              {progress}
            </div>
          </div>
        );
      }}
    </Widget>
  );
}
