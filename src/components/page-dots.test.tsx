import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageDots } from "./page-dots";

const noop = () => {};
const pages = [
  { id: "a", name: "Main" },
  { id: "b", name: "Games" },
  { id: "c", name: "Stats" },
];
const html = (over: Partial<Parameters<typeof PageDots>[0]> = {}) =>
  renderToString(
    <PageDots enabled pages={pages} current="b" paused={false} onSelect={noop} onToggleRotate={noop} {...over} />
  );

describe("PageDots", () => {
  it("renders a dot per page, named by the page, with the current one selected", () => {
    const out = html();
    const tabs = [...out.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => /aria-label="([^"]*)"/.exec(t)?.[1])).toEqual(["Main", "Games", "Stats"]);
    expect(tabs.map((t) => t.includes('aria-selected="true"'))).toEqual([false, true, false]);
    expect(out).toContain("bg-primary");
  });

  it("shows the pause glyph only while rotation is paused", () => {
    expect(html()).not.toContain("Auto-rotate paused");
    expect(html({ paused: true })).toContain('aria-label="Auto-rotate paused"');
  });

  it("renders nothing with one page or with the setting off", () => {
    expect(html({ pages: pages.slice(0, 1) })).toBe("");
    expect(html({ enabled: false })).toBe("");
  });
});
