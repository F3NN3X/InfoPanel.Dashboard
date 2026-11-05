// @vitest-environment happy-dom
// Q2: with no header on a workspace page, the strip is what drags and closes the desktop window.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WindowStrip } from "@/components/studio/window-strip";
import * as desktop from "@/lib/desktop";

describe("WindowStrip", () => {
  it("carries the drag region and the caption buttons on the desktop", () => {
    vi.spyOn(desktop, "isTauri").mockReturnValue(true);
    vi.spyOn(desktop, "onMaximizedChange").mockResolvedValue(() => {});
    const { container } = render(<WindowStrip />);
    expect(container.querySelector("[data-tauri-drag-region]")).not.toBeNull();
    for (const name of ["Minimize", "Maximize", "Close"]) expect(screen.getByRole("button", { name })).toBeTruthy();
  });

  it("renders nothing in a browser", () => {
    vi.spyOn(desktop, "isTauri").mockReturnValue(false);
    const { container } = render(<WindowStrip />);
    expect(container.firstChild).toBeNull();
  });
});
