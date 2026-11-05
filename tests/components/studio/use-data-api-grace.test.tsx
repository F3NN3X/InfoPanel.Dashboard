// @vitest-environment happy-dom
// B4: a drop reads Reconnecting for 10 s before Offline; a blip reads nothing and leaves no record.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLIP_MS, GRACE_MS, linkOf, stepDrop, useDataApiGrace } from "@/components/studio/use-data-api-grace";
import type { DataApiState } from "@/lib/data-api";

describe("linkOf", () => {
  it("passes a working state through, slow kept", () => {
    expect(linkOf("connected", 0)).toBe("connected");
    expect(linkOf("slow", 0)).toBe("slow");
  });

  it.each([
    [0, "connected"],
    [BLIP_MS - 1, "connected"],
    [BLIP_MS, "reconnecting"],
    [GRACE_MS - 1, "reconnecting"],
    [GRACE_MS, "offline"],
  ])("reads a drop of %d ms as %s", (ms, link) => {
    expect(linkOf("unreachable", ms)).toBe(link);
  });
});

describe("stepDrop", () => {
  const up = { downSince: null, lastDrop: null };

  it("keeps the first moment of a drop", () => {
    const down = stepDrop(up, false, 100);
    expect(stepDrop(down, false, 200).downSince).toBe(100);
  });

  it("records a drop with how long it lasted, and keeps it", () => {
    const back = stepDrop(stepDrop(up, false, 1000), true, 2200);
    expect(back).toEqual({ downSince: null, lastDrop: { at: 1000, backAfterMs: 1200 } });
    expect(stepDrop(back, true, 3000)).toBe(back);
  });

  it("records no blip, so a page load's stream opening is no drop", () => {
    const earlier = { at: 5, backAfterMs: 2000 };
    expect(stepDrop({ downSince: 1000, lastDrop: earlier }, true, 1000 + BLIP_MS - 1)).toEqual({ downSince: null, lastDrop: earlier });
  });
});

describe("useDataApiGrace", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const run = () => renderHook(({ state }) => useDataApiGrace(state), { initialProps: { state: "connected" as DataApiState } });

  it("goes amber, then red after the grace, on its own clock", () => {
    const { result, rerender } = run();
    rerender({ state: "unreachable" });
    expect(result.current.link).toBe("connected");
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current).toMatchObject({ link: "reconnecting", downMs: 3000 });
    expect(result.current.lastDrop?.backAfterMs).toBeNull();
    act(() => void vi.advanceTimersByTime(GRACE_MS - 3000));
    expect(result.current.link).toBe("offline");
  });

  it("comes back inside the grace with no red, and lists the drop", () => {
    const { result, rerender } = run();
    rerender({ state: "unreachable" });
    act(() => void vi.advanceTimersByTime(4000));
    rerender({ state: "connected" });
    expect(result.current.link).toBe("connected");
    expect(result.current.downMs).toBe(0);
    expect(result.current.lastDrop?.backAfterMs).toBe(4000);
  });

  it("stops its timer when the connection is back", () => {
    const { rerender } = run();
    rerender({ state: "unreachable" });
    rerender({ state: "connected" });
    expect(vi.getTimerCount()).toBe(0);
  });
});
