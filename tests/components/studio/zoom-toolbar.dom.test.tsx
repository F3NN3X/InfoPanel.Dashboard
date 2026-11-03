// @vitest-environment happy-dom
// The canvas zoom bar: Zoom to selection is off until a widget is selected.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZoomToolbar } from "@/components/studio/zoom-toolbar";
import type { ProfileView } from "@/lib/layout";

const profile = { id: "p1", name: "Desk", width: 800, height: 480, cols: 12, rows: 8 } as unknown as ProfileView;
const bar = { zoom: 1, fitting: true, showRulers: false, onToggleRulers: vi.fn(), onZoomStep: vi.fn(), onFit: vi.fn(), profile, onOpenProfile: vi.fn() };

describe("Zoom to selection", () => {
  it("is disabled with nothing selected", () => {
    const onZoomSelection = vi.fn();
    render(<ZoomToolbar {...bar} onZoomSelection={onZoomSelection} />);
    const button = screen.getByRole("button", { name: "Selection" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onZoomSelection).not.toHaveBeenCalled();
  });

  it("zooms once a widget is selected", () => {
    const onZoomSelection = vi.fn();
    render(<ZoomToolbar {...bar} onZoomSelection={onZoomSelection} hasSelection />);
    fireEvent.click(screen.getByRole("button", { name: "Selection" }));
    expect(onZoomSelection).toHaveBeenCalledTimes(1);
  });
});
