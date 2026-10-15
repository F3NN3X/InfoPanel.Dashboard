import { describe, expect, it, vi } from "vitest";
import { codexPlan, createAgents, DONE_KEEP_MS, emptyAgents, expireAgents, projectOf, publicAgents, reduceAgents, reduceStatusline, STALE_MS } from "./agents.mjs";
import { agentWriteRefusal, isLoopback } from "./request-guard.mjs";

const ev = (hook_event_name, more = {}) => ({ hook_event_name, session_id: "s1", cwd: "E:\\GitHub\\MyRepos\\InfoPanel.Dashboard", transcript_path: "C:\\secret\\t.jsonl", prompt: "secret prompt", ...more });
const run = (events, agent = "claude") => events.reduce((s, [e, t]) => reduceAgents(s, agent, e, t), emptyAgents());
const only = (s) => Object.values(s.sessions)[0];

describe("agent sessions", () => {
  it("follows a turn: working with its tool, waiting for permission, done with its duration", () => {
    let s = run([[ev("SessionStart"), 0], [ev("UserPromptSubmit"), 1000], [ev("PreToolUse", { tool_name: "Bash", tool_input: { command: "rm -rf /" } }), 2000]]);
    expect(only(s)).toMatchObject({ agent: "claude", project: "InfoPanel.Dashboard", state: "working", tool: "Bash", since: 1000, turnStart: 1000 });
    s = reduceAgents(s, "claude", ev("PermissionRequest", { tool_name: "Edit" }), 3000);
    expect(only(s)).toMatchObject({ state: "waiting", tool: "Edit", since: 3000 });
    s = reduceAgents(s, "claude", ev("PostToolUse", { tool_name: "Edit" }), 4000);
    expect(only(s).state).toBe("working");
    s = reduceAgents(s, "claude", ev("Stop", { last_assistant_message: "secret reply" }), 61_000);
    expect(only(s)).toMatchObject({ state: "done", lastTurnMs: 60_000, turnStart: null, tool: "" });
  });

  it("waits on the notifications that need you, not on the others", () => {
    const base = run([[ev("UserPromptSubmit"), 0]]);
    expect(only(reduceAgents(base, "claude", ev("Notification", { notification_type: "idle_prompt" }), 5)).state).toBe("waiting");
    expect(only(reduceAgents(base, "claude", ev("Notification", { notification_type: "auth_success" }), 5)).state).toBe("working");
  });

  it("counts subagents, marks a failed stop and drops an ended session", () => {
    let s = run([[ev("UserPromptSubmit"), 0], [ev("SubagentStart"), 1], [ev("SubagentStart"), 2], [ev("SubagentStop"), 3]]);
    expect(only(s).subagents).toBe(1);
    expect(only(reduceAgents(s, "claude", ev("StopFailure"), 4)).state).toBe("error");
    expect(reduceAgents(s, "claude", ev("SessionEnd"), 5).sessions).toEqual({});
  });

  it("sets a Codex turn stopped by hand back to idle", () => {
    const s = run([[ev("UserPromptSubmit"), 0], [ev("Interrupt"), 5]], "codex");
    expect(only(s)).toMatchObject({ state: "idle", turnStart: null });
  });

  it("keeps Codex sessions apart from Claude ones and ignores junk", () => {
    let s = run([[ev("UserPromptSubmit"), 0]]);
    s = reduceAgents(s, "codex", ev("UserPromptSubmit", { cwd: "/home/me/proj" }), 1);
    expect(Object.values(s.sessions).map((x) => [x.agent, x.project])).toEqual([["claude", "InfoPanel.Dashboard"], ["codex", "proj"]]);
    expect(reduceAgents(s, "gemini", ev("Stop"), 2)).toBe(s);
    expect(reduceAgents(s, "claude", null, 2)).toBe(s);
    expect(reduceAgents(s, "claude", { hook_event_name: "Stop" }, 2)).toBe(s);
  });

  it("sends the kiosks no prompt, reply, tool input, path or session id", () => {
    const s = run([[ev("UserPromptSubmit"), 0], [ev("PreToolUse", { tool_name: "Bash", tool_input: { command: "cat ~/.ssh/id_rsa" } }), 1], [ev("Stop", { last_assistant_message: "secret reply" }), 2]]);
    const out = JSON.stringify(publicAgents(s));
    for (const secret of ["secret", "ssh", "E:\\\\", "C:\\\\", "s1", "transcript"]) expect(out).not.toContain(secret);
    expect(publicAgents(s).sessions[0].key).toMatch(/^[0-9a-f]{12}$/);
  });

  it("expires quiet sessions: working ones after STALE_MS, finished ones after DONE_KEEP_MS", () => {
    const working = run([[ev("UserPromptSubmit"), 0]]);
    expect(expireAgents(working, STALE_MS - 1)).toBe(working);
    expect(expireAgents(working, STALE_MS).sessions).toEqual({});
    const done = run([[ev("Stop"), 0]]);
    expect(expireAgents(done, DONE_KEEP_MS).sessions).toEqual({});
  });

  it("names the project from either slash and never sends the path", () => {
    expect(projectOf("C:\\Users\\me\\repo\\")).toBe("repo");
    expect(projectOf("/srv/app")).toBe("app");
    expect(projectOf(42)).toBe("");
  });
});

describe("plan and context", () => {
  it("reads Claude's rate limits, context and cost from the statusline", () => {
    let s = run([[ev("UserPromptSubmit"), 0]]);
    s = reduceStatusline(s, { session_id: "s1", model: { display_name: "Opus" }, rate_limits: { five_hour: { used_percentage: 82, resets_at: 1_760_000_000 }, seven_day: { used_percentage: 40 } }, context_window: { used_percentage: 37 }, cost: { total_cost_usd: 1.25 } }, 9);
    expect(s.plan.claude).toEqual({ fiveHour: { used: 82, resetsAt: 1_760_000_000_000 }, sevenDay: { used: 40 }, at: 9 });
    expect(only(s)).toMatchObject({ context: 37, cost: 1.25, model: "Opus" });
    // Without rate limits (not a subscription, or before the first reply) the plan stays as it was.
    expect(reduceStatusline(s, { session_id: "s1" }, 10).plan).toBe(s.plan);
  });

  it("reads Codex's primary and secondary windows", () => {
    const s = codexPlan(emptyAgents(), { primary: { used_percent: 12.5, window_minutes: 300, resets_at: 1_760_000_000 }, secondary: { used_percent: 3, window_minutes: 10080 } }, 5);
    expect(s.plan.codex).toEqual({ fiveHour: { used: 12.5, resetsAt: 1_760_000_000_000 }, sevenDay: { used: 3 }, at: 5 });
    // A free plan's only window is the weekly one, reported as primary.
    expect(codexPlan(emptyAgents(), { primary: { used_percent: 3, window_minutes: 10080 }, secondary: null }, 5).plan.codex).toEqual({ sevenDay: { used: 3 }, at: 5 });
    expect(codexPlan(emptyAgents(), null, 5).plan).toEqual({});
  });
});

describe("createAgents", () => {
  it("publishes once for a burst of events", async () => {
    vi.useFakeTimers();
    try {
      const onChange = vi.fn();
      const agents = createAgents({ onChange, now: () => 0, throttleMs: 100 });
      agents.event("claude", ev("UserPromptSubmit"));
      agents.event("claude", ev("PreToolUse", { tool_name: "Read" }));
      agents.statusline({ session_id: "s1", context_window: { used_percentage: 5 } });
      expect(onChange).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(100);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(agents.state().sessions[0]).toMatchObject({ state: "working", tool: "Read", context: 5 });
      agents.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("agent write guard", () => {
  const ok = { "content-type": "application/json", "x-agent-event": "1" };
  it("takes JSON with the header from this machine only", () => {
    expect(agentWriteRefusal(ok, "127.0.0.1")).toBeNull();
    expect(agentWriteRefusal(ok, "::ffff:127.0.0.1")).toBeNull();
    expect(agentWriteRefusal(ok, "::1")).toBeNull();
    expect(agentWriteRefusal(ok, "192.168.1.20")?.status).toBe(403);
    expect(agentWriteRefusal({ ...ok, "x-agent-event": undefined }, "127.0.0.1")?.status).toBe(403);
    expect(agentWriteRefusal({ ...ok, "content-type": "text/plain" }, "127.0.0.1")?.status).toBe(415);
    expect(isLoopback(undefined)).toBe(false);
  });
});
