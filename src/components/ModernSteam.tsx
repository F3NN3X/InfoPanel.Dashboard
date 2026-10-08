import { Gamepad2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  makeSurface,
  useArtTint,
  useElementSize,
  type ModernStyle,
  type Surface,
} from "./ModernNowPlaying";

/**
 * Modern Steam widget.
 *
 * One component, four layouts picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: profile header, game banner with the
 *                title overlaid, stats row, optional news line
 * - `standard` — wide zones: profile on the left, banner art in the middle,
 *                stats on the right
 * - `compact`  — very short zones: one pill (avatar · name · in game · key
 *                stats)
 * - `simple`   — small zones: avatar + name + status
 *
 * The surface tints from the game banner's dominant color (same art-tint
 * sampling as the modern now-playing widget; cross-origin Steam CDN art
 * degrades to an untinted surface) in the glass / matte light / matte dark
 * finishes.
 */

export type SteamVariant = "card" | "standard" | "compact" | "simple";

export interface ModernSteamProps {
  name?: string;
  status?: string;
  level?: number;
  avatarUrl?: string;
  /** Currently playing game. */
  game?: string;
  /** Hours owned of the current game. */
  playtimeHours?: number;
  /** Formatted session time ("1h 23m"). */
  sessionTime?: string;
  /** Game banner or logo. */
  artUrl?: string;
  totalGames?: number;
  totalHours?: number;
  mostPlayed?: string;
  achPct?: number;
  latestAch?: string;
  friendsOnline?: number;
  totalFriends?: number;
  news?: string;
  /** Forced layout; "auto" adapts to the zone size. */
  layout?: SteamVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Tint the surface from the game art. */
  tint?: boolean;
  showStats?: boolean;
  showNews?: boolean;
  className?: string;
}

function pickVariant(w: number, h: number, forced: SteamVariant | "auto"): SteamVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));

function Avatar({
  url,
  size,
  sv,
}: {
  url?: string;
  size: number;
  sv: Surface;
}) {
  return url ? (
    <img
      src={url}
      alt=""
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: sv.track,
        color: sv.muted,
      }}
    >
      <User style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

function StatCell({
  label,
  value,
  hint,
  sv,
}: {
  label: string;
  value?: string | number;
  hint?: string;
  sv: Surface;
}) {
  return (
    <div
      className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-2 py-2"
      style={{ background: sv.track }}
    >
      <div className="text-[10px] uppercase tracking-wider" style={{ color: sv.muted }}>
        {label}
      </div>
      <div className="max-w-full truncate text-sm font-semibold">
        {value !== undefined && value !== "" ? value : "—"}
      </div>
      {hint && (
        <div className="max-w-full truncate text-[9px]" style={{ color: sv.muted }} title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function ModernSteam({
  name,
  status,
  level,
  avatarUrl,
  game,
  playtimeHours,
  sessionTime,
  artUrl,
  totalGames,
  totalHours,
  mostPlayed,
  achPct,
  latestAch,
  friendsOnline,
  totalFriends,
  news,
  layout = "auto",
  surfaceStyle = "glass",
  tint = true,
  showStats = true,
  showNews = true,
  className,
}: ModernSteamProps) {
  const { ref, w, h } = useElementSize();
  const artTint = useArtTint(artUrl, tint);
  const sv = makeSurface(surfaceStyle, artTint);
  const v = pickVariant(w, h, layout);

  const statusLine = [status ?? "Offline", level !== undefined ? `Level ${Math.round(level)}` : ""]
    .filter(Boolean)
    .join(" · ");
  const sessionLine = [
    sessionTime ? `Session ${sessionTime}` : undefined,
    playtimeHours !== undefined ? `${Math.round(playtimeHours)}h owned` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const stats: { label: string; value?: string | number; hint?: string }[] = [];
  if (totalGames !== undefined) stats.push({ label: "Games", value: totalGames });
  if (totalHours !== undefined)
    stats.push({
      label: "Playtime",
      value: `${Math.round(totalHours)}h`,
      hint: mostPlayed ? `Most: ${mostPlayed}` : undefined,
    });
  if (friendsOnline !== undefined)
    stats.push({
      label: "Online",
      value:
        totalFriends !== undefined ? `${friendsOnline}/${totalFriends}` : friendsOnline,
    });
  if (achPct !== undefined)
    stats.push({
      label: "Ach",
      value: `${Math.round(achPct)}%`,
      hint: latestAch,
    });

  const boxStyle = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  let body: React.ReactNode;
  if (v === "card") {
    const avatarSize = clamp(36, h * 0.08, 56);
    body = (
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-[20px] p-4" style={boxStyle}>
        <div className="flex shrink-0 items-center gap-3">
          <Avatar url={avatarUrl} size={avatarSize} sv={sv} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{name ?? "Steam"}</div>
            <div className="truncate text-xs" style={{ color: sv.muted }}>
              {statusLine}
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
          {artUrl ? (
            <img
              src={artUrl}
              alt={game ?? "Game"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: sv.track }}
            >
              <Gamepad2 className="h-8 w-8 opacity-40" style={{ color: sv.muted }} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3">
            <div className="truncate text-base font-semibold text-white">
              {game ?? "Not playing"}
            </div>
            {sessionLine && (
              <div className="truncate text-xs text-white/70">{sessionLine}</div>
            )}
          </div>
        </div>

        {showStats && stats.length > 0 && (
          <div
            className="grid shrink-0 gap-2"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
          >
            {stats.map((s) => (
              <StatCell key={s.label} label={s.label} value={s.value} hint={s.hint} sv={sv} />
            ))}
          </div>
        )}

        {showNews && news && (
          <div className="truncate text-[10px]" style={{ color: sv.muted }} title={news}>
            {news}
          </div>
        )}
      </div>
    );
  } else if (v === "compact") {
    const right = [
      totalGames !== undefined ? `${totalGames} games` : undefined,
      friendsOnline !== undefined
        ? totalFriends !== undefined
          ? `${friendsOnline}/${totalFriends} online`
          : `${friendsOnline} online`
        : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    body = (
      <div
        className="relative flex h-full w-full items-center gap-3 overflow-hidden rounded-full px-4"
        style={boxStyle}
      >
        <Avatar url={avatarUrl} size={clamp(16, h * 0.45, 28)} sv={sv} />
        <span className="shrink-0 text-sm font-semibold">{name ?? "Steam"}</span>
        <span className="min-w-0 truncate text-sm" style={{ color: sv.muted }}>
          {game ? `in ${game}` : status ?? "Offline"}
          {game && sessionTime ? ` (${sessionTime})` : ""}
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
        <Avatar url={avatarUrl} size={clamp(28, h * 0.45, 44)} sv={sv} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name ?? "Steam"}</div>
          <div className="truncate text-xs" style={{ color: sv.muted }}>
            {game ? `in ${game}` : status ?? "Offline"}
          </div>
        </div>
      </div>
    );
  } else {
    // standard
    body = (
      <div className="flex h-full w-full items-stretch gap-4 overflow-hidden rounded-xl p-4" style={boxStyle}>
        <div className="min-w-0 shrink">
          <div className="flex items-center gap-3">
            <Avatar url={avatarUrl} size={clamp(36, h * 0.28, 56)} sv={sv} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name ?? "Steam"}</div>
              <div className="truncate text-xs" style={{ color: sv.muted }}>
                {statusLine}
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl">
          {artUrl ? (
            <img
              src={artUrl}
              alt={game ?? "Game"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: sv.track }}
            >
              <Gamepad2 className="h-6 w-6 opacity-40" style={{ color: sv.muted }} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-2.5">
            <div className="truncate text-sm font-semibold text-white">
              {game ?? "Not playing"}
            </div>
            {sessionLine && (
              <div className="truncate text-[10px] text-white/70">{sessionLine}</div>
            )}
          </div>
        </div>

        {showStats && stats.length > 0 && (
          <div
            className="grid shrink-0 content-center gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(2, stats.length)}, minmax(0, 1fr))`,
              width: "24%",
              minWidth: 130,
              maxWidth: 190,
            }}
          >
            {stats.map((s) => (
              <StatCell key={s.label} label={s.label} value={s.value} hint={s.hint} sv={sv} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      {body}
    </div>
  );
}
