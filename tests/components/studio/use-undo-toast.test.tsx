// @vitest-environment happy-dom
// A workspace edit says what changed, with an Undo that is the studio's own undo.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUndoToast } from "@/components/studio/use-undo-toast";

const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  toast.mockReset();
});

describe("useUndoToast", () => {
  it("passes the edit through and raises one toast once the edits settle, whose Undo runs the studio's undo", () => {
    const set = vi.fn();
    const undo = vi.fn();
    const { result } = renderHook(() => useUndoToast(set, undo, "Alert settings changed"));
    act(() => {
      result.current((c) => c, "rule-a");
      result.current((c) => c, "rule-a");
    });
    expect(set).toHaveBeenCalledTimes(2);
    expect(toast).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(500));
    expect(toast).toHaveBeenCalledTimes(1);
    const [message, options] = toast.mock.calls[0];
    expect(message).toBe("Alert settings changed");
    options.action.onClick();
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it("raises no toast after it unmounts", () => {
    const { result, unmount } = renderHook(() => useUndoToast(vi.fn(), vi.fn(), "x"));
    act(() => result.current((c) => c));
    unmount();
    act(() => void vi.advanceTimersByTime(1000));
    expect(toast).not.toHaveBeenCalled();
  });
});
