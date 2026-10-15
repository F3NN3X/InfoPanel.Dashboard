import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ActiveAlert, QuietHours, Severity } from "@/lib/alerts";
import type { IslandConfig, IslandSize } from "@/lib/island/config";
import { islandBus, useIsland, type IslandBus } from "@/lib/island/bus";
import { ALERTS_SOURCE, noticeFromAlert } from "@/lib/island/from-alerts";
import { quietGate } from "@/lib/island/quiet";
import type { IslandFeed } from "@/lib/island/sources";
import type { IslandActivity, IslandItem, IslandSnapshot } from "@/lib/island/types";
import { useDashboardNotices } from "@/lib/island/use-dashboard-notices";
import { useConnectionNotice, useIslandSources } from "@/lib/island/use-island-sources";
import { formatReading } from "@/lib/data-points";
import { formatClock } from "@/lib/general";
import { sensorAt } from "@/lib/sensors";
import { useGeneral } from "@/hooks/use-general";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSensors } from "@/hooks/useSensors";
import { useNow } from "@/components/widgets/hooks";
import { severityColor } from "@/components/alerts/alert-model";
import { cn } from "@/lib/utils";
import { ISLAND_FONT_PX, fitIslandSize, islandBox, islandMode, type IslandMode } from "./island-model";

const ICONS: Record<Severity, LucideIcon> = { info: Info, warning: TriangleAlert, critical: OctagonAlert };
/** How long a tap on the badge or the activity opens the island, ms. */
export const PEEK_MS = 6000;
/** The bus source a tapped activity opens as. */
const ACTIVITY_PEEK = "activity";
const NO_KEYS: readonly string[] = [];

interface DynamicIslandProps {
  config: IslandConfig;
  /** The server alerts it shows (already filtered to this profile and to the island style). */
  alerts: readonly ActiveAlert[];
  /** Acknowledge a server alert (a tap); unset = taps do nothing (the studio canvas, the plain page). */
  onAck?: (id: string) => void;
  /** "fixed" over the kiosk window, "absolute" inside the studio's page box. */
  placement: "fixed" | "absolute";
  /** The profile's design size: a short strip or a small screen gets a smaller island. */
  page: { width: number; height: number };
  /**
   * The kiosk's own notices: the Data API warning, the widgets that send to the island, the
   * dashboard notices switched on (`config.notices`: the shown page's name, a layout update counted
   * by `layoutVersion`, plugins, OBS, the calendar), and the alerts' quiet hours for all of them.
   * Unset = server alerts only.
   */
  live?: { feeds: readonly IslandFeed[]; quietHours?: QuietHours; page: string; layoutVersion: number };
  bus?: IslandBus;
}

/**
 * The Dynamic Island: a pill at the top centre of the page. Idle it shows the time (and the date or
 * one sensor value); a live activity (the playing track) sits beside the time; it springs open for
 * the strongest notice on the bus, then shrinks to the time with a severity badge while notices
 * remain. Width, height and radius animate between fixed boxes (`islandBox`); reduced motion swaps
 * them at once. On the kiosk a tap acknowledges the open alert, opens the next held notice again
 * (the badge), or opens the activity.
 */
export function DynamicIsland({ config, alerts, onAck, placement, page, live, bus = islandBus }: DynamicIslandProps) {
  const snap = useIsland(bus);
  const size = fitIslandSize(config.size, page);

  useEffect(() => bus.setSticky(config.collapseAfter > 0 ? config.collapseAfter * 1000 : Infinity), [bus, config.collapseAfter]);
  useEffect(() => bus.syncSource(ALERTS_SOURCE, alerts.map(noticeFromAlert)), [bus, alerts]);
  useEffect(() => () => bus.syncSource(ALERTS_SOURCE, []), [bus]);

  const mode = islandMode(snap, config.idle);
  return (
    <>
      {/* The sources stay mounted in one place whatever the mode, so their baseline survives. */}
      {live && <LiveSources bus={bus} config={config} live={live} />}
      {mode !== "none" && (
        <IslandPill mode={mode} snap={snap} config={config} size={size} placement={placement} onAck={onAck} bus={bus} />
      )}
    </>
  );
}

interface IslandPillProps {
  mode: Exclude<IslandMode, "none">;
  snap: IslandSnapshot;
  config: IslandConfig;
  size: IslandSize;
  placement: "fixed" | "absolute";
  onAck?: (id: string) => void;
  bus: IslandBus;
}

function IslandPill({ mode, snap, config, size, placement, onAck, bus }: IslandPillProps) {
  const reduced = useReducedMotion();
  const peekAt = useRef(0);
  const box = islandBox(mode, size, config.idle);
  const item = snap.expanded;
  const strongest = item ?? snap.pending[0];
  const accent = strongest ? severityColor(strongest.severity) : undefined;
  const interactive = onAck !== undefined;
  const tinted = config.tint === "theme";

  const tap = () => {
    if (item) {
      if (item.onTap === "ack" && item.alertId) onAck?.(item.alertId);
      else bus.dismiss(item.source, item.id);
    } else if (snap.pending.length > 0) {
      // Each tap opens the next held notice, strongest first.
      const next = snap.pending[peekAt.current++ % snap.pending.length];
      bus.peek(next.source, next.id, PEEK_MS);
    } else if (snap.activity) {
      const a = snap.activity;
      bus.notify({ source: ACTIVITY_PEEK, id: `${a.source}:${a.id}`, severity: "info", title: a.title, body: a.subtitle, image: a.image, ttl: PEEK_MS });
    }
  };

  return (
    <div
      className={cn(placement, "pointer-events-none inset-x-0 z-[55] flex justify-center px-2")}
      style={{ top: config.offsetY }}
      data-island={mode}
    >
      <div
        role={item ? (item.severity === "info" ? "status" : "alert") : undefined}
        onClick={interactive && mode !== "idle" ? tap : undefined}
        className={cn(
          "island relative flex max-w-full items-center overflow-hidden",
          tinted ? "border border-border bg-card text-card-foreground" : "bg-black text-white",
          interactive && mode !== "idle" && "pointer-events-auto cursor-pointer select-none",
          !reduced && "island-motion",
          !reduced && item?.severity === "critical" && "island-critical"
        )}
        style={
          {
            width: box.width,
            height: box.height,
            borderRadius: mode === "expanded" ? Math.round(box.height * 0.42) : box.height / 2,
            fontSize: ISLAND_FONT_PX[size],
            "--island-accent": accent,
          } as CSSProperties
        }
      >
        <div key={item ? `x:${item.key}` : mode} className={cn("flex h-full w-full min-w-0 items-center", !reduced && "island-fade")}>
          {item ? (
            <Expanded item={item} />
          ) : mode === "activity" && snap.activity ? (
            <Activity activity={snap.activity} />
          ) : (
            <Idle config={config} pending={snap.pending.length} accent={accent} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The kiosk's own notices, mounted only there (no stream opens on the canvas): the Data API warning,
 * the widgets' sources, and quiet hours for both.
 */
function LiveSources({ bus, config, live }: { bus: IslandBus; config: IslandConfig; live: NonNullable<DynamicIslandProps["live"]> }) {
  const { feeds, quietHours } = live;
  useEffect(() => {
    // Server alerts were filtered on the server; a tapped activity was asked for.
    bus.setGate(quietGate(quietHours, [ALERTS_SOURCE, ACTIVITY_PEEK]));
    return () => bus.setGate(null);
  }, [bus, quietHours]);
  useConnectionNotice(bus, true);
  useIslandSources(bus, feeds, true);
  useDashboardNotices(bus, { notices: config.notices, page: live.page, layoutVersion: live.layoutVersion, calendarLead: config.calendarLead });
  return null;
}

function Idle({ config, pending, accent }: { config: IslandConfig; pending: number; accent?: string }) {
  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-[0.7em] px-[1em]">
      <IslandClock date={config.idle === "time-date"} />
      {config.idle === "sensor" && <IslandSensor sensorKey={config.sensorKey} label={config.sensorLabel} />}
      {pending > 0 && (
        <span className="flex shrink-0 items-center gap-[0.35em] font-semibold tabular-nums" aria-label={`${pending} active alerts`}>
          <span className="h-[0.6em] w-[0.6em] rounded-full" style={{ background: accent }} />
          {pending}
        </span>
      )}
    </div>
  );
}

/** The time (and date), its own component so the once-a-second tick re-renders only it. */
function IslandClock({ date }: { date: boolean }) {
  const general = useGeneral();
  const now = formatClock(useNow(1000), general);
  return (
    <span className="min-w-0 truncate font-semibold tabular-nums">
      {now.time}
      {date && <span className="ml-[0.6em] font-normal opacity-60">{now.date}</span>}
    </span>
  );
}

/** One live value beside the time, from the shared streams ("–" before it reports). */
function IslandSensor({ sensorKey, label }: { sensorKey: string; label: string }) {
  const keys = useMemo(() => (sensorKey ? [sensorKey] : NO_KEYS), [sensorKey]);
  const live = useSensors(keys);
  const reading = sensorKey ? sensorAt(live, sensorKey) : undefined;
  const text =
    reading && typeof reading.value === "number" && Number.isFinite(reading.value)
      ? formatReading(reading.value, reading.unit)
      : reading?.text?.trim() || "–";
  return (
    <span className="min-w-0 truncate tabular-nums opacity-80">
      {label && <span className="mr-[0.35em] opacity-60">{label}</span>}
      {text}
    </span>
  );
}

function Activity({ activity }: { activity: IslandActivity }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-[0.7em] pl-[1em] pr-[0.45em]">
      <IslandClock date={false} />
      <div className="flex min-w-0 flex-1 items-center justify-end gap-[0.5em]">
        <span className="min-w-0 truncate text-right">
          <span className="font-semibold">{activity.title}</span>
          {activity.subtitle && <span className="ml-[0.4em] opacity-60">{activity.subtitle}</span>}
        </span>
        {activity.image ? (
          <img src={activity.image} alt="" className="h-[1.9em] w-[1.9em] shrink-0 rounded-[0.45em] object-cover" />
        ) : (
          <span className="mr-[0.5em] h-[0.6em] w-[0.6em] shrink-0 rounded-full" style={{ background: activity.color ?? "currentColor" }} />
        )}
      </div>
      {activity.progress !== undefined && (
        <span className="absolute inset-x-[1.2em] bottom-[0.18em] h-[2px] overflow-hidden rounded-full bg-current/15" aria-hidden>
          <span className="block h-full bg-current/70" style={{ width: `${Math.round(activity.progress * 100)}%` }} />
        </span>
      )}
    </div>
  );
}

function Expanded({ item }: { item: IslandItem }) {
  const Icon = ICONS[item.severity];
  const color = severityColor(item.severity);
  return (
    <div className="flex w-full min-w-0 items-center gap-[0.8em] px-[1.1em]">
      {item.image ? (
        <img src={item.image} alt="" className="h-[2.6em] w-[2.6em] shrink-0 rounded-[0.6em] object-cover" />
      ) : (
        <span
          className="flex h-[2.4em] w-[2.4em] shrink-0 items-center justify-center rounded-full"
          style={{ background: `color-mix(in srgb, ${color} 22%, transparent)`, color }}
        >
          <Icon className="h-[1.3em] w-[1.3em]" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate font-semibold">{item.title}</div>
        {item.body && <div className="truncate text-[0.86em] opacity-65">{item.body}</div>}
        {item.progress !== undefined && (
          <div className="mt-[0.35em] h-[0.3em] overflow-hidden rounded-full bg-current/20" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)}>
            <div className="island-level h-full rounded-full" style={{ width: `${Math.round(item.progress * 100)}%`, background: color }} />
          </div>
        )}
      </div>
    </div>
  );
}
