// @vitest-environment happy-dom
// The inspector's Preset row: the zone's match, Custom, applying a preset (the size only on request) and the saved list's
// save, rename and delete.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PresetRow from "@/components/studio/editor/preset-row";
import { ALL_MODULES } from "@/components/studio/studio-modules";
import { builtinPresets, loadWidgetPresets } from "@/components/studio/widget-presets";
import type { UserWidgetPreset } from "@/lib/widget-presets";
import { modules } from "@/modules";
import type { DashboardModule, ModuleSettings } from "@/modules/types";

const map = await loadWidgetPresets();
const weather = modules.find((m) => m.id === "Weather") as DashboardModule;
const builtin = builtinPresets(ALL_MODULES.find((m) => m.id === "Weather")!, map);
const mine: UserWidgetPreset = { id: "my-1", widget: "Weather", name: "Tiny", view: "minimal", settings: { showStats: false }, size: [2, 1], created: "" };

afterEach(cleanup);

function row(settings: ModuleSettings | undefined, saved: UserWidgetPreset[] = []) {
  const on = { onPick: vi.fn(), onSave: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
  render(<PresetRow mod={weather} builtin={builtin} saved={saved} settings={settings} size={[3, 2]} {...on} />);
  return on;
}

describe("PresetRow", () => {
  it("marks the built-in preset the zone is on, and says Custom when none is", () => {
    row({ view: "minimal", showForecast: false, showStats: false, showFeels: false });
    expect(screen.getByRole("radio", { name: "Minimal" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByTestId("preset-custom")).toBeNull();
    cleanup();
    row({ view: "minimal", showForecast: true, showStats: false, showFeels: false });
    expect(screen.getByTestId("preset-custom")).toBeTruthy();
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("applies a preset's view and settings, and its size only when asked", () => {
    const on = row(undefined);
    fireEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(on.onPick).toHaveBeenLastCalledWith({ view: "week", showForecast: true, showStats: false, showFeels: false }, expect.any(Array), undefined);
    fireEvent.click(screen.getByLabelText("Also use the preset's size"));
    fireEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(on.onPick).toHaveBeenLastCalledWith(expect.objectContaining({ view: "week" }), expect.any(Array), [5, 2]);
  });

  it("saves the zone as a named preset, ignoring an empty name", () => {
    const on = row(undefined);
    fireEvent.click(screen.getByTestId("preset-save"));
    const input = screen.getByLabelText("Preset name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(on.onSave).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: " Desk weather " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(on.onSave).toHaveBeenCalledTimes(1);
    expect(on.onSave.mock.calls[0][0]).toMatchObject({ widget: "Weather", name: "Desk weather", view: "full", settings: {}, size: [3, 2] });
    expect(on.onSave.mock.calls[0][0].id).toMatch(/^my-/);
    expect(screen.queryByLabelText("Preset name")).toBeNull();
  });

  it("lists the saved ones after the built-in ones, applies, renames and deletes them", () => {
    const on = row(undefined, [mine]);
    expect(screen.getByTestId("saved-preset").textContent).toContain("Tiny");
    fireEvent.click(screen.getByText("Tiny"));
    expect(on.onPick).toHaveBeenLastCalledWith({ view: "minimal", showStats: false }, expect.any(Array), undefined);
    fireEvent.click(screen.getByLabelText("Rename Tiny"));
    const input = screen.getByLabelText("Preset name") as HTMLInputElement;
    expect(input.value).toBe("Tiny");
    fireEvent.change(input, { target: { value: "Smaller" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(on.onRename).toHaveBeenCalledWith("my-1", "Smaller");
    fireEvent.click(screen.getByLabelText("Delete Tiny"));
    expect(on.onDelete).toHaveBeenCalledWith("my-1");
  });
});
