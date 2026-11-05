import type { AlertHistoryEntry, AlertStyle, Severity } from "@/lib/alerts";
import { formatReading } from "@/lib/data-points";
import type { MonitorProfile } from "@/lib/layout";
import type { StatusTone } from "@/components/ui/status-chip";

/**
 * What the History table shows of a row, and its CSV. Rows the server wrote before `shownAs` and the value were
 * stored have neither: they read as a dash.
 */

export interface HistoryFilter {
  severity: Severity | "all";
  tests: boolean;
}

export const filterHistory = (history: readonly AlertHistoryEntry[], { severity, tests }: HistoryFilter): AlertHistoryEntry[] =>
  history.filter((h) => (tests || !h.test) && (severity === "all" || h.severity === severity));

/** "40 s", "3 min", "2 h". */
export function spanText(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  return `${Math.floor(s / 3600)} h`;
}

const DAY_MS = 86_400_000;
const startOfDay = (at: number) => new Date(at).setHours(0, 0, 0, 0);

/** "Today 12:01", "Yesterday 22:40", "Mon 21:17", then "8 Jan 21:17". */
export function whenText(at: number, now: number): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const days = Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  const day = days < 7 ? date.toLocaleDateString([], { weekday: "short" }) : date.toLocaleDateString([], { day: "numeric", month: "short" });
  return `${day} ${time}`;
}

/** How a row ended. */
export function endedOf(h: AlertHistoryEntry): { label: string; tone: StatusTone } {
  if (h.endedAt === undefined) return { label: "Active", tone: "danger" };
  if (h.replacedBy) return { label: "Replaced", tone: "neutral" };
  if (h.dismissed) return { label: "Dismissed", tone: "neutral" };
  if (h.acknowledgedAt !== undefined) return { label: "Acknowledged", tone: "neutral" };
  return { label: `Cleared · ${spanText(h.endedAt - h.startedAt)}`, tone: "ok" };
}

export const valueText = (h: Pick<AlertHistoryEntry, "value" | "unit">): string =>
  typeof h.value === "number" ? formatReading(h.value, h.unit) : (h.value ?? "—");

/** The screens a rule or row targets: the listed ones, or all of them. */
export const targetsOf = (ids: readonly string[] | undefined, profiles: readonly MonitorProfile[]): MonitorProfile[] =>
  ids && ids.length > 0 ? profiles.filter((p) => ids.includes(p.id)) : [...profiles];

const hasIsland = (p: MonitorProfile) => p.island?.enabled === true;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a style came out as on its screens: Auto and Island are the island where every screen has one, a toast where none has, and their own name when screens differ. */
export function landedText(style: AlertStyle | undefined, targets: readonly MonitorProfile[]): string {
  if (!style) return "—";
  if (style !== "auto" && style !== "island") return cap(style);
  const withOne = targets.filter(hasIsland).length;
  if (withOne === targets.length) return "Island";
  return withOne === 0 ? "Toast" : cap(style);
}

export function screensText(h: AlertHistoryEntry, profiles: readonly MonitorProfile[]): string {
  if (!h.shownAs) return "—";
  return h.profiles && h.profiles.length > 0 ? targetsOf(h.profiles, profiles).map((p) => p.name).join(", ") || "—" : "All screens";
}

/** Text a spreadsheet can read as a formula: it opens with a tab or CR, or with one of these after any white space. */
const FORMULA = /^(?:[\t\r]|\s*[=+\-@])/;

/** One CSV cell: rule names and text values are outside text, so a formula is defused with a leading quote; `numeric` comes from a number, not from what the text looks like. */
function cell(text: string, numeric = false): string {
  const safe = !numeric && FORMULA.test(text) ? `'${text}` : text;
  return /[",;\t\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** The rows as CSV, the table's columns plus the severity and whether a test. */
export function historyCsv(history: readonly AlertHistoryEntry[], profiles: readonly MonitorProfile[]): string {
  const head = ["Started", "Alert", "Severity", "Test", "Value", "Shown as", "Screens", "Ended"];
  const rows = history.map((h) => [
    cell(new Date(h.startedAt).toISOString()),
    cell(h.name),
    cell(h.severity),
    cell(h.test ? "yes" : "no"),
    cell(valueText(h), typeof h.value === "number"),
    cell(landedText(h.shownAs, targetsOf(h.profiles, profiles))),
    cell(screensText(h, profiles)),
    cell(endedOf(h).label),
  ]);
  return [head.map((title) => cell(title)), ...rows].map((row) => row.join(",")).join("\r\n");
}
