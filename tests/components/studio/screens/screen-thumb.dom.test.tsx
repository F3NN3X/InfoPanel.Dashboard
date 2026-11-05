// @vitest-environment happy-dom
// A re-captured screenshot never drops the card back to the schematic: the last loaded image stays up until the next has loaded.
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { newStored } from "@/lib/infopanel/import/stored";
import { CANVAS_ID, type MonitorProfile, type Placement } from "@/lib/layout";

const store = vi.hoisted(() => ({ shot: undefined as { dataUrl: string } | undefined }));
vi.mock("@/components/studio/profile-shot-store", () => ({ useShot: () => store.shot }));
vi.mock("@/components/infopanel/profile-thumb", () => ({ CanvasThumb: () => <div data-testid="renderer" /> }));

import { ScreenThumb } from "@/components/studio/screens/screen-thumb";

const profile = { id: "p", name: "Desk", width: 800, height: 480, cols: 2, rows: 1, fit: "fill", pages: [{ id: "pg", name: "Page 1", placements: [] }] } as unknown as MonitorProfile;

describe("ScreenThumb", () => {
  it("keeps the old shot visible while its replacement loads", () => {
    store.shot = { dataUrl: "data:a" };
    const { container, rerender } = render(<ScreenThumb profile={profile} />);
    fireEvent.load(container.querySelector("img")!);
    store.shot = { dataUrl: "data:b" };
    rerender(<ScreenThumb profile={profile} />);
    const imgs = [...container.querySelectorAll("img")];
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(["data:a", "data:b"]);
    expect(imgs[0].className).not.toContain("opacity-0");
    expect(imgs[1].className).toContain("opacity-0");
    fireEvent.load(imgs[1]);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  const canvasZone = { id: "z", module: CANVAS_ID, colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1, visible: true, canvas: newStored({ name: "Desk", width: 800, height: 480 }) } as Placement;
  const infopanel = { ...profile, pages: [{ id: "pg", name: "Page 1", placements: [canvasZone] }] } as unknown as MonitorProfile;
  const two = { ...profile, pages: [{ id: "a", name: "A", placements: [] }, { id: "b", name: "B", placements: [] }] } as unknown as MonitorProfile;

  it("draws an InfoPanel screen with the renderer, and as a schematic when still (a card per kiosk)", () => {
    const live = render(<ScreenThumb profile={infopanel} />);
    expect(live.queryByTestId("renderer")).not.toBeNull();
    live.unmount();
    const still = render(<ScreenThumb profile={infopanel} still />);
    expect(still.queryByTestId("renderer")).toBeNull();
  });

  it("shows the kept screenshot on the first page only", () => {
    store.shot = { dataUrl: "data:a" };
    expect(render(<ScreenThumb profile={two} pageId="a" still />).container.querySelectorAll("img")).toHaveLength(1);
    expect(render(<ScreenThumb profile={two} pageId="b" still />).container.querySelectorAll("img")).toHaveLength(0);
  });
});
