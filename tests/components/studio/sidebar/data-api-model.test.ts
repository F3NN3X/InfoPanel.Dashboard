// The wording of the Data API card and popover (rules section 5, B4).
import { describe, expect, it } from "vitest";
import { attentionItems, cardLine, chipNote, dropText, serverLine, showsLive, sourceTone, spanText } from "@/components/studio/sidebar/data-api-model";

describe("showsLive", () => {
  it("keeps the table live in the grace, while the last values are held, and not once offline (L3)", () => {
    expect([showsLive("connected"), showsLive("reconnecting"), showsLive("offline")]).toEqual([true, true, false]);
  });
});

describe("spanText", () => {
  it.each([[0, "0 s"], [3400, "3 s"], [59_000, "59 s"], [120_000, "2 min"], [3_600_000, "1 h"]])("%d ms reads %s", (ms, text) => {
    expect(spanText(ms)).toBe(text);
  });
});

describe("cardLine", () => {
  it("keeps slow a connected state with its latency (Q8)", () => {
    expect(cardLine("slow", 640, 0)).toBe("Connected · 640 ms");
    expect(cardLine("connected", undefined, 0)).toBe("Connected");
  });

  it("counts the drop, with no try counter", () => {
    expect(cardLine("reconnecting", null, 3000)).toBe("Reconnecting · 3 s");
    expect(cardLine("offline", null, 120_000)).toBe("Offline · 2 min");
  });
});

describe("dropText", () => {
  const NOW = 1_000_000;
  it("reads None, now, and an age with how long it lasted", () => {
    expect(dropText(null, NOW)).toBe("None");
    expect(dropText({ at: NOW - 1000, backAfterMs: null }, NOW)).toBe("now");
    expect(dropText({ at: NOW - 240_000, backAfterMs: 1200 }, NOW)).toBe("4 min ago · back in 1.2 s");
  });
});

describe("chipNote", () => {
  it("names the moment it went offline, whenever the panel happens to render", () => {
    const health = { link: "offline" as const, downMs: 60_000, downSince: 1_000_000, lastDrop: null };
    expect(chipNote(health, [], 1_060_000)).toBe(chipNote(health, [], 1_089_000));
  });

  it("says how many sources are healthy, whatever the mix", () => {
    const sources = [{ status: "ok" as const }, { status: "ok" as const }, { status: "off" as const }];
    expect(chipNote({ link: "connected", downMs: 0, downSince: null, lastDrop: null }, sources.slice(0, 2), 0)).toBe("2 sources healthy");
    expect(chipNote({ link: "connected", downMs: 0, downSince: null, lastDrop: null }, sources, 0)).toBe("2 of 3 sources healthy");
  });

  it("says how long a drop lasts", () => {
    expect(chipNote({ link: "reconnecting", downMs: 3000, downSince: null, lastDrop: null }, [], 0)).toBe("3 s");
    expect(chipNote({ link: "offline", downMs: 60_000, downSince: null, lastDrop: null }, [], new Date(2026, 0, 15, 12, 5).getTime())).toBe("since 12:04");
  });
});

describe("sourceTone", () => {
  it("is the source's health while connected, amber in the grace, grey offline", () => {
    expect([sourceTone("connected", "ok"), sourceTone("slow", "warn"), sourceTone("connected", "off")]).toEqual(["ok", "warn", "neutral"]);
    expect(sourceTone("reconnecting", "ok")).toBe("warn");
    expect(sourceTone("offline", "ok")).toBe("neutral");
  });
});

describe("serverLine", () => {
  it("names the address and the LAN flag, or the phase", () => {
    expect(serverLine({ kind: "desktop", port: 47911, lan: true }, "")).toBe("127.0.0.1:47911 · LAN");
    expect(serverLine({ kind: "desktop", port: 47911, phase: "restarting" }, "")).toBe("restarting");
    expect(serverLine({ kind: "browser", host: "pc" }, "pc:47911")).toBe("pc:47911");
  });
});

describe("attentionItems", () => {
  const base = { restartNeeded: false, save: "saved" as const };
  const ids = (s: Parameters<typeof attentionItems>[0]) => attentionItems(s, () => {}).map((i) => i.id);

  it("is empty when a running server has nothing to say", () => {
    expect(ids({ ...base, server: { kind: "desktop", port: 1, phase: "running" } })).toEqual([]);
    expect(ids({ ...base, server: { kind: "browser", host: "pc" } })).toEqual([]);
  });

  it("lists an update only on the desktop, as the footer did", () => {
    expect(ids({ ...base, update: "2.0", server: { kind: "browser", host: "pc" } })).toEqual([]);
    expect(ids({ ...base, update: "2.0", server: { kind: "desktop", port: 1 } })).toEqual(["update"]);
  });

  it("lists a restart, a server that is not running and edits it has not got", () => {
    expect(ids({ restartNeeded: true, save: "offline", server: { kind: "desktop", port: 1, phase: "starting" } })).toEqual(["restart", "server", "offline"]);
  });
});
