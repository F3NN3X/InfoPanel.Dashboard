import { describe, expect, it } from "vitest";
import {
  COALESCE_MS,
  HISTORY_LIMIT,
  emptyHistory,
  recordChange,
  redoChange,
  undoChange,
  type History,
} from "./config-history";

/** Apply a series of [prev, key, at] changes to an empty history. */
function record(changes: [number, string | undefined, number][]): History<number> {
  return changes.reduce(
    (h, [prev, key, at]) => recordChange(h, prev, key, at),
    emptyHistory<number>()
  );
}

describe("recordChange", () => {
  it("pushes one step per untagged change", () => {
    const h = record([
      [0, undefined, 0],
      [1, undefined, 10],
    ]);
    expect(h.past).toEqual([0, 1]);
  });

  it("coalesces same-key changes within the window into one step", () => {
    const h = record([
      [0, "slider", 0],
      [1, "slider", 100],
      [2, "slider", 100 + COALESCE_MS - 1],
    ]);
    expect(h.past).toEqual([0]);
  });

  it("measures the window from the last change (a long drag stays one step)", () => {
    const h = record([
      [0, "drag", 0],
      [1, "drag", 400],
      [2, "drag", 800],
      [3, "drag", 1200],
    ]);
    expect(h.past).toEqual([0]);
  });

  it("starts a new step after a pause or a different key", () => {
    expect(
      record([
        [0, "a", 0],
        [1, "a", COALESCE_MS],
      ]).past
    ).toEqual([0, 1]);
    expect(
      record([
        [0, "a", 0],
        [1, "b", 10],
      ]).past
    ).toEqual([0, 1]);
  });

  it("keeps quick edits to different panel fields as separate steps", () => {
    // Title then accent of one panel, then a widget's label and unit.
    const h = record([
      [0, "z1:panel:title", 0],
      [1, "z1:panel:title", 50],
      [2, "z1:panel:accent", 100],
      [3, "z1:panel-widget:w1:label", 150],
      [4, "z1:panel-widget:w1:label", 200],
      [5, "z1:panel-widget:w1:unit", 250],
    ]);
    expect(h.past).toEqual([0, 2, 3, 5]);
    expect(undoChange(h, 6)!.value).toBe(5);
  });

  it("clears the redo stack", () => {
    const h = record([[0, undefined, 0]]);
    const undone = undoChange(h, 1)!.history;
    expect(undone.future).toEqual([1]);
    expect(recordChange(undone, 0, undefined, 10).future).toEqual([]);
  });

  it("caps the undo stack", () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) h = recordChange(h, i, undefined, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toBe(5);
  });
});

describe("undoChange / redoChange", () => {
  it("walks back and forth through the snapshots", () => {
    // 0 → 1 → 2, current is 2.
    const h = record([
      [0, undefined, 0],
      [1, undefined, 10],
    ]);
    const u1 = undoChange(h, 2)!;
    expect(u1.value).toBe(1);
    const u2 = undoChange(u1.history, u1.value)!;
    expect(u2.value).toBe(0);
    expect(undoChange(u2.history, u2.value)).toBeNull();
    const r1 = redoChange(u2.history, u2.value)!;
    expect(r1.value).toBe(1);
    const r2 = redoChange(r1.history, r1.value)!;
    expect(r2.value).toBe(2);
    expect(redoChange(r2.history, r2.value)).toBeNull();
    expect(r2.history.past).toEqual([0, 1]);
  });

  it("doesn't coalesce a change made right after an undo", () => {
    const h = record([[0, "a", 0]]);
    const u = undoChange(h, 1)!;
    expect(recordChange(u.history, 0, "a", 10).past).toEqual([0]);
    expect(recordChange(u.history, 0, "a", 10).future).toEqual([]);
  });
});
