// @vitest-environment happy-dom
// Screens' page strip: a mini-map per page of a screen with several; a click opens that page.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageStrip } from "@/components/studio/screens/page-strip";
import { CANVAS_ID, type MonitorProfile, type Placement } from "@/lib/layout";

const zone = (id: string, visible = true) => ({ id, module: "clock", colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1, visible }) as Placement;
const profile = (pages: number) =>
  ({
    id: "p1",
    name: "Desk",
    width: 1920,
    height: 1080,
    cols: 12,
    rows: 8,
    fit: "fill",
    pages: Array.from({ length: pages }, (_, i) => ({ id: `pg${i}`, name: `Page ${i + 1}`, placements: [zone(`z${i}`)] })),
  }) as unknown as MonitorProfile;

describe("PageStrip", () => {
  it("has a button per page that opens it", () => {
    const onOpen = vi.fn();
    render(<PageStrip profile={profile(3)} onOpen={onOpen} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Open Desk, Page 2" }));
    expect(onOpen).toHaveBeenCalledWith("p1", "pg1");
  });

  it("is absent for a one-page screen", () => {
    const { container } = render(<PageStrip profile={profile(1)} onOpen={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("is absent for an InfoPanel screen, which opens in its own editor", () => {
    const p = profile(2);
    p.pages.forEach((pg) => (pg.placements = [{ ...zone("c"), module: CANVAS_ID }]));
    const { container } = render(<PageStrip profile={p} onOpen={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
