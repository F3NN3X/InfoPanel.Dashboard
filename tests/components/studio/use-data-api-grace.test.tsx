// @vitest-environment happy-dom
// B4: a drop reads Reconnecting for 10 s before Offline; a blip reads nothing and leaves no record.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLIP_MS, GRACE_MS, linkOf, OFFLINE_TICK_MS, stepDrop, useDataApiGrace, useDownMs } from "@/components/studio/use-data-api-grace";
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

  it("reaches offline when its timer fires early by the clock, because nothing else re-reads it", () => {
    const stopped = () => 1_000_000; // the worst case: the clock has not moved at all when the timers fire
    const { result, rerender } = renderHook(({ state }) => useDataApiGrace(state, stopped), { initialProps: { state: "connected" as DataApiState } });
    rerender({ state: "unreachable" });
    act(() => void vi.advanceTimersByTime(GRACE_MS));
    expect(result.current.link).toBe("offline");
  });

  it("goes amber, then red after the grace, on its own clock", () => {
    const { result, rerender } = run();
    rerender({ state: "unreachable" });
    expect(result.current.link).toBe("connected");
    act(() => void vi.advanceTimersByTime(BLIP_MS));
    expect(result.current).toMatchObject({ link: "reconnecting", downMs: BLIP_MS });
    expect(result.current.lastDrop?.backAfterMs).toBeNull();
    act(() => void vi.advanceTimersByTime(GRACE_MS - BLIP_MS));
    expect(result.current.link).toBe("offline");
  });

  it("renders its caller at the two link changes only, not once a second (M4)", () => {
    let renders = 0;
    const { rerender } = renderHook(
      ({ state }) => {
        renders++;
        return useDataApiGrace(state);
      },
      { initialProps: { state: "connected" as DataApiState } },
    );
    rerender({ state: "unreachable" });
    const before = renders;
    act(() => void vi.advanceTimersByTime(5 * 60_000));
    expect(renders - before).toBeLessThanOrEqual(3);
    expect(vi.getTimerCount()).toBe(0);
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

describe("useDownMs", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const health = (link: "reconnecting" | "offline", since: number) => ({ link, downMs: 0, downSince: since, lastDrop: null });
  const clock = () => Date.now();

  it("counts each second in the grace and every 30 s once offline", () => {
    const since = Date.now();
    const { result, rerender } = renderHook(({ h }) => useDownMs(h, clock), { initialProps: { h: health("reconnecting", since) } });
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current).toBe(3000);
    rerender({ h: health("offline", since) });
    const at = result.current;
    act(() => void vi.advanceTimersByTime(OFFLINE_TICK_MS - 1));
    expect(result.current).toBe(at);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(at + OFFLINE_TICK_MS);
  });

  it("does not tick while the page is hidden", () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const { result } = renderHook(() => useDownMs(health("reconnecting", Date.now()), clock));
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });

  it("is the plain snapshot while up", () => {
    const { result } = renderHook(() => useDownMs({ link: "connected", downMs: 0, downSince: null, lastDrop: null }, clock));
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
