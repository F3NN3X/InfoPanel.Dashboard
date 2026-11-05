// @vitest-environment happy-dom
// A workspace edit says what changed, with an Undo that is the studio's own undo, and the Undo can only revert the
// step the toast names.
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUndoToast } from "@/components/studio/use-undo-toast";
import { useConfigHistory } from "@/hooks/use-config-history";
import type { DashboardConfig } from "@/lib/layout";

const toast = vi.fn();
const dismiss = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast, useDismissToast: () => dismiss }));

beforeEach(() => {
  vi.useFakeTimers();
  let id = 0;
  toast.mockImplementation(() => ++id);
});
afterEach(() => {
  vi.useRealTimers();
  toast.mockReset();
  dismiss.mockReset();
});

const start = { profiles: [], n: 0 } as unknown as DashboardConfig;
const bump = (c: DashboardConfig) => ({ ...c, n: (c as unknown as { n: number }).n + 1 }) as unknown as DashboardConfig;

/** The real history under a toast hook, as the studio wires it. */
function harness(initial: { area: string } = { area: "alerts" }) {
  return renderHook(
    ({ area }) => {
      const [config, setConfig] = useState(start);
      const history = useConfigHistory(config, setConfig);
      const setAlerts = useUndoToast(history.set, history.undo, "Alert settings changed", history, area);
      return { config, history, setAlerts };
    },
    { initialProps: initial },
  );
}

const n = (c: DashboardConfig) => (c as unknown as { n: number }).n;
const settle = () => act(() => void vi.advanceTimersByTime(500));

describe("useUndoToast", () => {
  it("raises one toast once the edits settle, whose Undo runs the studio's undo", () => {
    const { result } = harness();
    act(() => {
      result.current.setAlerts(bump, "rule-a");
      result.current.setAlerts(bump, "rule-a");
    });
    expect(toast).not.toHaveBeenCalled();
    settle();
    expect(toast).toHaveBeenCalledTimes(1);
    const [message, options] = toast.mock.calls[0];
    expect(message).toBe("Alert settings changed");
    act(() => options.action.onClick());
    expect(n(result.current.config)).toBe(0);
  });

  it("raises no toast for an edit that changes nothing, so Undo can't revert an earlier step", () => {
    const { result } = harness();
    act(() => result.current.history.set(bump));
    act(() => result.current.setAlerts((c) => c));
    settle();
    expect(toast).not.toHaveBeenCalled();
  });

  it("takes the toast down when a newer edit lands elsewhere, and a late Undo reverts nothing", () => {
    const { result } = harness();
    act(() => result.current.setAlerts(bump));
    settle();
    const options = toast.mock.calls[0][1];
    act(() => result.current.history.set(bump));
    expect(dismiss).toHaveBeenCalledWith(1);
    act(() => options.action.onClick());
    expect(n(result.current.config)).toBe(2);
  });

  it("takes the toast down when the area changes, and raises none for a step still waiting", () => {
    const { result, rerender } = harness();
    act(() => result.current.setAlerts(bump));
    settle();
    rerender({ area: "design" });
    expect(dismiss).toHaveBeenCalledWith(1);
    act(() => result.current.setAlerts(bump));
    rerender({ area: "sources" });
    settle();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("raises no toast after it unmounts", () => {
    const { result, unmount } = harness();
    act(() => result.current.setAlerts(bump));
    unmount();
    act(() => void vi.advanceTimersByTime(1000));
    expect(toast).not.toHaveBeenCalled();
  });
});
