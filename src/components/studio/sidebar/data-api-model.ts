import type { StatusTone } from "@/components/ui/status-chip";
import type { DataSource, Health } from "@/lib/data-points";
import type { StatusServer, StatusBarData } from "../status-bar";
import { restartItem, serverItem, updateItem, type Item } from "../status-bar";
import type { NavTarget } from "../studio-nav";
import type { ApiDrop, ApiHealth, ApiLink } from "../use-data-api-grace";

/** The chip's word and tone; `slow` is a connected state with an amber latency (Q8). */
export const LINK_CHIP: Readonly<Record<ApiLink, { word: string; tone: StatusTone }>> = {
  connected: { word: "Connected", tone: "ok" },
  slow: { word: "Connected", tone: "ok" },
  reconnecting: { word: "Reconnecting", tone: "warn" },
  offline: { word: "Offline", tone: "danger" },
};

/** A span in the fewest words: "12 s", "2 min", "1 h". */
export function spanText(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  return min < 60 ? `${min} min` : `${Math.round(min / 60)} h`;
}

/** The Data API card's second line. */
export function cardLine(link: ApiLink, latencyMs: number | null | undefined, downMs: number): string {
  if (link === "reconnecting") return `Reconnecting · ${spanText(downMs)}`;
  if (link === "offline") return `Offline · ${spanText(downMs)}`;
  return typeof latencyMs === "number" ? `Connected · ${latencyMs} ms` : "Connected";
}

/** The popover's Last drop row: "4 min ago · back in 1.2 s", "now", "None". */
export function dropText(drop: ApiDrop | null, now: number): string {
  if (!drop) return "None";
  const age = now - drop.at;
  const when = age < 5000 ? "now" : `${spanText(age)} ago`;
  return drop.backAfterMs === null ? when : `${when} · back in ${(drop.backAfterMs / 1000).toFixed(1)} s`;
}

/** The chip's note: how healthy the sources are, how long a drop has lasted, or since when it is offline. */
export function chipNote(health: ApiHealth, sources: readonly Pick<DataSource, "status">[], now: number): string {
  if (health.link === "reconnecting") return spanText(health.downMs);
  if (health.link === "offline") return `since ${new Date(now - health.downMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const ok = sources.filter((s) => s.status === "ok").length;
  return ok === sources.length ? `${ok} ${ok === 1 ? "source" : "sources"} healthy` : `${ok} of ${sources.length} sources healthy`;
}

/** A source's dot: its own health while connected, held amber in the grace, grey when offline. */
export function sourceTone(link: ApiLink, status: Health): StatusTone {
  if (link === "reconnecting") return "warn";
  if (link === "offline" || status === "off") return "neutral";
  return status === "ok" ? "ok" : "warn";
}

/** The Studio server row: "127.0.0.1:47911 · LAN", or the phase while it is not running. */
export function serverLine(server: StatusServer, host: string): string {
  if (server.kind === "browser") return host;
  const phase = server.phase ?? "running";
  if (phase !== "running") return phase.replace(/_/g, " ");
  return `127.0.0.1:${server.port}${server.lan ? " · LAN" : ""}`;
}

/**
 * The sidebar's attention rows: what the footer told, once it has something to tell. An update and a restart are
 * always rows, the server only while it is not running, and unsaved edits only when the server is out of reach.
 */
export function attentionItems(status: Pick<StatusBarData, "server" | "update" | "restartNeeded" | "save">, go: (t: NavTarget) => void): Item[] {
  const server = serverItem(status.server, go);
  return [
    ...(status.update && status.server.kind === "desktop" ? [updateItem(status.update, go)] : []),
    ...(status.restartNeeded ? [restartItem(go)] : []),
    ...(server.tone === "ok" ? [] : [server]),
    ...(status.save === "offline" ? [{ id: "offline", label: "Offline · edits kept locally", tone: "warn" as const, tip: "The server can't be reached. Edits are kept here and sent when it is back", onClick: () => go({ view: "settings", tab: "app", section: "server" }) }] : []),
  ];
}
