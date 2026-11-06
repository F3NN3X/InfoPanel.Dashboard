// @vitest-environment happy-dom
// Q2: a page's bar is the desktop window's title bar: it drags the window and carries the caption buttons.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BarTitle, PageBar } from "@/components/studio/page-bar";
import * as desktop from "@/lib/desktop";

describe("PageBar", () => {
  it("carries the drag region and the caption buttons on the desktop", () => {
    vi.spyOn(desktop, "isTauri").mockReturnValue(true);
    vi.spyOn(desktop, "onMaximizedChange").mockResolvedValue(() => {});
    const { container } = render(
      <PageBar>
        <BarTitle title="Screens" />
      </PageBar>
    );
    expect(container.querySelector("header[data-tauri-drag-region]")).not.toBeNull();
    for (const name of ["Minimize", "Maximize", "Close"]) expect(screen.getByRole("button", { name })).toBeTruthy();
  });

  it("shows the header without caption buttons in a browser", () => {
    vi.spyOn(desktop, "isTauri").mockReturnValue(false);
    render(
      <PageBar>
        <BarTitle title="Screens" />
      </PageBar>
    );
    expect(screen.getByRole("heading", { name: "Screens" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
