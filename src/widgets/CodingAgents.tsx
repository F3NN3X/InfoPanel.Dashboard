import { useSyncExternalStore } from "react";
import { AGENT_COLORS, AGENT_IDS, AGENT_NAMES, bySalience, sessionStatus, shortTokens, type AgentId, type AgentSession, type Agents } from "@/lib/agents";
import { extras } from "@/lib/extras";
import { useNow } from "@/components/widgets/hooks";
import { Empty, Widget, fitRows, shell, type ShellProps, type WidgetMeta } from "./kit";
import { BarLimits, RingLimits, barDensity, densityH, ringLayout, type Density, type LimitStyle, type Percent, type PlanEntry, type RingLayout } from "./CodingAgents/limits";
import { BARS_H, DailyBars, HEADER_H, Heatmap, HistoryHeader, dayKey, heatmapFit, heatmapWeeks, type HeatFit, type HistoryStyle } from "./CodingAgents/history";

export { resetText } from "./CodingAgents/limits";

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
  /** The limits as bars (default) or rings. */
  limitStyle?: LimitStyle;
  /** The limits as used (default) or left. */
  percent?: Percent;
  /** Tokens per day as bars (default) or a weekday heatmap. */
  history?: HistoryStyle;
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

const GAP = 12;
const SESSION_H = 18;

type LimitsFit = { kind: "rings"; layout: RingLayout } | { kind: "bars"; density: Density; h: number };
/** The limits in `w` × `room`: rings when asked and big enough, else the roomiest bars. */
function fitLimits(style: LimitStyle, n: number, w: number, room: number): LimitsFit | null {
  const rings = style === "rings" ? ringLayout(n, w, room) : null;
  if (rings) return { kind: "rings", layout: rings };
  const density = barDensity(n, room);
  return density ? { kind: "bars", density, h: densityH(density, n) } : null;
}
const limitsH = (f: LimitsFit) => (f.kind === "rings" ? f.layout.h : f.h);

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
  const limitStyle = p.limitStyle ?? "bars";
  const percent = p.percent ?? "used";
  const history = p.history ?? "bars";
  const plans: PlanEntry[] = ids.flatMap((id) => (all.plan[id] ? [[id, all.plan[id]] as const] : []));
  const active = sessions.filter((s) => s.state === "working" || s.state === "waiting");
  const today = ids.reduce((sum, id) => sum + (all.usage[id]?.today ?? 0), 0);
  // The daily totals of the shown agents, added up by day.
  const byDay = new Map<string, number>();
  for (const id of ids) for (const d of all.usage[id]?.days ?? []) byDay.set(d.day, (byDay.get(d.day) ?? 0) + d.total);
  const daily = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const weeks = heatmapWeeks(byDay, new Date(now));
  const week = weeks[weeks.length - 1].reduce((sum, c) => sum + c.v, 0);
  const todayKey = dayKey(new Date(now));
  const color = AGENT_COLORS[ids[0] ?? "claude"];
  const waiting = sessions.filter((s) => s.state === "waiting").length;
  const headline = waiting ? `${waiting} waiting` : active.length ? `${active.length} working` : "idle";
  const top = plans[0]?.[1].fiveHour;
  const shownPct = (used: number) => Math.round(percent === "left" ? 100 - used : used);

  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Coding agents"}
      icon="smart_toy"
      studio={{ label: "Agents", value: String(active.length), unit: "active", sub: `${shortTokens(today)} tokens today`, rows: sessions.slice(0, 4).map((s) => ({ n: s.project, v: sessionStatus(s, now), dot: true })) }}
      compact={{ label: "Agents", value: top ? `${shownPct(top.used)}%` : String(active.length), unit: top ? `5h ${percent}` : "active", sub: headline, icon: "smart_toy" }}
    >
      {({ w: w0, h: h0 }) => {
        // An unmeasured box (0, server render) lays out as a roomy one.
        const w = w0 || 400;
        const h = h0 || 300;
        if (ids.length === 0) return <Empty icon="smart_toy" label="No agent connected yet" />;
        const hasHistory = showUsage && byDay.size > 0;
        const n = showPlan ? plans.length : 0;

        // A wide box puts the heatmap in a column of its own on the right.
        let side: HeatFit | null = null;
        if (hasHistory && history === "heatmap" && w >= 400 && w >= h * 1.4) {
          const fit = heatmapFit(weeks.length, w * 0.45, h - 2 * HEADER_H - 12, 22);
          if (fit && w - Math.max(fit.w, 150) - 2 * GAP >= 200) side = fit;
        }
        const mainW = side ? w - Math.max(side.w, 150) - 2 * GAP : w;
        const wide = mainW >= 220;
        // A wide, short box lists the sessions beside the limits instead of under them.
        const split = n > 0 && showSessions && sessions.length > 0 && mainW >= 460 && mainW >= h * 1.8;
        const limitsW = split ? Math.round(Math.min(mainW * 0.5, 420)) : mainW;

        // Under the rest: the heatmap when it fits in half the height, else the daily bars.
        let bottom: { fit: HeatFit | null; h: number } | null = null;
        if (hasHistory && !side) {
          const fit = history === "heatmap" ? heatmapFit(weeks.length, w, Math.min(h / 2 - HEADER_H - 6, 7 * 12 + 12), 12) : null;
          bottom = fit ? { fit, h: HEADER_H + 6 + fit.h } : { fit: null, h: BARS_H };
        }

        // The limits come first: they drop the history, then the sessions' reserve, before they drop themselves.
        const sessionsMin = showSessions && !split ? SESSION_H : 0;
        let limits: LimitsFit | null = null;
        if (n > 0) {
          for (const [hist, sess] of [
            [bottom, sessionsMin],
            [bottom, 0],
            [null, 0],
          ] as const) {
            let room = h - (hist ? hist.h + GAP : 0) - (sess ? sess + GAP : 0);
            // Rings stop at 60 % of the height while there are sessions to list.
            if (limitStyle === "rings" && sess) room = Math.min(room, h * 0.6);
            limits = fitLimits(limitStyle, n, limitsW, room);
            if (limits) {
              bottom = hist;
              break;
            }
          }
        }
        if (bottom && h - (limits ? limitsH(limits) + GAP : 0) < bottom.h) bottom = null;
        const room = h - (limits && !split ? limitsH(limits) + GAP : 0) - (bottom ? bottom.h + GAP : 0);
        const rows = showSessions && room >= SESSION_H ? Math.min(sessions.length, fitRows(room, SESSION_H, 8)) : 0;
        const sessionsW = split ? mainW - limitsW - 2 * GAP : mainW;

        const limitsEl =
          limits?.kind === "rings" ? (
            <RingLimits plans={plans} layout={limits.layout} percent={percent} now={now} />
          ) : limits?.kind === "bars" ? (
            <BarLimits plans={plans} density={limits.density} percent={percent} now={now} wide={limitsW >= 220} />
          ) : null;
        const sessionsEl =
          showSessions &&
          (rows > 0 && sessions.length > 0 ? (
            <ul className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden" style={split ? { flex: 1 } : undefined}>
              {sessions.slice(0, rows).map((s) => (
                <SessionRow key={s.key} s={s} now={now} wide={sessionsW >= 220} />
              ))}
            </ul>
          ) : (
            sessions.length === 0 && room >= SESSION_H && <div className="truncate text-xs text-[color:var(--w-faint)]">No sessions running</div>
          ));

        const main = (
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col" style={{ gap: GAP }}>
            {split ? (
              <div className="flex min-h-0 min-w-0 items-start" style={{ gap: 2 * GAP }}>
                <div className="shrink-0" style={{ width: limitsW }}>
                  {limitsEl}
                </div>
                {sessionsEl}
              </div>
            ) : (
              <>
                {limitsEl}
                {sessionsEl}
              </>
            )}
            {bottom && (
              <div className="mt-auto flex shrink-0 flex-col gap-1.5">
                <HistoryHeader today={today} week={week} wide={wide} />
                {bottom.fit ? <Heatmap weeks={weeks} fit={bottom.fit} color={color} todayKey={todayKey} /> : <DailyBars values={daily} color={color} />}
              </div>
            )}
          </div>
        );
        if (!side) return main;
        return (
          <div className="flex h-full min-h-0" style={{ gap: 2 * GAP }}>
            {main}
            <div className="flex shrink-0 flex-col gap-1.5" style={{ width: Math.max(side.w, 150) }}>
              <HistoryHeader today={today} week={week} wide={false} />
              <Heatmap weeks={weeks} fit={side} color={color} todayKey={todayKey} />
              <span className="truncate text-[10.5px] tabular-nums text-[color:var(--w-faint)]" style={{ height: HEADER_H }}>
                <span className="text-[color:var(--w-muted)]">{shortTokens(week)}</span> this week
              </span>
            </div>
          </div>
        );
      }}
    </Widget>
  );
}
