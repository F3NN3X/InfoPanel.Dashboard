// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "@/components/ui/tabs";

describe("Tabs", () => {
  it("has one tab stop, the selected tab, and an arrow key moves and selects", () => {
    const onChange = vi.fn();
    render(<Tabs label="Alerts" value="rules" onChange={onChange} tabs={[{ value: "rules", label: "Rules" }, { value: "island", label: "Island" }]} />);
    const [rules, island] = screen.getAllByRole("tab");
    expect([rules.tabIndex, island.tabIndex]).toEqual([0, -1]);
    rules.focus();
    fireEvent.keyDown(rules, { key: "ArrowRight" });
    expect(document.activeElement).toBe(island);
    expect(onChange).toHaveBeenCalledWith("island");
  });
});
