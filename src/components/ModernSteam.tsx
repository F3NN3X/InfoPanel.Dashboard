import { Gamepad2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern Steam widget.
 *
 * The game banner is the background of the whole widget (object-cover,
 * dimmed with a gradient for legibility) and the transparent game logo is
 * overlaid on top — the look of the reference "last played" cards. One
 * component, four layouts picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: profile header, the game logo
 *                centered over the banner, big total-playtime + session
 *                line, achievements/friends on the right
 * - `standard` — wide zones: profile on the left, big playtime in the
 *                middle, stats on the right
 * - `compact`  — very short zones: one pill (avatar · name · in game ·
 *                total playtime)
 * - `simple`   — small zones: avatar + name + game
 *
 * When a game has no banner the surface finish (glass / matte light /
 * matte dark) is used as the fallback background instead.
 */

export type SteamVariant = "card" | "standard" | "compact" | "simple";

export interface ModernSteamProps {
  name?: string;
  status?: string;
  level?: number;
  avatarUrl?: string;
  /** Currently playing game. */
  game?: string;
  /** Total hours owned of the current game. */
  playtimeHours?: number;
  /** Formatted session time ("1h 23m"). */
  sessionTime?: string;
  /** Session start text ("Started playing 16:40 07.10.2026"). */
  sessionStart?: string;
  /** Wide game banner — the widget background. */
  bannerUrl?: string;
  /** Transparent game logo, overlaid on the banner. */
  logoUrl?: string;
  /** Square app icon, fallback for the logo. */
  iconUrl?: string;
  totalGames?: number;
  achPct?: number;
  latestAch?: string;
  /** Latest achievement icon. */
  achIconUrl?: string;
  friendsOnline?: number;
  totalFriends?: number;
  news?: string;
  /** Forced layout; "auto" adapts to the zone size. */
  layout?: SteamVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Dim the banner with a gradient so text stays legible. */
  dimBanner?: boolean;
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

/** Dark gradients per layout, over the banner (top/bottom for card, left→right for wide). */
const OVERLAYS: Record<SteamVariant, string> = {
  card: "linear-gradient(180deg, rgba(3,6,16,0.84) 0%, rgba(3,6,16,0.18) 34%, rgba(3,6,16,0.24) 62%, rgba(3,6,16,0.9) 100%)",
  standard: "linear-gradient(90deg, rgba(3,6,16,0.87) 0%, rgba(3,6,16,0.4) 45%, rgba(3,6,16,0.62) 100%)",
  compact: "linear-gradient(90deg, rgba(3,6,16,0.82) 0%, rgba(3,6,16,0.48) 55%, rgba(3,6,16,0.68) 100%)",
  simple: "linear-gradient(180deg, rgba(3,6,16,0.5) 0%, rgba(3,6,16,0.88) 100%)",
};

function Avatar({ url, size }: { url?: string; size: number }) {
  return url ? (
    <img
      src={url}
      alt=""
      className="shrink-0 rounded-full object-cover ring-1 ring-white/25"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 ring-1 ring-white/25"
      style={{ width: size, height: size }}
    >
      <User style={{ width: size * 0.5, height: size * 0.5 }} />
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
  sessionStart,
  bannerUrl,
  logoUrl,
  iconUrl,
  totalGames,
  achPct,
  latestAch,
  achIconUrl,
  friendsOnline,
  totalFriends,
  news,
  layout = "auto",
  surfaceStyle = "glass",
  dimBanner = true,
  showStats = true,
  showNews = true,
  className,
}: ModernSteamProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);

  // Over the banner text is white-based; on the bare surface finish it is
  // theme-driven.
  const onBanner = Boolean(bannerUrl);
  const fg = onBanner ? "#ffffff" : sv.fg;
  const muted = onBanner ? "rgba(255,255,255,0.72)" : sv.muted;

  const statusLine = [status ?? "Offline", level !== undefined ? `Level ${Math.round(level)}` : ""]
    .filter(Boolean)
    .join(" · ");
  const sessionLine = [
    game ? `In ${game}` : status ?? "Offline",
    sessionTime && game ? `(${sessionTime})` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const total = playtimeHours !== undefined ? `${Math.round(playtimeHours)}h` : undefined;
  const friendsLine =
    friendsOnline !== undefined
      ? totalFriends !== undefined
        ? `${friendsOnline}/${totalFriends} online`
        : `${friendsOnline} online`
      : undefined;

  const radius: Record<SteamVariant, string> = {
    card: "rounded-[20px]",
    standard: "rounded-xl",
    compact: "rounded-full",
    simple: "rounded-xl",
  };

  let body: React.ReactNode;
  if (v === "card") {
    body = (
      <div className="relative flex h-full w-full flex-col p-4">
        <div className="flex shrink-0 items-center gap-3">
          <Avatar url={avatarUrl} size={clamp(34, h * 0.08, 52)} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold" style={{ color: fg }}>
              {name ?? "Steam"}
            </div>
            <div className="truncate text-xs" style={{ color: muted }}>
              {statusLine}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-1">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={game ?? "Game"}
              className="max-h-full max-w-[76%] object-contain"
              style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.65))" }}
              loading="lazy"
            />
          ) : iconUrl ? (
            <img
              src={iconUrl}
              alt={game ?? "Game"}
              className="aspect-square max-h-[70%] rounded-2xl object-cover"
              style={{ filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.65))" }}
              loading="lazy"
            />
          ) : (
            <div className="max-w-full text-center">
              <div className="truncate text-2xl font-bold" style={{ color: fg }}>
                {game ?? "Not playing"}
              </div>
              {sessionTime && (
                <div className="mt-1 text-sm" style={{ color: muted }}>
                  session {sessionTime}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div
                className="text-[30px] font-bold leading-none tabular-nums"
                style={{ color: fg }}
              >
                {total ?? "—"}
              </div>
              <div className="mt-1 truncate text-xs" style={{ color: muted }}>
                {game ? `total in ${game}` : "Not playing"}
                {sessionStart ? ` · ${sessionStart}` : ""}
              </div>
            </div>
            {showStats && (
              <div className="max-w-[45%] shrink-0 text-right">
                <div className="flex items-center justify-end gap-1.5 text-sm font-semibold tabular-nums" style={{ color: fg }}>
                  {achIconUrl && (
                    <img src={achIconUrl} alt="" className="h-5 w-5 rounded object-cover" loading="lazy" />
                  )}
                  {achPct !== undefined ? `${Math.round(achPct)}%` : "—"}
                  <span className="text-xs font-normal" style={{ color: muted }}>
                    achievements
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs" style={{ color: muted }}>
                  {latestAch ?? friendsLine ?? totalGames !== undefined ? latestAch ?? friendsLine : totalGames !== undefined ? `${totalGames} games` : ""}
                </div>
                {totalGames !== undefined && !latestAch && friendsLine === undefined && (
                  <div className="truncate text-xs" style={{ color: muted }}>
                    {totalGames} games
                  </div>
                )}
              </div>
            )}
          </div>
          {showNews && news && (
            <div className="mt-2 truncate text-[10px]" style={{ color: muted }} title={news}>
              {news}
            </div>
          )}
        </div>
      </div>
    );
  } else if (v === "compact") {
    body = (
      <div className="relative flex h-full w-full items-center gap-3 px-4">
        <Avatar url={avatarUrl} size={clamp(16, h * 0.45, 28)} />
        <div className="min-w-0 truncate text-sm" style={{ color: fg }}>
          <span className="font-semibold">{name ?? "Steam"}</span>
          <span className="ml-2" style={{ color: muted }}>
            {sessionLine}
          </span>
        </div>
        <div className="ml-auto shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums leading-tight" style={{ color: fg }}>
            {total ?? "—"}
          </div>
          <div className="truncate text-[10px] tabular-nums" style={{ color: muted }}>
            {[totalGames !== undefined ? `${totalGames} games` : undefined, friendsLine, achPct !== undefined ? `${Math.round(achPct)}% ach` : undefined].filter(Boolean).join(" · ") || "offline"}
          </div>
        </div>
      </div>
    );
  } else if (v === "simple") {
    body = (
      <div className="relative flex h-full w-full items-center gap-3 p-3">
        <Avatar url={avatarUrl} size={clamp(28, h * 0.45, 44)} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: fg }}>
            {name ?? "Steam"}
          </div>
          <div className="truncate text-xs" style={{ color: muted }}>
            {sessionLine}
          </div>
        </div>
        {achPct !== undefined && (
          <div className="ml-auto shrink-0 text-right">
            <div className="text-sm font-semibold tabular-nums leading-tight" style={{ color: fg }}>
              {Math.round(achPct)}%
            </div>
            <div className="text-[9px]" style={{ color: muted }}>
              ach
            </div>
          </div>
        )}
      </div>
    );
  } else {
    // standard
    body = (
      <div className="relative flex h-full w-full items-center gap-4 p-4">
        <div className="w-[28%] min-w-[150px] max-w-[280px] shrink">
          <div className="flex items-center gap-3">
            <Avatar url={avatarUrl} size={clamp(36, h * 0.3, 56)} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold" style={{ color: fg }}>
                {name ?? "Steam"}
              </div>
              <div className="truncate text-xs" style={{ color: muted }}>
                {statusLine}
              </div>
            </div>
          </div>
          {(logoUrl || iconUrl) && (
            <img
              src={logoUrl ?? iconUrl}
              alt={game ?? "Game"}
              className="mt-2.5 h-9 w-full object-contain object-left"
              style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))" }}
              loading="lazy"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 text-center">
          <div className="text-5xl font-bold leading-none tabular-nums" style={{ color: fg }}>
            {total ?? "—"}
          </div>
          <div className="mt-1.5 truncate text-sm" style={{ color: muted }}>
            {game ? `total in ${game}` : "Not playing"}
          </div>
          {(sessionTime || sessionStart) && (
            <div className="truncate text-xs" style={{ color: muted }}>
              {[sessionTime && `session ${sessionTime}`, sessionStart].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        {showStats && (
          <div className="w-[26%] min-w-[140px] max-w-[240px] shrink text-right">
            <div className="text-xs tabular-nums" style={{ color: muted }}>
              {[totalGames !== undefined ? `${totalGames} games` : undefined, friendsLine].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5 text-base font-semibold tabular-nums" style={{ color: fg }}>
              {achIconUrl && (
                <img src={achIconUrl} alt="" className="h-5 w-5 rounded object-cover" loading="lazy" />
              )}
              {achPct !== undefined ? `${Math.round(achPct)}%` : "—"}
            </div>
            <div className="truncate text-xs" style={{ color: muted }} title={latestAch}>
              {latestAch ? `latest: ${latestAch}` : "achievements"}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <div
        className={cn("relative h-full w-full overflow-hidden", radius[v])}
        style={{
          background: bannerUrl ? undefined : sv.background,
          boxShadow: `inset 0 0 0 1px ${sv.ring}`,
        }}
      >
        {bannerUrl ? (
          <>
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {dimBanner && (
              <div className="absolute inset-0" style={{ background: OVERLAYS[v] }} />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gamepad2 className="h-10 w-10 opacity-30" style={{ color: sv.muted }} />
          </div>
        )}
        <div className="relative z-10 h-full w-full">{body}</div>
      </div>
    </div>
  );
}
