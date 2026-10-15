import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Agents } from "@/lib/agents";
import { CodingAgentsView } from "../CodingAgents";
import { dayKey, heatmapFit, heatmapWeeks, levelOf } from "./history";
import { barDensity, resetIn, ringLayout, shown } from "./limits";

const text = (el: Parameters<typeof renderToString>[0]) => renderToString(el).replace(/<!-- -->/g, "");

describe("Coding Agents limits", () => {
  it("counts down to a reset in minutes, hours, then days", () => {
    expect(resetIn(8 * 60_000)).toBe("8m");
    expect(resetIn(4.5 * 3_600_000)).toBe("4h 30m");
    expect(resetIn(54 * 3_600_000)).toBe("2d 6h");
    expect(resetIn(48 * 3_600_000)).toBe("2d");
  });

  it("reads a window as used or left", () => {
    expect(shown({ used: 32.4 }, "used")).toBe(32);
    expect(shown({ used: 32.4 }, "left")).toBe(68);
  });

  it("picks the roomiest bar layout that fits", () => {
    expect(barDensity(2, 400)).toBe("full");
    expect(barDensity(2, 100)).toBe("row");
    expect(barDensity(2, 40)).toBe("list");
    expect(barDensity(2, 20)).toBeNull();
  });

  it("puts two agents' rings side by side in a wide box and drops rings that would be too small", () => {
    expect(ringLayout(2, 600, 140)).toMatchObject({ across: true });
    expect(ringLayout(2, 200, 400)).toMatchObject({ across: false });
    expect(ringLayout(1, 120, 40)).toBeNull();
    expect(ringLayout(1, 500, 150)?.details).toBe(true);
    expect(ringLayout(1, 160, 150)?.details).toBe(false);
  });
});

describe("Coding Agents heatmap", () => {
  it("lays the days out Monday to Sunday from the first week with data, today's week last", () => {
    const today = new Date(2026, 9, 15); // a Thursday
    const weeks = heatmapWeeks(new Map([["2026-10-04", 5], ["2026-10-15", 9]]), today);
    expect(weeks.length).toBe(3); // 28 Sep, 5 Oct and 12 Oct
    expect(weeks[0][0].day).toBe("2026-09-28");
    expect(weeks[0][6]).toMatchObject({ day: "2026-10-04", v: 5 });
    expect(weeks[2][3]).toMatchObject({ day: "2026-10-15", v: 9, future: false });
    expect(weeks[2][4].future).toBe(true);
    expect(dayKey(today)).toBe("2026-10-15");
  });

  it("keeps at most six weeks", () => {
    expect(heatmapWeeks(new Map([["2026-01-01", 1]]), new Date(2026, 9, 15)).length).toBe(6);
  });

  it("shades on four levels and keeps an empty day empty", () => {
    expect(levelOf(0, 100)).toBe(0);
    expect(levelOf(1, 100)).toBe(1);
    expect(levelOf(100, 100)).toBe(4);
  });

  it("fits its cells to the box, with weekday labels only when the cells are big enough", () => {
    expect(heatmapFit(5, 300, 120)).toMatchObject({ labels: true, cell: 15 });
    expect(heatmapFit(5, 300, 60)).toMatchObject({ labels: false, cell: 6 });
    expect(heatmapFit(5, 300, 30)).toBeNull();
  });
});

describe("Coding Agents settings", () => {
  const now = Date.now();
  const AGENTS: Agents = {
    sessions: [],
    plan: { claude: { fiveHour: { used: 30, resetsAt: now + 3_600_000 }, sevenDay: { used: 70 }, at: now } },
    usage: { claude: { today: 1e6, history: 2e6, days: [{ day: dayKey(new Date(now)), input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 1e6 }] } },
  };

  it("shows what is left of the limits when asked", () => {
    const html = text(<CodingAgentsView data={{}} all={AGENTS} percent="left" />);
    expect(html).toContain(">70%<");
    expect(html).toContain(">30%<");
    expect(html).toContain("left");
  });

  it("draws rings and a heatmap when asked", () => {
    const html = text(<CodingAgentsView data={{}} all={AGENTS} limitStyle="rings" history="heatmap" />);
    expect(html).toContain("-rotate-90");
    expect(html).toContain('aria-label="Tokens per day"');
  });

  it("keeps bars and daily bars by default", () => {
    const html = text(<CodingAgentsView data={{}} all={AGENTS} />);
    expect(html).not.toContain("-rotate-90");
    expect(html).not.toContain('aria-label="Tokens per day"');
    expect(html).toContain("Resets in 1h");
  });
});
