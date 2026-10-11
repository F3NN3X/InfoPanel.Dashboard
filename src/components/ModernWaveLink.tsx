import { Mic, Radio } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import { makeSurface, type ModernStyle } from "./ModernNowPlaying";
import { useElementSize } from "@/hooks/use-element-size";
import { byShape, flow, labelStyle, strokeOf, surfaceBox, ws } from "./widget-style";
import { LevelMeter, type LevelMeterVariant } from "@/components/ui/level-meter";
import { DbReadout } from "@/components/ui/db-readout";
import { DbScale } from "@/components/ui/db-scale";
import {
  meterKey,
  useWavelinkMeter,
  useWavelinkState,
  type WlChannel,
  type WlDevice,
  type WlMix,
  type WlState,
} from "@/lib/wavelink";
import type { BallisticsPreset } from "@/lib/audio/ballistics";
import type { Orientation } from "@/lib/audio/types";

/**
 * The Wave Link widget — the Elgato app's full mixer, live at device pace.
 *
 * Software channels (mixer columns with L/R AudioCN meters, fader level,
 * mute, and the mixes each channel routes into), the output devices, and
 * the app's output mixers. Meters feed the AudioCN components through
 * per-key frame emitters (no React re-renders at device pace); the
 * inventory (faders, mutes, routes) updates on 1 s change-only polls.
 *
 * The absent state is honest: the last-known inventory stays visible,
 * dimmed, with the meters decayed to the floor and a note that the app is
 * not running — a meter that freezes on a stale level is a lying meter.
 *
 * Layouts (auto-picked from the zone's measured size, like ModernAudio):
 * - `card`     — tall/portrait zones: stacked channel rows
 * - `standard` — wide zones: mixer columns side by side
 * - `compact`  — very short zones: name · fader % · bar
 * - `simple`   — small zones: the first channel only
 *
 * The standard style options apply through `ModernChrome` and the
 * `widget-style` helpers: it scales with the zone (designed for about
 * 900×420 wide, 320×480 tall), and alignment, spacing, label case, value
 * weight and meter thickness follow the user's choices.
 */

/**
 * The zone size each shape of the layout is designed for: the mixer columns
 * (meter, scale, mix chips) plus the 208 px device column need about
 * 900×420 before the chips start to overlap; stacked channel rows
 * with the device list and mixes need a 320×480 column.
 */
const DESIGN = byShape({
  wide: { w: 900, h: 420 },
  tall: { w: 320, h: 480 },
  square: { w: 720, h: 520 },
});

export type WaveLinkVariant = "card" | "standard" | "compact" | "simple";

export interface ModernWaveLinkProps {
  /** Which meter keys to show (comma-separated, "" = all). */
  source?: string;
  showReadout?: boolean;
  showFader?: boolean;
  showMixes?: boolean;
  /** Color of the "live" dots ("" = green). */
  liveColor?: string;
  /** Color of the muted markers and the "not running" dot ("" = red). */
  muteColor?: string;
  layout?: WaveLinkVariant | "auto";
  surfaceStyle?: ModernStyle;
  chrome?: ModernChromeSpec;
  meterVariant?: LevelMeterVariant;
  meterOrientation?: Orientation;
  meterBallistics?: BallisticsPreset;
  className?: string;
}

function pickVariant(
  w: number,
  h: number,
  forced: WaveLinkVariant | "auto"
): WaveLinkVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w <= 340 && h >= 180) return "card";
  return "standard";
}

const fmtFader = (level: number | null): string =>
  level === null ? "—" : `${Math.round(level * 100)}%`;

export function ModernWaveLink({
  source = "",
  showReadout = true,
  showFader = true,
  showMixes = true,
  liveColor,
  muteColor,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  meterVariant = "solid",
  meterOrientation = "vertical",
  meterBallistics = "peak",
  className,
}: ModernWaveLinkProps) {
  const { ref, w, h } = useElementSize();
  const state = useWavelinkState();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const up = state.status === "up";

  // The meter thickness and the live / mute colors reach the pieces below
  // as CSS variables (each with today's value as the fallback).
  const box: CSSProperties = {
    ...surfaceBox(sv, chrome),
    ["--wl-stroke" as string]: strokeOf(chrome, 1),
    ...(liveColor ? { ["--wl-live" as string]: liveColor } : null),
    ...(muteColor ? { ["--wl-mute" as string]: muteColor } : null),
  };
  const muted = sv.muted;

  // The setting's meter keys ("" = everything the app exposes).
  const selected = source
    ? source.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const channels = selected
    ? state.channels.filter((c) => selected.includes(meterKey.channel(c.id)))
    : state.channels;
  const devices = selected
    ? state.devices.filter((d) => selected.includes(meterKey.device(d.id)))
    : state.devices;

  const common = {
    meterVariant,
    meterOrientation,
    meterBallistics,
  };

  let body: ReactNode;
  if (v === "card") {
    body = (
      <div
        className={cn(
          "flex h-full w-full overflow-y-auto",
          !up && "opacity-60"
        )}
        style={{
          ...box,
          ...flow("column", { x: "between", y: "start" }),
          gap: ws.gap(8),
          padding: ws.pad(16),
          paddingTop: `calc(${ws.pad(16)} + 8px)`,
          borderRadius: ws.radius(20),
        }}
      >
        <StatusLine up={up} version={state.appVersion} muted={muted} />
        {channels.length === 0 && devices.length === 0 ? (
          <AbsentNote />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {channels.map((c) => (
                <CardRow
                  key={c.id}
                  channel={c}
                  state={state}
                  showReadout={showReadout}
                  showFader={showFader}
                  showMixes={showMixes}
                  {...common}
                />
              ))}
            </div>
            {devices.length > 0 && (
              <DeviceList
                devices={devices}
                muted={muted}
                showFader={showFader}
                meterVariant={meterVariant}
                meterBallistics={meterBallistics}
              />
            )}
            {showMixes && state.mixes.length > 0 && (
              <MixFooter mixes={state.mixes} muted={muted} />
            )}
          </>
        )}
      </div>
    );
  } else if (v === "standard") {
    body = (
      <div
        className={cn(
          "flex h-full w-full overflow-hidden",
          !up && "opacity-60"
        )}
        style={{
          ...box,
          ...flow("column", { x: "between", y: "start" }),
          gap: ws.gap(8),
          padding: ws.pad(16),
          paddingTop: `calc(${ws.pad(16)} + 8px)`,
          borderRadius: ws.radius(12),
        }}
      >
        <StatusLine up={up} version={state.appVersion} muted={muted} />
        {channels.length === 0 && devices.length === 0 ? (
          <AbsentNote />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 items-stretch gap-3">
              {channels.slice(0, 6).map((c) => (
                <MixColumn
                  key={c.id}
                  channel={c}
                  state={state}
                  showReadout={showReadout}
                  showFader={showFader}
                  showMixes={showMixes}
                  {...common}
                />
              ))}
              {devices.length > 0 && (
                <div className="flex w-52 shrink-0 flex-col justify-center gap-1.5 overflow-hidden">
                  <div
                    className="text-[10px] tracking-wider"
                    style={{ color: muted, ...labelStyle() }}
                  >
                    Devices
                  </div>
                  {devices.slice(0, 4).map((d) => (
                    <DeviceRow
                      key={d.id}
                      device={d}
                      meterVariant={meterVariant}
                      meterBallistics={meterBallistics}
                    />
                  ))}
                </div>
              )}
            </div>
            {showMixes && state.mixes.length > 0 && (
              <MixFooter mixes={state.mixes} muted={muted} />
            )}
          </>
        )}
      </div>
    );
  } else if (v === "compact") {
    body = (
      <div
        className={cn(
          "flex h-full w-full overflow-hidden",
          !up && "opacity-60"
        )}
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(20),
          paddingInline: ws.pad(16),
          borderRadius: ws.radius(999),
        }}
      >
        {channels.slice(0, 3).map((c) => (
          <div key={c.id} className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-semibold" title={c.name}>
              {c.name}
            </span>
            {c.isMuted && <MuteDot />}
            {showFader && (
              <span
                className="shrink-0 text-xs tabular-nums"
                style={{ fontWeight: ws.weight(700) }}
              >
                {fmtFader(c.level)}
              </span>
            )}
            <div className="w-16 shrink-0">
              <CompactMeter
                channel={c}
                meterVariant={meterVariant}
                meterBallistics={meterBallistics}
              />
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    const c = channels[0];
    body = (
      <div
        className={cn(
          "flex h-full w-full overflow-hidden",
          !up && "opacity-60"
        )}
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(12),
          padding: ws.pad(12),
          paddingTop: `calc(${ws.pad(12)} + 8px)`,
          borderRadius: ws.radius(12),
        }}
      >
        {c ? (
          <>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" title={c.name}>
                {c.name}
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: muted }}>
                {c.isMuted && <MuteDot />}
                {showFader && fmtFader(c.level)}
                {showReadout && <SimpleReadout channel={c} />}
              </div>
            </div>
            <div className="ml-auto h-14 w-10 shrink-0">
              <SimpleMeter
                channel={c}
                meterVariant={meterVariant}
                meterBallistics={meterBallistics}
              />
            </div>
          </>
        ) : (
          <AbsentNote />
        )}
      </div>
    );
  }

  return (
    <ModernChrome chrome={chrome} designSize={DESIGN} className={className}>
      <div ref={ref} className="h-full w-full">
        {body}
      </div>
    </ModernChrome>
  );
}

/* ---------------- pieces ---------------- */

function StatusLine({
  up,
  version,
  muted,
}: {
  up: boolean;
  version: string;
  muted: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            up ? "bg-[var(--wl-live,#34d399)]" : "bg-[var(--wl-mute,#f87171)]"
          )}
        />
        {up ? "Live" : "Not running"}
      </span>
      {version && (
        <span className="tabular-nums" style={{ color: muted }}>
          v{version}
        </span>
      )}
    </div>
  );
}

function AbsentNote() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center text-xs text-muted-foreground/70">
        Wave Link is not running — start the app and the meters come back on
        their own.
      </div>
    </div>
  );
}

function MuteDot() {
  return (
    <span
      className="shrink-0 text-[10px] font-semibold uppercase text-[var(--wl-mute,#f87171)]"
      title="Muted"
    >
      M
    </span>
  );
}

function MixChips({
  channel,
  state,
}: {
  channel: WlChannel;
  state: WlState;
}) {
  if (channel.mixes.length === 0) return null;
  const name = (id: string) =>
    state.mixes.find((m) => m.id === id)?.name ?? id;
  return (
    <div className="flex flex-wrap gap-1">
      {channel.mixes.map((m) => (
        <span
          key={m.id}
          className={cn(
            "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
            m.isMuted ? "border-red-400/40 text-red-300/80" : "border-border/60"
          )}
          title={m.isMuted ? `${name(m.id)} (muted)` : name(m.id)}
        >
          <span
            className={cn(
              "h-1 w-1 rounded-full",
              m.isMuted ? "bg-[var(--wl-mute,#f87171)]" : "bg-[var(--wl-live,#34d399)]"
            )}
          />
          {name(m.id)}
        </span>
      ))}
    </div>
  );
}

function MixFooter({ mixes, muted }: { mixes: WlMix[]; muted: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/40 pt-2">
      <span
        className="text-[10px] tracking-wider"
        style={{ color: muted, ...labelStyle() }}
      >
        Mixes
      </span>
      {mixes.map((mix) => (
        <span key={mix.id} className="flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              mix.isMuted ? "bg-[var(--wl-mute,#f87171)]" : "bg-[var(--wl-live,#34d399)]"
            )}
          />
          <span style={{ color: muted }}>{mix.name}</span>
          <span className="tabular-nums">{fmtFader(mix.level)}</span>
        </span>
      ))}
    </div>
  );
}

/** The mixer column (standard layout): name, L/R vertical meters, readouts, mixes. */
function MixColumn({
  channel,
  state,
  showReadout,
  showFader,
  showMixes,
  meterVariant,
  meterOrientation,
  meterBallistics,
}: {
  channel: WlChannel;
  state: WlState;
  showReadout: boolean;
  showFader: boolean;
  showMixes: boolean;
  meterVariant: LevelMeterVariant;
  meterOrientation: Orientation;
  meterBallistics: BallisticsPreset;
}) {
  const source = useWavelinkMeter(meterKey.channel(channel.id));
  return (
    <div className="flex min-w-0 flex-col gap-1" style={{ flex: ws.flex() }}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs font-semibold" title={channel.name}>
          {channel.name}
        </span>
        {channel.isMuted && <MuteDot />}
        {showFader && (
          <span
            className="ml-auto shrink-0 text-xs tabular-nums"
            style={{ fontWeight: ws.weight(700) }}
          >
            {fmtFader(channel.level)}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 items-stretch gap-1">
        {showReadout && (
          <DbScale
            orientation="vertical"
            minDb={-60}
            maxDb={0}
            className="w-4 shrink-0 self-stretch"
          />
        )}
        <LevelMeter
          source={source}
          channelCount={2}
          orientation={meterOrientation}
          variant={meterVariant}
          ballistics={meterBallistics}
          size="sm"
          className="min-w-0 flex-1"
        />
      </div>
      {showReadout ? (
        <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase opacity-60">L</span>
            <DbReadout source={source} channel={0} unit={false} />
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase opacity-60">R</span>
            <DbReadout source={source} channel={1} unit={false} />
          </span>
        </div>
      ) : null}
      {showMixes && <MixChips channel={channel} state={state} />}
    </div>
  );
}

/** A stacked row (card layout): name, horizontal meters, readouts, mixes. */
function CardRow({
  channel,
  state,
  showReadout,
  showFader,
  showMixes,
  meterVariant,
  meterOrientation,
  meterBallistics,
}: {
  channel: WlChannel;
  state: WlState;
  showReadout: boolean;
  showFader: boolean;
  showMixes: boolean;
  meterVariant: LevelMeterVariant;
  meterOrientation: Orientation;
  meterBallistics: BallisticsPreset;
}) {
  const source = useWavelinkMeter(meterKey.channel(channel.id));
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate text-sm font-semibold" title={channel.name}>
            {channel.name}
          </span>
          {channel.isMuted && <MuteDot />}
          {showFader && (
            <span className="text-[11px] tabular-nums opacity-70">
              {fmtFader(channel.level)}
            </span>
          )}
        </div>
        {showReadout && (
          <div className="flex shrink-0 items-center gap-2 text-[11px] tabular-nums opacity-80">
            <DbReadout source={source} channel={0} unit={false} />
            <DbReadout source={source} channel={1} unit={false} />
          </div>
        )}
      </div>
      <div className="mt-1.5">
        <LevelMeter
          source={source}
          channelCount={2}
          orientation={meterOrientation}
          variant={meterVariant}
          ballistics={meterBallistics}
          size="sm"
          className="h-[calc(0.625rem*var(--wl-stroke,1))]"
        />
      </div>
      {showMixes && (
        <div className="mt-1.5">
          <MixChips channel={channel} state={state} />
        </div>
      )}
    </div>
  );
}

/** The devices list (card layout): one row per output device. */
function DeviceList({
  devices,
  muted,
  showFader,
  meterVariant,
  meterBallistics,
}: {
  devices: WlDevice[];
  muted: string;
  showFader: boolean;
  meterVariant: LevelMeterVariant;
  meterBallistics: BallisticsPreset;
}) {
  return (
    <div>
      <div
        className="mb-1.5 text-[10px] tracking-wider"
        style={{ color: muted, ...labelStyle() }}
      >
        Output devices
      </div>
      <div className="flex flex-col gap-1.5">
        {devices.map((d) => (
          <DeviceRow
            key={d.id}
            device={d}
            showFader={showFader}
            meterVariant={meterVariant}
            meterBallistics={meterBallistics}
          />
        ))}
      </div>
    </div>
  );
}

/** One output device row: name, mute state, L/R meters, fader. */
function DeviceRow({
  device,
  showFader = true,
  meterVariant,
  meterBallistics,
}: {
  device: WlDevice;
  showFader?: boolean;
  meterVariant: LevelMeterVariant;
  meterBallistics: BallisticsPreset;
}) {
  const source = useWavelinkMeter(meterKey.device(device.id));
  const inputsMuted = device.inputs.filter((i) => i.isMuted).length;
  const gain = device.inputs
    .map((i) => i.gain?.value)
    .find((v) => v !== undefined && v !== null);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Mic className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="min-w-0 truncate text-xs font-semibold" title={device.name}>
        {device.name}
      </span>
      {inputsMuted > 0 && <MuteDot />}
      <div className="min-w-0 flex-1">
        <LevelMeter
          source={source}
          channelCount={2}
          orientation="horizontal"
          variant={meterVariant}
          ballistics={meterBallistics}
          size="sm"
          className="h-[calc(0.5rem*var(--wl-stroke,1))]"
        />
      </div>
      {showFader && gain !== undefined && (
        <span className="shrink-0 text-[11px] tabular-nums opacity-70">
          {Math.round(gain * 100)}%
        </span>
      )}
    </div>
  );
}

/** Compact pill meter (short zones). */
function CompactMeter({
  channel,
  meterVariant,
  meterBallistics,
}: {
  channel: WlChannel;
  meterVariant: LevelMeterVariant;
  meterBallistics: BallisticsPreset;
}) {
  const source = useWavelinkMeter(meterKey.channel(channel.id));
  return (
    <LevelMeter
      source={source}
      channelCount={2}
      orientation="horizontal"
      variant={meterVariant}
      ballistics={meterBallistics}
      size="sm"
      className="h-[calc(0.375rem*var(--wl-stroke,1))]"
    />
  );
}

/** Simple-layout pieces: one channel only. */
function SimpleMeter({
  channel,
  meterVariant,
  meterBallistics,
}: {
  channel: WlChannel;
  meterVariant: LevelMeterVariant;
  meterBallistics: BallisticsPreset;
}) {
  const source = useWavelinkMeter(meterKey.channel(channel.id));
  return (
    <LevelMeter
      source={source}
      channelCount={2}
      orientation="vertical"
      variant={meterVariant}
      ballistics={meterBallistics}
      size="sm"
      className="h-full"
    />
  );
}

function SimpleReadout({ channel }: { channel: WlChannel }) {
  const source = useWavelinkMeter(meterKey.channel(channel.id));
  return <DbReadout source={source} channel="max" unit={false} />;
}
