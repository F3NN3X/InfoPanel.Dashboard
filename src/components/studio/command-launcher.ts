import type { Command } from "./commands";

/**
 * What the palette shows before anything is typed (uupm "search: show recents, group, shortcuts"): the last commands run,
 * the few actions people reach for, and the rail's pages. Settings and everything else appear once the user types.
 */
export const RECENT_COMMANDS_KEY = "studio.palette.recent";
export const RECENT_COMMANDS_MAX = 5;

const ACTIONS = ["save", "export", "import", "live"];
const GO_TO = ["manage-screens", "go:design", "theme", "go:library", "go:gauges", "go:alerts", "go:data", "settings:window"];

/** The stored ids (newest first); anything but an array of strings = none. */
export function parseRecentCommands(raw: string | null): string[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_COMMANDS_MAX) : [];
  } catch {
    return [];
  }
}

/** `id` moved to the front, without repeats, at most five. */
export const withRecentCommand = (list: readonly string[], id: string): string[] => [id, ...list.filter((x) => x !== id)].slice(0, RECENT_COMMANDS_MAX);

/** The empty query's list: Recent, Actions, Go to. A command in Recent is not repeated below; ids that do not exist now are skipped. */
export function launcherCommands(commands: readonly Command[], recent: readonly string[]): Command[] {
  const byId = new Map(commands.map((c) => [c.id, c]));
  const pick = (ids: readonly string[], group: string, skip: ReadonlySet<string> = new Set()): Command[] =>
    ids.flatMap((id) => {
      const c = byId.get(id);
      return c && !skip.has(id) ? [{ ...c, group }] : [];
    });
  const recents = pick(recent, "Recent");
  const taken = new Set(recents.map((c) => c.id));
  return [...recents, ...pick(ACTIONS, "Actions", taken), ...pick(GO_TO, "Go to", taken)];
}

/** "Go to setting: Series 1 color" … "Series 6 color": siblings that differ only by a number. */
const NUMBERED = /^(.*?)(\d+)(.*)$/;

/**
 * Settings that repeat with a number ("Series 1" to "Series 6") become one row, "Series 1–6", that goes to the first.
 * Only neighbours of one group and hint merge, so a result list keeps its order.
 */
export function collapseNumbered(commands: readonly Command[]): Command[] {
  const out: Command[] = [];
  let run: { first: Command; head: string; tail: string; last: string; n: number } | null = null;
  const flush = () => {
    if (run && run.n > 1) out.push({ ...run.first, label: `${run.head}${run.first.label.match(NUMBERED)?.[2]}–${run.last}${run.tail}` });
    else if (run) out.push(run.first);
    run = null;
  };
  for (const c of commands) {
    const m = c.id.includes("setting:") ? NUMBERED.exec(c.label) : null;
    if (m && run && run.first.group === c.group && run.first.hint === c.hint && run.head === m[1] && run.tail === m[3] && Number(m[2]) === Number(run.last) + 1) {
      run.last = m[2];
      run.n += 1;
      continue;
    }
    flush();
    if (m) run = { first: c, head: m[1], tail: m[3], last: m[2], n: 1 };
    else out.push(c);
  }
  flush();
  return out;
}
