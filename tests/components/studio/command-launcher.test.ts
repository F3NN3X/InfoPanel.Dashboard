import { describe, expect, it } from "vitest";
import { collapseNumbered, launcherCommands, parseRecentCommands, withRecentCommand } from "@/components/studio/command-launcher";
import type { Command } from "@/components/studio/commands";

const cmd = (id: string, label = id, group = "General", hint?: string): Command => ({ id, label, group, hint, action: { type: "save" } });

describe("the palette's empty-query launcher", () => {
  const all = [cmd("save"), cmd("export"), cmd("go:data"), cmd("go:design"), cmd("theme-setting:colors:series1", "Series 1", "Theme")];

  it("lists Recent, then Actions, then Go to, without repeating a recent command", () => {
    const list = launcherCommands(all, ["go:data", "gone"]);
    expect(list.map((c) => `${c.group}:${c.id}`)).toEqual(["Recent:go:data", "Actions:save", "Actions:export", "Go to:go:design"]);
  });

  it("never offers the settings until the user types", () => {
    expect(launcherCommands(all, []).some((c) => c.id.startsWith("theme-setting"))).toBe(false);
  });

  it("keeps the last five runs, newest first, and reads a bad store as none", () => {
    expect(["a", "b", "c", "d", "e", "f"].reduce(withRecentCommand, [] as string[])).toEqual(["f", "e", "d", "c", "b"]);
    expect(withRecentCommand(["a", "b"], "b")).toEqual(["b", "a"]);
    expect(parseRecentCommands("{not json")).toEqual([]);
    expect(parseRecentCommands('["a",1,"b"]')).toEqual(["a", "b"]);
  });
});

describe("collapseNumbered", () => {
  const series = (n: number) => cmd(`theme-setting:colors:series${n}`, `Series ${n} color`, "Theme", "Theme › Status & series colors");

  it("merges neighbouring settings that differ by a number into one row that goes to the first", () => {
    const out = collapseNumbered([cmd("x"), series(1), series(2), series(3), cmd("y")]);
    expect(out.map((c) => c.label)).toEqual(["x", "Series 1–3 color", "y"]);
    expect(out[1].id).toBe("theme-setting:colors:series1");
  });

  it("leaves a single numbered setting and other commands alone", () => {
    const one = series(4);
    expect(collapseNumbered([one, cmd("page:go:2", "Go to page: 2")])).toEqual([one, cmd("page:go:2", "Go to page: 2")]);
  });
});
