import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";
import { LevelMeter, type LevelMeterVariant } from "@/components/ui/level-meter";
import { DbReadout } from "@/components/ui/db-readout";
import type { BallisticsPreset } from "@/lib/audio/ballistics";
import type { Orientation } from "@/lib/audio/types";

/**
 * Modern audio widget.
 *
 * Per-device level metering (the AudioLevelMeter plugin's containers):
 * name, big level %, a level bar (red when hot), and the peak / L/R /
 * volume details. One component, four layouts picked from the zone's
 * measured size:
 *
 * - `card`     — tall/portrait zones: stacked device rows
 * - `standard` — wide zones: device blocks side by side
 * - `compact`  — very short zones: one pill (device · % · bar)
 * - `simple`   — small zones: device + %
 */

export type AudioVariant = "card" | "standard" | "compact" | "simple";

export interface ModernAudioDevice {
  name: string;
  level?: number;
  peak?: number;
  rms?: number;
  left?: number;
  right?: number;
  volume?: number;
  muted?: string;
}

export interface ModernAudioProps {
  devices: ModernAudioDevice[];
  showDetails?: boolean;
  /** Show the device name header line. */
  showDevice?: boolean;
  /** Show the device volume as a bar (the "volume" view). */
  showVolume?: boolean;
  /** Show a "muted" chip when the device is muted. */
  showMute?: boolean;
  layout?: AudioVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  /**
   * Which level-meter rendering: the built-in bar, or the audiocn
   * LevelMeter (real dBFS metering with ballistics + a dB readout).
   */
  meterView?: "classic" | "audiocn";
  meterVariant?: LevelMeterVariant;
  meterOrientation?: Orientation;
  meterBallistics?: BallisticsPreset;
  className?: string;
}

function pickVariant(
  w: number,
  h: number,
  forced: AudioVariant | "auto"
): AudioVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function barColor(level: number): string {
  return level > 85 ? "#f87171" : "var(--wp-accent, #34d399)";
}

function detail(d: ModernAudioDevice): string {
  const bits: string[] = [];
  if (d.peak !== undefined && d.peak !== 0) bits.push(`peak ${d.peak.toFixed(1)}dB`);
  else if (d.rms !== undefined && d.rms !== 0) bits.push(`rms ${d.rms.toFixed(1)}dB`);
  if (d.left !== undefined) bits.push(`L ${Math.round(d.left)}`);
  if (d.right !== undefined) bits.push(`R ${Math.round(d.right)}`);
  if (d.volume !== undefined)
    bits.push(`vol ${Math.round(d.volume)}%${d.muted === "True" ? " muted" : ""}`);
  return bits.length > 0 ? bits.join(" · ") : "silent";
}

function LevelBar({ level, height = 6 }: { level: number; height?: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: "rgba(128,128,140,0.22)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.round(clamp01(level) * 100)}%`,
          background: barColor(level),
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

/** The device volume as a bar + % (the "volume control" look). */
function VolumeBar({ volume, height = 6 }: { volume: number; height?: number }) {
  return (
    <div className="flex w-full items-center gap-2">
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{ height, background: "rgba(128,128,140,0.22)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(clamp01(volume / 100) * 100)}%`,
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums">
        {Math.round(volume)}%
      </span>
    </div>
  );
}

function MuteChip() {
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider"
      style={{ background: "rgba(248,113,113,0.2)", color: "#f87171" }}
    >
      muted
    </span>
  );
}

/**
 * audiocn LevelMeter + dB readout for one device, fed by the plugin's real
 * dBFS values (peak / RMS). Horizontal: meter fills the width, readout sits
 * at the right edge. Vertical: the meter is a column with the readout below.
 */
function AudiocnMeter({
  device,
  variant = "solid",
  orientation = "horizontal",
  ballistics = "peak",
  size = "default",
  readout = true,
  inline = false,
}: {
  device: ModernAudioDevice;
  variant?: LevelMeterVariant;
  orientation?: Orientation;
  ballistics?: BallisticsPreset;
  size?: "sm" | "default" | "lg";
  /** Show the dB readout next to (or below) the meter. */
  readout?: boolean;
  /**
   * Keep a vertical meter on one line (short h-10 meter + readout beside it)
   * for stacked-row (card) layouts, where a full column per device would
   * overflow with many devices.
   */
  inline?: boolean;
}) {
  const horizontal = orientation === "horizontal";
  return (
    <div
      className={cn(
        "flex min-w-0 gap-2",
        horizontal || inline
          ? "flex-1 items-center"
          : "flex-col items-center"
      )}
    >
      <LevelMeter
        peakDb={device.peak}
        rmsDb={device.rms}
        variant={variant}
        orientation={orientation}
        ballistics={ballistics}
        size={size}
        minDb={-60}
        maxDb={0}
        className={
          horizontal
            ? "min-w-0 flex-1"
            : inline
              ? "h-10 shrink-0 [--meter-thickness:0.375rem]"
              : "h-14 shrink-0 [--meter-thickness:0.5rem]"
        }
      />
      {readout && (
        <DbReadout
          value={device.peak ?? -96}
          measure="peak"
          decimals={1}
          className={cn(
            "shrink-0 text-[10px] tabular-nums",
            horizontal || inline ? "w-14 text-right" : "w-full text-center"
          )}
        />
      )}
    </div>
  );
}

export function ModernAudio({
  devices,
  showDetails = true,
  showDevice = true,
  showVolume = false,
  showMute = true,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  meterView = "classic",
  meterVariant = "solid",
  meterOrientation = "horizontal",
  meterBallistics = "peak",
  className,
}: ModernAudioProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);

  const meter = (
    d: ModernAudioDevice,
    size?: "sm" | "default" | "lg",
    readout = true,
    inline = false
  ) =>
    meterView === "audiocn" ? (
      <AudiocnMeter
        device={d}
        variant={meterVariant}
        orientation={meterOrientation}
        ballistics={meterBallistics}
        size={size ?? "default"}
        readout={readout}
        inline={inline}
      />
    ) : null;

  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;
  const muted = sv.muted;
  const shown = devices.slice(0, v === "compact" ? 2 : v === "simple" ? 1 : 6);

  let body: React.ReactNode;
  if (v === "card") {
    body = (
      <div
        className="flex h-full w-full flex-col justify-center gap-3 overflow-y-auto rounded-[20px] p-4"
        style={box}
      >
        {shown.map((d) => (
          <div key={d.name} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Volume2
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: muted }}
                />
                {showDevice && (
                  <span className="truncate text-sm font-semibold" title={d.name}>
                    {d.name}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums">
                {d.level !== undefined ? `${Math.round(d.level)}%` : "—"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center">
              {meter(d, "default", true, true) ?? <LevelBar level={d.level ?? 0} />}
            </div>
            {(showVolume && d.volume !== undefined) || (showMute && d.muted === "True") ? (
              <div className="mt-1.5 flex items-center gap-2">
                {showVolume && d.volume !== undefined && (
                  <div className="flex-1">
                    <VolumeBar volume={d.volume} />
                  </div>
                )}
                {showMute && d.muted === "True" && <MuteChip />}
              </div>
            ) : null}
            {showDetails && (
              <div className="mt-1 truncate text-[11px]" style={{ color: muted }} title={detail(d)}>
                {detail(d)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (v === "standard") {
    body = (
      <div
        className="flex h-full w-full items-stretch gap-4 overflow-hidden rounded-xl p-4"
        style={box}
      >
        {shown.map((d) => (
          <div key={d.name} className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 shrink-0" style={{ color: muted }} />
              {showDevice && (
                <span className="truncate text-sm font-semibold" title={d.name}>
                  {d.name}
                </span>
              )}
              <span className="ml-auto shrink-0 text-base font-bold tabular-nums">
                {d.level !== undefined ? `${Math.round(d.level)}%` : "—"}
              </span>
            </div>
            {meter(d) ?? <LevelBar level={d.level ?? 0} height={5} />}
            {(showVolume && d.volume !== undefined) || (showMute && d.muted === "True") ? (
              <div className="flex items-center gap-2">
                {showVolume && d.volume !== undefined && (
                  <div className="flex-1">
                    <VolumeBar volume={d.volume} height={5} />
                  </div>
                )}
                {showMute && d.muted === "True" && <MuteChip />}
              </div>
            ) : null}
            {showDetails && (
              <div className="truncate text-[11px]" style={{ color: muted }} title={detail(d)}>
                {detail(d)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  } else if (v === "compact") {
    body = (
      <div
        className="flex h-full w-full items-center gap-5 overflow-hidden rounded-full px-4"
        style={box}
      >
        {shown.map((d) => (
          <div key={d.name} className="flex min-w-0 items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 shrink-0" style={{ color: muted }} />
            <span className="truncate text-xs font-semibold" title={d.name}>
              {d.name}
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums">
              {d.level !== undefined ? `${Math.round(d.level)}%` : "—"}
            </span>
            <div className="w-16 shrink-0">
              {meter(d, "sm", false) ?? <LevelBar level={d.level ?? 0} height={4} />}
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    const d = shown[0];
    body = (
      <div
        className="flex h-full w-full items-center gap-3 overflow-hidden rounded-xl p-3"
        style={box}
      >
        <Volume2 className="h-4 w-4 shrink-0" style={{ color: muted }} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" title={d?.name}>
            {d?.name ?? "Audio"}
          </div>
          <div className="text-xs" style={{ color: muted }}>
            {d?.level !== undefined ? `${Math.round(d.level)}%` : "—"}
          </div>
        </div>
        {d && (
          <div className="ml-auto w-24 shrink-0">
            <LevelBar level={d.level ?? 0} height={5} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
