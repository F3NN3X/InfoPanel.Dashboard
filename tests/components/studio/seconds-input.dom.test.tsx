// @vitest-environment happy-dom
// The rotation interval commits on Enter or blur, and when the drawer is closed (Esc, a click outside) with the number
// still being typed, so that edit is not lost.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SecondsInput } from "@/components/studio/screen-detail";

describe("SecondsInput", () => {
  it("commits a typed number on blur, clamped", () => {
    const onCommit = vi.fn();
    render(<SecondsInput value={15} onCommit={onCommit} />);
    const input = screen.getByLabelText("Seconds per page");
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(20);
  });

  it("keeps the number being typed when it unmounts", () => {
    const onCommit = vi.fn();
    const { unmount } = render(<SecondsInput value={15} onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText("Seconds per page"), { target: { value: "45" } });
    unmount();
    expect(onCommit).toHaveBeenCalledWith(45);
  });

  it("commits nothing on unmount when the number is unchanged", () => {
    const onCommit = vi.fn();
    const { unmount } = render(<SecondsInput value={15} onCommit={onCommit} />);
    unmount();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
