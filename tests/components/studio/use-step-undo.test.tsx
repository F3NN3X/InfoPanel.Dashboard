// @vitest-environment happy-dom
// Undo and Redo in Edit toast only when they change something, so the toast's button can never revert a real edit.
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useStepUndo } from "@/components/studio/use-step-undo";
import { useConfigHistory } from "@/hooks/use-config-history";
import type { DashboardConfig } from "@/lib/layout";

const start = { profiles: [], n: 0 } as unknown as DashboardConfig;
const bump = (c: DashboardConfig) => ({ ...c, n: (c as unknown as { n: number }).n + 1 }) as unknown as DashboardConfig;
const nOf = (c: DashboardConfig) => (c as unknown as { n: number }).n;

function harness() {
  const toast = vi.fn(() => 1);
  const hook = renderHook(() => {
    const [config, setConfig] = useState(start);
    const history = useConfigHistory(config, setConfig);
    const steps = { kit: null, undo: null, redo: null, peek: () => ({ undo: null, redo: null }) };
    const step = useStepUndo({ history, steps, design: true, toast, jump: () => {} });
    return { config, history, step };
  });
  return { hook, toast };
}

describe("Undo and Redo with a toast", () => {
  it("raise none on an empty stack, so the toast's button cannot revert a real edit", () => {
    const { hook, toast } = harness();
    act(() => hook.result.current.history.set(bump));
    act(() => hook.result.current.step.redo());
    expect(toast).not.toHaveBeenCalled();
    act(() => hook.result.current.step.undo());
    expect(toast).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.step.undo());
    expect(toast).toHaveBeenCalledTimes(1);
    expect(nOf(hook.result.current.config)).toBe(0);
  });
  it("the toast's button does nothing once history has moved on", () => {
    const { hook, toast } = harness();
    act(() => hook.result.current.history.set(bump));
    act(() => hook.result.current.step.undo());
    const onClick = (toast.mock.calls[0] as unknown as [string, { action: { onClick: () => void } }])[1].action.onClick;
    act(() => hook.result.current.history.set(bump));
    act(() => onClick());
    expect(nOf(hook.result.current.config)).toBe(1);
    expect(toast).toHaveBeenCalledTimes(1);
  });
});
