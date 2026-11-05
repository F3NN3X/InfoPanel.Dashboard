// @vitest-environment happy-dom
// The inheritance dot: hollow follows the level above, filled offers Reset.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InheritDot } from "@/components/ui/setting-row";

describe("InheritDot", () => {
  it("names the level a hollow dot follows and has no button", () => {
    render(<InheritDot from="Perf heavy" />);
    expect(screen.getByRole("img", { name: "From Perf heavy" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers Reset on a value set here", async () => {
    const onReset = vi.fn();
    render(<InheritDot from="Perf heavy" set onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Set here, reset to Perf heavy" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reset" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
