import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { claudeLine, codexLine, createAgentUsage, dayKey } from "./agent-usage.mjs";

const assistant = (requestId, timestamp, usage) =>
  JSON.stringify({ type: "assistant", requestId, timestamp, message: { model: "m", content: [{ type: "text", text: "secret" }], usage } });
const tokenCount = (timestamp, total, rate_limits = null) =>
  JSON.stringify({ timestamp, type: "event_msg", payload: { type: "token_count", info: total ? { total_token_usage: total } : null, rate_limits } });

describe("transcript lines", () => {
  it("reads an assistant line's tokens and request id, and skips everything else", () => {
    const u = claudeLine(assistant("r1", "2026-10-15T10:00:00Z", { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 20 }));
    expect(u).toEqual({ id: "r1", at: Date.parse("2026-10-15T10:00:00Z"), input: 10, output: 5, cacheRead: 100, cacheWrite: 20 });
    expect(claudeLine(JSON.stringify({ type: "user", timestamp: "2026-10-15T10:00:00Z", message: { content: "hi" } }))).toBeNull();
    expect(claudeLine("{not json")).toBeNull();
  });

  it("reads a Codex token count's cumulative tokens (cached split out) and its limits", () => {
    const c = codexLine(tokenCount("2026-10-15T10:00:00Z", { input_tokens: 100, cached_input_tokens: 60, output_tokens: 7, total_tokens: 107 }, { primary: { used_percent: 3 } }));
    expect(c).toEqual({ at: Date.parse("2026-10-15T10:00:00Z"), total: { input: 40, output: 7, cacheRead: 60, cacheWrite: 0 }, limits: { primary: { used_percent: 3 } } });
    expect(codexLine(JSON.stringify({ type: "event_msg", payload: { type: "agent_message" } }))).toBeNull();
  });
});

describe("createAgentUsage", () => {
  let home;
  afterEach(() => home && fs.rmSync(home, { recursive: true, force: true }));

  it("sums tokens per day across sessions, counts a repeated request once, and reads appended lines only", async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-usage-"));
    const now = Date.parse("2026-10-15T12:00:00");
    const today = new Date(now).toISOString();
    const yesterday = new Date(now - 86_400_000).toISOString();
    const dir = path.join(home, ".claude", "projects", "E--repo");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "s1.jsonl");
    const u = { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 };
    fs.writeFileSync(file, [assistant("a", yesterday, u), assistant("b", today, u), assistant("b", today, u), ""].join("\n"));
    const codexDir = path.join(home, ".codex", "sessions", "2026", "10", "15");
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(
      path.join(codexDir, "rollout-1.jsonl"),
      [tokenCount(today, { input_tokens: 10, output_tokens: 1 }), tokenCount(today, { input_tokens: 30, output_tokens: 4 }, { primary: { used_percent: 9, window_minutes: 300 } }), ""].join("\n")
    );

    const usage = createAgentUsage({ home, now: () => now });
    await usage.scan();
    expect(usage.totals().claude).toEqual({
      today: 10,
      history: 20,
      days: [
        { day: dayKey(now - 86_400_000), input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 },
        { day: dayKey(now), input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 },
      ],
    });
    // Codex's totals are cumulative: the day gets the last one (30 + 4), not their sum.
    expect(usage.totals().codex?.today).toBe(34);
    expect(usage.codexLimits()).toEqual({ primary: { used_percent: 9, window_minutes: 300 } });

    // A line appended later counts; one without its newline yet waits.
    fs.appendFileSync(file, assistant("c", today, u) + "\n" + assistant("d", today, u));
    await usage.scan();
    expect(usage.totals().claude?.today).toBe(20);
  });

  it("is empty without any agent folders", async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "agent-usage-"));
    const usage = createAgentUsage({ home });
    await usage.scan();
    expect(usage.totals()).toEqual({});
    expect(usage.codexLimits()).toBeNull();
  });
});
