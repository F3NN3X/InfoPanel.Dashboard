// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ButtonTile, type ButtonTileProps } from "@/widgets/core/button-tile";

afterEach(cleanup);

const tile = (p: Partial<ButtonTileProps> = {}) => {
  const onPress = vi.fn();
  render(<ButtonTile w={464} h={464} icon="mic" name="Mic" status="Live" tint="red" active={false} corner="8px" onPress={onPress} label="Mic" {...p} />);
  return { btn: screen.getByRole("button", { name: "Mic" }), onPress };
};

describe("ButtonTile", () => {
  it("scales the glyph with the shorter side and floors it on a small tile", () => {
    const { btn } = tile();
    expect((btn.querySelector("span") as HTMLElement).style.fontSize).toBe("120px");
    cleanup();
    const small = tile({ w: 110, h: 110 }).btn;
    expect((small.querySelector("span") as HTMLElement).style.fontSize).toBe("31px");
    cleanup();
    expect((tile({ w: 60, h: 60 }).btn.querySelector("span") as HTMLElement).style.fontSize).toBe("26px");
  });

  it("shows the status line only from 90px", () => {
    tile();
    expect(screen.queryByText("Live")).not.toBeNull();
    cleanup();
    tile({ w: 80, h: 80 });
    expect(screen.queryByText("Live")).toBeNull();
  });

  it("tints the fill when active and leaves a hairline edge when idle", () => {
    const idle = tile().btn;
    expect(idle.getAttribute("aria-pressed")).toBe("false");
    expect(idle.style.boxShadow).toContain("1px");
    cleanup();
    const on = tile({ active: true }).btn;
    expect(on.getAttribute("aria-pressed")).toBe("true");
    expect(on.style.color).toBe("red");
    expect(idle.style.color).toBe("var(--w-fg)");
    cleanup();
    expect(tile({ active: true, outline: "white" }).btn.style.boxShadow).toContain("2px");
  });

  it("presses unless disabled", () => {
    const a = tile();
    fireEvent.click(a.btn);
    expect(a.onPress).toHaveBeenCalledOnce();
    cleanup();
    expect(tile({ disabled: true }).btn.hasAttribute("disabled")).toBe(true);
  });
});
