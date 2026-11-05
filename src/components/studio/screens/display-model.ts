import type { ControlDisplay, ControlKiosk, ControlProfile } from "@/lib/control";
import type { MonitorProfile } from "@/lib/layout";
import { cycleLabel } from "../page-tabs";

/**
 * One card of "Live on displays": a kiosk connected now, with the named display it belongs to when its link names one
 * (Q9). The server reports no size or connection type for a kiosk, so the card shows only what it does report.
 */
export interface LiveDisplay {
  kiosk: ControlKiosk;
  /** The named display behind the kiosk's `?display=`, when the server knows it. */
  display?: ControlDisplay;
  /** The screen the kiosk shows, when it still exists. */
  screen?: MonitorProfile;
}

/** The kiosks connected now, each merged with its named display, in the order they connected. */
export function liveDisplays(kiosks: readonly ControlKiosk[], displays: readonly ControlDisplay[], profiles: readonly MonitorProfile[]): LiveDisplay[] {
  return kiosks.map((kiosk) => ({
    kiosk,
    display: kiosk.display ? displays.find((d) => d.name === kiosk.display) : undefined,
    screen: profiles.find((p) => p.id === kiosk.profile),
  }));
}

/** The named displays with no kiosk connected: kept in a list so one can still be reassigned or forgotten. */
export const disconnectedDisplays = (displays: readonly ControlDisplay[]): ControlDisplay[] => displays.filter((d) => !d.online);

/** A card's title: the display's name, else "Kiosk · address", else "Kiosk". */
export function displayTitle({ kiosk }: Pick<LiveDisplay, "kiosk">): string {
  if (kiosk.display) return kiosk.display;
  return kiosk.address ? `Kiosk · ${kiosk.address}` : "Kiosk";
}

/** How long a kiosk has been connected: `5 min`, `2 h`, `3 d` (under a minute: `now`). */
export function connectedFor(since: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - since) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} d`;
}

/** The line under a card's title: the address (when the title is a name) and how long it has been connected. */
export function displaySubtitle({ kiosk }: Pick<LiveDisplay, "kiosk">, now: number): string {
  const age = connectedFor(kiosk.since, now);
  const since = age === "now" ? "connected just now" : `connected ${age}`;
  return kiosk.address && kiosk.display ? `${kiosk.address} · ${since}` : since;
}

/** The rotation button's state for the screen a card shows: what it says and what a click does. */
export function rotationButton(
  screen: Pick<MonitorProfile, "name" | "pages" | "rotate">,
  entry: Pick<ControlProfile, "rotating"> | undefined,
): { label: string; running: boolean; toggles: boolean; title: string } {
  if (screen.pages.length < 2) return { label: "One page", running: false, toggles: false, title: `${screen.name} has one page: there is nothing to rotate.` };
  const running = entry?.rotating ?? screen.rotate?.enabled === true;
  const every = cycleLabel(screen.rotate?.seconds ?? 0);
  return {
    label: running ? every : "Paused",
    running,
    toggles: true,
    title: running ? `${screen.name} rotates its pages every ${every} on every display. Pause it for now.` : `${screen.name} is not rotating its pages on any display. Start it for now.`,
  };
}

/** `1 display` / `3 displays`. */
export const displaysText = (n: number): string => `${n} ${n === 1 ? "display" : "displays"}`;

/** Placements across every page: the "widgets" of a card's size line. */
export const widgetCount = (p: Pick<MonitorProfile, "pages">): number => p.pages.reduce((n, pg) => n + pg.placements.length, 0);

/** A card's size line: `1600 × 900 · 1 page · 7 widgets`. */
export function screenSummary(p: Pick<MonitorProfile, "width" | "height" | "pages">): string {
  const pages = `${p.pages.length} ${p.pages.length === 1 ? "page" : "pages"}`;
  const widgets = widgetCount(p);
  return `${p.width} × ${p.height} · ${pages} · ${widgets} ${widgets === 1 ? "widget" : "widgets"}`;
}

/** The header's count line: `4 screens · 2 displays live`. */
export function screensCountLine(screens: number, live: number): string {
  const text = `${screens} ${screens === 1 ? "screen" : "screens"}`;
  return live > 0 ? `${text} · ${displaysText(live)} live` : text;
}
