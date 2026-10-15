import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLAUDE_EVENTS, CODEX_EVENTS, installClaude, installCodex, removeClaude, removeCodex, unwrapStatusline } from "../tools/agent-install.mjs";

const FWD = 'node "E:/repo/tools/agent-status.mjs"';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

describe("agent install", () => {
  const mine = { hooks: { Stop: [{ hooks: [{ type: "command", command: "my-stop.sh" }] }] }, statusLine: { type: "command", command: 'node "C:/Users/me/.claude/statusline.mjs"', padding: 1 }, model: "opus" };

  it("adds a hook per event beside the user's own and wraps their statusline", () => {
    const next = installClaude(mine, FWD);
    expect(Object.keys(next.hooks).sort()).toEqual([...CLAUDE_EVENTS].sort());
    expect(next.hooks.Stop).toHaveLength(2);
    expect(next.hooks.Stop[0]).toEqual(mine.hooks.Stop[0]);
    expect(next.hooks.Stop[1].hooks[0]).toEqual({ type: "command", command: `${FWD} hook claude`, timeout: 5, async: true });
    expect(next.statusLine.padding).toBe(1);
    expect(next.statusLine.command).toMatch(/^node ".*agent-status\.mjs" statusline --wrap=/);
    expect(unwrapStatusline(next.statusLine.command)).toBe(mine.statusLine.command);
    expect(next.model).toBe("opus");
  });

  it("is idempotent and fully reversible", () => {
    const once = installClaude(mine, FWD);
    expect(installClaude(once, FWD)).toEqual(once);
    expect(removeClaude(once)).toEqual(mine);
    // A statusline we added (none before) goes away again.
    const bare = installClaude({}, FWD);
    expect(bare.statusLine.command).toBe(`${FWD} statusline`);
    expect(removeClaude(bare)).toEqual({});
  });

  it("does the same for Codex's hooks.json", () => {
    const file = { hooks: { Stop: [{ hooks: [{ type: "command", command: "x" }] }] } };
    const next = installCodex(file, FWD);
    expect(Object.keys(next.hooks).sort()).toEqual([...CODEX_EVENTS].sort());
    expect(next.hooks.Interrupt[0].hooks[0].command).toBe(`${FWD} hook codex`);
    expect(removeCodex(next)).toEqual(file);
    expect(removeCodex(installCodex({}, FWD))).toEqual({});
  });
});

describe("agent-status forwarder", () => {
  it("posts a hook's stdin with the header, prints nothing and exits 0, also with no server", async () => {
    const got = [];
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        got.push({ url: req.url, header: req.headers["x-agent-event"], body });
        res.writeHead(204).end();
      });
    });
    await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
    const url = `http://127.0.0.1:${server.address().port}`;
    // Async, so this process's server can answer while the forwarder runs.
    const run = (args, input, env) =>
      new Promise((ok) => {
        const child = spawn(process.execPath, [path.join(root, "tools", "agent-status.mjs"), ...args], { env: { ...process.env, ...env } });
        let stdout = "";
        child.stdout.on("data", (c) => (stdout += c));
        child.on("close", (status) => ok({ status, stdout }));
        child.stdin.end(input);
      });
    try {
      const hook = await run(["hook", "codex"], '{"hook_event_name":"Stop","session_id":"x"}', { DASHBOARD_URL: url });
      expect(hook.status).toBe(0);
      expect(hook.stdout).toBe("");
      // The wrapped statusline still prints its own line.
      const wrapped = Buffer.from(`"${process.execPath}" -e "process.stdin.pipe(process.stdout)"`).toString("base64url");
      const line = await run(["statusline", `--wrap=${wrapped}`], '{"session_id":"x"}', { DASHBOARD_URL: url });
      expect(line.status).toBe(0);
      expect(line.stdout).toBe('{"session_id":"x"}');
    } finally {
      server.close();
    }
    expect(got).toEqual([
      { url: "/api/agents/event?agent=codex", header: "1", body: '{"hook_event_name":"Stop","session_id":"x"}' },
      { url: "/api/agents/statusline", header: "1", body: '{"session_id":"x"}' },
    ]);
    const offline = spawnSync(process.execPath, [path.join(root, "tools", "agent-status.mjs"), "hook", "claude"], { input: "{}", encoding: "utf8", env: { ...process.env, DASHBOARD_URL: "http://127.0.0.1:9" } });
    expect(offline.status).toBe(0);
  });
});
