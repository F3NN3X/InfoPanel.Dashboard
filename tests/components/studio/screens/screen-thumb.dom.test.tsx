// @vitest-environment happy-dom
// A re-captured screenshot never drops the card back to the schematic: the last loaded image stays up until the next has loaded.
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MonitorProfile } from "@/lib/layout";

const store = vi.hoisted(() => ({ shot: undefined as { dataUrl: string } | undefined }));
vi.mock("@/components/studio/profile-shot-store", () => ({ useShot: () => store.shot }));

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
});
