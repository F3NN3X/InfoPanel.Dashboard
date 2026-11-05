import { SEVERITY_RANK, type ActiveAlert, type AlertDisplayFull } from "@/lib/alerts";
import type { IslandNotice } from "./types";

/** The bus source server alerts sync into. */
export const ALERTS_SOURCE = "alerts";

/** Alerts whose rule picked the island display, or Auto, which goes there on a screen with one. */
export const isIslandAlert = (a: ActiveAlert) => a.display.style === "island" || a.display.style === "auto";

/** The alert a screen shows first: the strongest, then the newest. */
export const strongestFirst = (a: ActiveAlert, b: ActiveAlert) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.startedAt - a.startedAt;

/** An alert's heading; a test says so. */
export const alertTitle = (a: ActiveAlert) => `${a.test ? "Test · " : ""}${a.title ?? a.name}`;

const inLayer = (d: AlertDisplayFull): AlertDisplayFull => (d.style === "island" ? { ...d, style: "toast", position: "top" } : d);

/**
 * Split the alerts a kiosk shows between the island and the alert layer, one at a time per screen (overlays stay as they
 * are). With an island a lone toast or banner keeps its place and two or more queue there. Without one the strongest shows
 * and the rest wait in its slot behind "Dismiss N more"; an island alert shows as a top toast, an Auto one as a toast.
 */
export function splitIslandAlerts(
  alerts: readonly ActiveAlert[],
  islandOn: boolean
): { island: ActiveAlert[]; layer: ActiveAlert[] } {
  const overlays = alerts.filter((a) => a.display.style === "overlay");
  const rest = alerts.filter((a) => a.display.style !== "overlay").sort(strongestFirst);
  if (islandOn) {
    const island = rest.length > 1 ? rest : rest.filter(isIslandAlert);
    return { island, layer: [...overlays, ...rest.filter((a) => !island.includes(a))] };
  }
  return { island: [], layer: [...overlays, ...rest.map((a) => ({ ...a, display: inLayer(rest[0].display) }))] };
}

/** A server alert as an island notice: open for the rule's display seconds (0 = until tapped), a tap acknowledges. */
export const noticeFromAlert = (a: ActiveAlert): IslandNotice => ({
  source: ALERTS_SOURCE,
  id: a.id,
  severity: a.severity,
  title: alertTitle(a),
  ...(a.text ? { body: a.text } : {}),
  ttl: Math.max(0, a.display.seconds) * 1000,
  onTap: "ack",
  alertId: a.id,
  badge: true,
});
