import { useSyncExternalStore } from "react";
import {
  AGENT_COLORS,
  AGENT_IDS,
  AGENT_NAMES,
  bySalience,
  sessionStatus,
  shortTokens,
  type AgentId,
  type AgentPlan,
  type AgentSession,
  type Agents,
  type PlanWindow,
} from "@/lib/agents";
import { extras } from "@/lib/extras";
import { useNow } from "@/components/widgets/hooks";
import { Bar, Empty, Spark, Widget, fitRows, shell, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "CodingAgents",
  name: "Coding Agents",
  category: "System",
  icon: "smart_toy",
  prefixes: [],
  defaultSize: [3, 3],
  minSize: [1, 1],
  description:
    "Claude Code and Codex: each session working, waiting for you or done, the plan's 5-hour and weekly use, and tokens per day. Connect them once with node tools/agent-install.mjs.",
};

export type AgentFilter = "both" | AgentId;

export interface CodingAgentsProps extends ShellProps {
  /** Which agents to show; default both. */
  agents?: AgentFilter;
  /** The plan's 5-hour and weekly use; default on. */
  showPlan?: boolean;
  /** The sessions list; default on. */
  showSessions?: boolean;
  /** Tokens today and the daily graph; default on. */
  showUsage?: boolean;
}

/** The state's dot colour: the agent's own while it works or is done, amber while it waits, red on an error. */
const STATE_COLOR = { waiting: "#f59e0b", error: "#ef4444", idle: "var(--w-faint)" } as const;
const dotColor = (s: AgentSession) => (s.state === "waiting" || s.state === "error" || s.state === "idle" ? STATE_COLOR[s.state] : AGENT_COLORS[s.agent]);

const useAgents = (): Agents => useSyncExternalStore(extras.subscribe, () => extras.getState().agents, () => extras.getState().agents);

/** The agents the widget shows, with what each has to show. */
export function shownAgents(a: Agents, filter: AgentFilter): AgentId[] {
  const ids = filter === "both" ? AGENT_IDS : [filter];
  return ids.filter((id) => a.plan[id] || a.usage[id] || a.sessions.some((s) => s.agent === id));
}

/** "15:00" for a reset later today, "Fri 15:00" further out. */
export function resetText(at: number, now: number): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return at - now < 20 * 3_600_000 ? time : `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
}

/** A plan window's tone: amber past 80 %, red past 95 %. */
const toneOf = (w: PlanWindow) => (w.used >= 95 ? "crit" : w.used >= 80 ? "warn" : "ok");

function PlanRow({ id, plan, now, wide }: { id: AgentId; plan: AgentPlan; now: number; wide: boolean }) {
  const windows = [
    ["5h", plan.fiveHour],
    ["7d", plan.sevenDay],
  ] as const;
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <span className="shrink-0 font-semibold" style={{ color: AGENT_COLORS[id] }}>
        {AGENT_NAMES[id]}
      </span>
      {windows.map(([label, w]) =>
        w ? (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 items-baseline justify-between gap-1 text-[10.5px] text-[color:var(--w-muted)]">
              <span className="truncate">
                {label} <span className="tabular-nums text-[color:var(--w-fg)]">{Math.round(w.used)}%</span>
              </span>
              {wide && w.resetsAt !== undefined && <span className="shrink-0 truncate tabular-nums text-[color:var(--w-faint)]">{resetText(w.resetsAt, now)}</span>}
            </div>
            <Bar value={w.used} t={toneOf(w)} className="h-1" />
          </div>
        ) : null
      )}
    </div>
  );
}

function SessionRow({ s, now, wide }: { s: AgentSession; now: number; wide: boolean }) {
  const color = dotColor(s);
  return (
    <li className="flex min-w-0 items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${s.state === "working" ? "island-pulse" : ""}`}
        style={{ background: color, "--island-dot": color } as React.CSSProperties}
        aria-label={s.state}
      />
      <span className="max-w-[45%] shrink-0 truncate text-[color:var(--w-fg)]">{s.project || AGENT_NAMES[s.agent]}</span>
      <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: s.state === "waiting" ? STATE_COLOR.waiting : "var(--w-muted)" }}>
        {sessionStatus(s, now)}
      </span>
      {wide && s.context !== undefined && <span className="shrink-0 tabular-nums text-[10.5px] text-[color:var(--w-faint)]">{Math.round(s.context)}% ctx</span>}
    </li>
  );
}

export default function CodingAgents(p: CodingAgentsProps) {
  return <CodingAgentsView {...p} all={useAgents()} />;
}

/** The widget over a given agents state (the default export reads the live one). */
export function CodingAgentsView({ all, ...p }: CodingAgentsProps & { all: Agents }) {
  const now = useNow(5000).getTime();
  const filter = p.agents ?? "both";
  const ids = shownAgents(all, filter);
  const sessions = all.sessions.filter((s) => ids.includes(s.agent)).sort(bySalience);
  const showPlan = p.showPlan ?? true;
  const showSessions = p.showSessions ?? true;
  const showUsage = p.showUsage ?? true;
  const plans = ids.flatMap((id) => (all.plan[id] ? [[id, all.plan[id]] as const] : []));
  const active = sessions.filter((s) => s.state === "working" || s.state === "waiting");
  const today = ids.reduce((sum, id) => sum + (all.usage[id]?.today ?? 0), 0);
  // The daily totals of the shown agents, added up by day.
  const byDay = new Map<string, number>();
  for (const id of ids) for (const d of all.usage[id]?.days ?? []) byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.total);
  const daily = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const waiting = sessions.filter((s) => s.state === "waiting").length;
  const headline = waiting ? `${waiting} waiting` : active.length ? `${active.length} working` : "idle";
  const top = plans[0]?.[1].fiveHour;

  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Coding agents"}
      icon="smart_toy"
      studio={{ label: "Agents", value: String(active.length), unit: "active", sub: `${shortTokens(today)} tokens today`, rows: sessions.slice(0, 4).map((s) => ({ n: s.project, v: sessionStatus(s, now), dot: true })) }}
      compact={{ label: "Agents", value: top ? `${Math.round(top.used)}%` : String(active.length), unit: top ? "5h" : "active", sub: headline, icon: "smart_toy" }}
    >
      {({ w: w0, h: h0 }) => {
        // An unmeasured box (0, server render) lays out as a roomy one.
        const w = w0 || 400;
        const h = h0 || 300;
        if (ids.length === 0) return <Empty icon="smart_toy" label="No agent connected yet" />;
        const wide = w >= 220;
        let room = h;
        const planH = showPlan ? plans.length * 30 + Math.max(0, plans.length - 1) * 8 : 0;
        const plansShown = showPlan && room >= planH ? plans : [];
        room -= plansShown.length ? planH + 12 : 0;
        const usageShown = showUsage && daily.length > 0 && room >= 52;
        room -= usageShown ? 52 + 12 : 0;
        const rows = showSessions && room >= 18 ? Math.min(sessions.length, fitRows(room, 18, 8)) : 0;
        return (
          <div className="flex h-full min-h-0 flex-col gap-3">
            {plansShown.length > 0 && (
              <div className="flex shrink-0 flex-col gap-2">
                {plansShown.map(([id, plan]) => (
                  <PlanRow key={id} id={id} plan={plan} now={now} wide={wide} />
                ))}
              </div>
            )}
            {showSessions &&
              (rows > 0 && sessions.length > 0 ? (
                <ul className="flex min-h-0 flex-col gap-2 overflow-hidden">
                  {sessions.slice(0, rows).map((s) => (
                    <SessionRow key={s.key} s={s} now={now} wide={wide} />
                  ))}
                </ul>
              ) : (
                sessions.length === 0 && room >= 18 && <div className="truncate text-xs text-[color:var(--w-faint)]">No sessions running</div>
              ))}
            {usageShown && (
              <div className="mt-auto flex shrink-0 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-[11px] text-[color:var(--w-muted)]">
                  <span className="truncate">
                    Today <span className="tabular-nums text-[color:var(--w-fg)]">{shortTokens(today)}</span> tokens
                  </span>
                  {wide && <span className="shrink-0 tabular-nums text-[color:var(--w-faint)]">{daily.length} d</span>}
                </div>
                {/* One bar per day: a count, not a stream (the smooth graph eases in like a live one). */}
                <Spark values={daily} min={0} graph="bars" className="h-8" color={AGENT_COLORS[ids[0]]} />
              </div>
            )}
          </div>
        );
      }}
    </Widget>
  );
}
