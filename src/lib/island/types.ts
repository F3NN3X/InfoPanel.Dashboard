import type { Severity } from "@/lib/alerts";

/**
 * One notice for the island. Anything can raise one through the bus (`notify`): server alerts,
 * dashboard checks and, later, widgets. `(source, id)` identifies it: raising the same pair again
 * updates the notice in place instead of replaying it.
 */
export interface IslandNotice {
  /** Who raised it: "alerts", "system", a widget id, ... */
  source: string;
  /** Stable per logical event. */
  id: string;
  severity: Severity;
  title: string;
  body?: string;
  /** Image URL shown in place of the severity icon (cover art). */
  image?: string;
  /** 0..1: a level bar under the title (a volume change). */
  progress?: number;
  /** A repeat while it is still held restarts its open time (a volume slider moving). */
  refresh?: boolean;
  /**
   * Notices of one kind from a source (one app's notifications, one game's achievements). With the
   * island's grouping on, a new one takes the place of the held one of its group and counts up.
   */
  group?: string;
  /**
   * How long the island stays open for it, ms; 0 = until tapped (or the profile's collapse
   * timer). Defaults by severity: `DEFAULT_TTL`.
   */
  ttl?: number;
  /** After it ends, the same `(source, id)` is ignored this long, ms (default 0). */
  cooldownMs?: number;
  /**
   * After its open time it stays as a badge until it is dismissed or its source drops it (server
   * alerts, the Data API warning). Default false: it ends with its open time.
   */
  badge?: boolean;
  /** What a tap does: "ack" acknowledges the server alert `alertId`; "dismiss" ends the notice. */
  onTap?: "dismiss" | "ack";
  alertId?: string;
}

/** A notice the island holds. */
export interface IslandItem {
  key: string;
  source: string;
  id: string;
  severity: Severity;
  title: string;
  body?: string;
  image?: string;
  progress?: number;
  group?: string;
  /** How many notices of its group it stands for (1 without grouping). */
  count: number;
  onTap: "dismiss" | "ack";
  alertId?: string;
  cooldownMs: number;
  badge: boolean;
  /** When it was first raised, and last raised again. */
  firstAt: number;
  updatedAt: number;
  /** Open time left, ms (Infinity: until tapped); at 0 it shows as a badge while it lasts. */
  remaining: number;
}

/**
 * Something ongoing the island shows beside the time while nothing is open (iPhone "Live
 * Activities"): the playing track. One per `(source, id)`; the highest `priority`, then the newest,
 * shows.
 */
export interface IslandActivity {
  source: string;
  id: string;
  title: string;
  subtitle?: string;
  /** Image URL (cover art); else a dot in `color`. */
  image?: string;
  color?: string;
  /** 0..1 */
  progress?: number;
  /** The dot pulses (something is running: a coding agent's turn). */
  pulse?: boolean;
  priority?: number;
}

/** What the island shows. */
export interface IslandSnapshot {
  /** The notice the island is open for. */
  expanded: IslandItem | null;
  /** Every other notice still active, strongest first (the badge). */
  pending: readonly IslandItem[];
  /** The live activity beside the time, when there is one. */
  activity: IslandActivity | null;
}
