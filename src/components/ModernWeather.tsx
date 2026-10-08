import { Droplets, Gauge, Wind as WindIcon, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
  type RGB,
  type Surface,
} from "./ModernNowPlaying";

/**
 * Modern weather widget.
 *
 * Renders one of four layouts, picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: location + condition header, big
 *                temperature with icon centered, stats row, forecast strip
 * - `standard` — wide zones: current weather on the left, a horizontal
 *                day-forecast strip on the right
 * - `compact`  — very short zones: single pill (icon · temp · condition ·
 *                key stats)
 * - `simple`   — small zones: icon + temp + condition
 *
 * The surface tints from the *current condition* (sun → amber, rain → blue,
 * snow → icy…) in the same glass / matte light / matte dark finishes as the
 * modern now-playing widget.
 */

export type WeatherVariant = "card" | "standard" | "compact" | "simple";

export interface WeatherForecastDay {
  date: string;
  desc?: string;
  high?: number;
  low?: number;
  /** mm */
  precip?: number;
  wind?: string;
}

export interface ModernWeatherProps {
  location?: string;
  temp?: number;
  feelsLike?: number;
  desc?: string;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windGust?: number;
  windDir?: string;
  rain?: number;
  snow?: number;
  refreshed?: string;
  /** Emoji glyph; falls back to a condition-matched glyph. */
  icon?: string;
  forecast?: WeatherForecastDay[];
  /** Forced layout; "auto" adapts to the zone size. */
  layout?: WeatherVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Tint the surface from the current condition. */
  tint?: boolean;
  showStats?: boolean;
  showForecast?: boolean;
  /** Show the "feels like" line. */
  showFeels?: boolean;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

/** Condition → glyph + tint color (the "fancy" part). */
export function conditionMeta(desc?: string): { emoji: string; tint: RGB | null } {
  const d = (desc ?? "").toLowerCase();
  if (/(thunder|storm)/.test(d)) return { emoji: "⛈️", tint: [138, 96, 194] };
  if (/snow/.test(d)) return { emoji: "❄️", tint: [148, 196, 236] };
  if (/drizzle/.test(d)) return { emoji: "🌦️", tint: [96, 148, 216] };
  if (/(rain|shower|shauer|regn)/.test(d)) return { emoji: "🌧️", tint: [72, 128, 208] };
  if (/(fog|mist|haze)/.test(d)) return { emoji: "🌫️", tint: [150, 152, 164] };
  if (/(clear|sunny|sol|sun)/.test(d)) return { emoji: "☀️", tint: [248, 176, 58] };
  if (/cloud/.test(d)) return { emoji: "☁️", tint: [128, 148, 180] };
  return { emoji: "🌡️", tint: null };
}

function pickVariant(w: number, h: number, forced: WeatherVariant | "auto"): WeatherVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));

/** "Thu 8 Oct" → "Thu 8" for the forecast cells. */
function shortDay(date: string): string {
  const m = date.match(/^(\w{3})\s+(\d{1,2})/);
  return m ? `${m[1]} ${m[2]}` : date.slice(0, 6);
}

function ForecastStrip({ days, sv }: { days: WeatherForecastDay[]; sv: Surface }) {
  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto">
      {days.map((d) => (
        <div
          key={d.date}
          className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5"
          style={{ background: sv.track }}
        >
          <span className="text-[10px] font-medium leading-none" style={{ color: sv.muted }}>
            {shortDay(d.date)}
          </span>
          <span className="text-base leading-none">{conditionMeta(d.desc).emoji}</span>
          <span className="text-[11px] font-bold leading-none">
            {d.high !== undefined ? `${Math.round(d.high)}°` : "—"}
          </span>
          <span className="text-[9px] leading-none tabular-nums" style={{ color: sv.muted }}>
            {d.low !== undefined ? `${Math.round(d.low)}°` : ""}
            {d.precip !== undefined && d.precip > 0 ? ` · ${d.precip}mm` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  hint,
  sv,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hint?: string;
  sv: Surface;
}) {
  return (
    <div
      className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2"
      style={{ background: sv.track }}
    >
      <div className="flex items-center gap-1 text-[10px]" style={{ color: sv.muted }}>
        {icon} {label}
      </div>
      <div className="truncate text-sm font-semibold">{value ?? "—"}</div>
      {hint && (
        <div className="truncate text-[9px]" style={{ color: sv.muted }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function ModernWeather({
  location,
  temp,
  feelsLike,
  desc,
  humidity,
  pressure,
  windSpeed,
  windGust,
  windDir,
  rain,
  snow,
  refreshed,
  icon,
  forecast = [],
  layout = "auto",
  surfaceStyle = "glass",
  tint = true,
  showStats = true,
  showForecast = true,
  showFeels = true,
  chrome,
  className,
}: ModernWeatherProps) {
  const { ref, w, h } = useElementSize();
  const meta = conditionMeta(desc);
  const glyph = icon || meta.emoji;
  const sv = makeSurface(surfaceStyle, tint ? meta.tint : null);
  /** Accent color (standard option) tints the big temperature. */
  const accent = chrome?.accent || undefined;
  const v = pickVariant(w, h, layout);
  const tempLabel = temp !== undefined ? `${Math.round(temp)}°` : "—";
  const windLabel =
    windSpeed !== undefined
      ? `${windSpeed.toFixed(1)} m/s${windDir ? ` ${windDir}` : ""}`
      : undefined;
  const precipLabel =
    [
      rain !== undefined && rain > 0 && `Rain ${rain.toFixed(1)}`,
      snow !== undefined && snow > 0 && `Snow ${snow.toFixed(0)}`,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  const stats: { icon: React.ReactNode; label: string; value?: string; hint?: string }[] = [];
  if (windLabel)
    stats.push({
      icon: <WindIcon className="h-3 w-3" />,
      label: "Wind",
      value: windLabel,
      hint: windGust !== undefined ? `Gust ${windGust.toFixed(1)} m/s` : undefined,
    });
  if (humidity !== undefined)
    stats.push({ icon: <Droplets className="h-3 w-3" />, label: "Humidity", value: `${Math.round(humidity)}%` });
  if (pressure !== undefined)
    stats.push({ icon: <Gauge className="h-3 w-3" />, label: "Pressure", value: `${Math.round(pressure)} hPa` });
  if (precipLabel)
    stats.push({ icon: <CloudRain className="h-3 w-3" />, label: "Precip", value: precipLabel });

  const boxStyle = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  let body: React.ReactNode;
  if (v === "card") {
    const tempSize = clamp(32, h * 0.16, 72);
    body = (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] p-4" style={boxStyle}>
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div
            className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: sv.muted }}
          >
            {location ?? "Weather"}
          </div>
          <div className="min-w-0 truncate text-xs" style={{ color: sv.muted }}>
            {desc}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center gap-5">
          <div style={{ fontSize: Math.round(tempSize * 0.75), lineHeight: 1 }}>{glyph}</div>
          <div>
            <div
              className="font-bold leading-none tracking-tighter"
              style={{ fontSize: tempSize, ...(accent ? { color: accent } : {}) }}
            >
              {temp !== undefined ? Math.round(temp) : "—"}
              <span style={{ fontSize: tempSize * 0.4 }}>°</span>
            </div>
            {showFeels && feelsLike !== undefined && (
              <div className="mt-1 text-xs" style={{ color: sv.muted }}>
                Feels like {Math.round(feelsLike)}°
              </div>
            )}
          </div>
        </div>
        {showStats && stats.length > 0 && (
          <div
            className="grid shrink-0 gap-2"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
          >
            {stats.map((s) => (
              <StatCell key={s.label} icon={s.icon} label={s.label} value={s.value} hint={s.hint} sv={sv} />
            ))}
          </div>
        )}
        {showForecast && forecast.length > 0 && (
          <div className="mt-2 shrink-0">
            <ForecastStrip days={forecast} sv={sv} />
          </div>
        )}
        {refreshed && (
          <div className="mt-2 shrink-0 text-[10px]" style={{ color: sv.muted }}>
            Updated {refreshed}
          </div>
        )}
      </div>
    );
  } else if (v === "compact") {
    const right = [
      windSpeed !== undefined ? `${windSpeed.toFixed(0)} m/s${windDir ? ` ${windDir}` : ""}` : "",
      rain !== undefined || snow !== undefined ? precipLabel : "",
    ]
      .filter(Boolean)
      .join(" · ");
    body = (
      <div
        className="relative flex h-full w-full items-center gap-3 overflow-hidden rounded-full px-4"
        style={boxStyle}
      >
        <span style={{ fontSize: clamp(16, h * 0.5, 32), lineHeight: 1 }}>{glyph}</span>
        <span className="text-sm font-bold">{tempLabel}</span>
        <span className="min-w-0 truncate text-sm" style={{ color: sv.muted }}>
          {desc}
        </span>
        {right && (
          <span className="ml-auto shrink-0 text-xs tabular-nums" style={{ color: sv.muted }}>
            {right}
          </span>
        )}
      </div>
    );
  } else if (v === "simple") {
    body = (
      <div
        className="flex h-full w-full items-center gap-3 overflow-hidden rounded-xl p-3"
        style={boxStyle}
      >
        <span style={{ fontSize: clamp(28, h * 0.45, 48), lineHeight: 1 }}>{glyph}</span>
        <div className="min-w-0">
          <div className="text-lg font-bold leading-none">{tempLabel}</div>
          <div className="truncate text-xs" style={{ color: sv.muted }}>
            {desc}
          </div>
        </div>
      </div>
    );
  } else {
    // standard
    const tempSize = clamp(28, h * 0.42, 52);
    body = (
      <div
        className="flex h-full w-full items-center gap-6 overflow-hidden rounded-xl p-5"
        style={boxStyle}
      >
        <div className="flex shrink-0 items-center gap-4">
          <span style={{ fontSize: Math.round(tempSize * 0.8), lineHeight: 1 }}>{glyph}</span>
          <div className="min-w-0">
            <div
              className="font-bold leading-none tracking-tighter"
              style={{ fontSize: tempSize, ...(accent ? { color: accent } : {}) }}
            >
              {tempLabel}
            </div>
            <div className="mt-1 text-sm" style={{ color: sv.muted }}>
              {desc}
            </div>
            {showFeels && feelsLike !== undefined && (
              <div className="mt-0.5 text-xs" style={{ color: sv.muted }}>
                Feels like {Math.round(feelsLike)}°
              </div>
            )}
          </div>
        </div>
        {showForecast && forecast.length > 0 ? (
          <div className="min-w-0 flex-1">
            <ForecastStrip days={forecast} sv={sv} />
          </div>
        ) : showStats && stats.length > 0 ? (
          <div
            className="min-w-0 flex-1 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
          >
            {stats.map((s) => (
              <StatCell key={s.label} icon={s.icon} label={s.label} value={s.value} hint={s.hint} sv={sv} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
