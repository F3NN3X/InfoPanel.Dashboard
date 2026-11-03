// @vitest-environment happy-dom
// The Edit page tabs' hover thumbnail: after a short rest on hover or keyboard focus, gone on leave, blur or Escape.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageTabs } from "@/components/studio/page-tabs";
import "@/components/studio/page-thumb-card";
import { THUMB_DELAY_MS, thumbAt } from "@/components/studio/page-thumb";
import type { MonitorProfile, Placement } from "@/lib/layout";

const zone = { id: "z1", module: "clock", colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1, visible: true } as Placement;
const profile = {
  id: "p1",
  name: "Desk",
  width: 1920,
  height: 1080,
  cols: 12,
  rows: 8,
  fit: "fill",
  pages: [
    { id: "a", name: "Main", placements: [zone] },
    { id: "b", name: "Extra", placements: [zone] },
  ],
} as unknown as MonitorProfile;
const noop = vi.fn();
const tabs = (thumbProfile?: MonitorProfile) => (
  <PageTabs
    leftOpen
    onToggleLeft={noop}
    pages={profile.pages}
    current="a"
    onSelect={noop}
    onAdd={noop}
    onRename={noop}
    onMove={noop}
    onDuplicate={noop}
    onDelete={noop}
    onIcon={noop}
    onPageSettings={noop}
    renamingId={null}
    onRenamingChange={noop}
    deletingId={null}
    onDeletingChange={noop}
    thumbProfile={thumbProfile}
  />
);
const wait = async () => {
  await act(async () => void vi.advanceTimersByTime(THUMB_DELAY_MS + 10));
  await act(async () => {});
};

describe("page tab thumbnails", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows after a rest on hover and goes on leave", async () => {
    render(tabs(profile));
    const tab = screen.getByRole("tab", { name: /Extra/ });
    fireEvent.pointerEnter(tab);
    expect(screen.queryByTestId("page-thumb")).toBeNull();
    await wait();
    expect(screen.getByTestId("page-thumb").textContent).toContain("Extra");
    fireEvent.pointerLeave(tab);
    expect(screen.queryByTestId("page-thumb")).toBeNull();
  });

  it("never shows when the pointer leaves before the delay", async () => {
    render(tabs(profile));
    const tab = screen.getByRole("tab", { name: /Extra/ });
    fireEvent.pointerEnter(tab);
    fireEvent.pointerLeave(tab);
    await wait();
    expect(screen.queryByTestId("page-thumb")).toBeNull();
  });

  it("dismisses on Escape and on blur", async () => {
    render(tabs(profile));
    const tab = screen.getByRole("tab", { name: /Extra/ });
    fireEvent.pointerEnter(tab);
    await wait();
    fireEvent.keyDown(tab, { key: "Escape" });
    expect(screen.queryByTestId("page-thumb")).toBeNull();
    fireEvent.pointerEnter(tab);
    await wait();
    fireEvent.blur(tab);
    expect(screen.queryByTestId("page-thumb")).toBeNull();
  });

  it("Escape during the delay cancels the pending thumbnail", async () => {
    render(tabs(profile));
    const tab = screen.getByRole("tab", { name: /Extra/ });
    fireEvent.pointerEnter(tab);
    fireEvent.keyDown(tab, { key: "Escape" });
    await wait();
    expect(screen.queryByTestId("page-thumb")).toBeNull();
  });

  it("is off without a screen to draw", async () => {
    render(tabs());
    fireEvent.pointerEnter(screen.getByRole("tab", { name: /Extra/ }));
    await wait();
    expect(screen.queryByTestId("page-thumb")).toBeNull();
  });
});

describe("thumbAt", () => {
  it("sits under the tab and stays inside the window", () => {
    expect(thumbAt({ left: 100, bottom: 40 }, 1000)).toEqual({ left: 100, top: 46 });
    expect(thumbAt({ left: 950, bottom: 40 }, 1000).left).toBeLessThan(950);
    expect(thumbAt({ left: -20, bottom: 40 }, 1000).left).toBeGreaterThan(0);
  });
});
