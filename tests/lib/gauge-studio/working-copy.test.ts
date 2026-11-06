import { describe, expect, it } from "vitest";
import { DEFAULT_GAUGE, type VectorGauge } from "@/lib/infopanel/gauges/vector";
import { autosaves, canRedo, canUndo, editCopy, isDirty, markDrafted, markSaved, openCopy, redoCopy, renameCopy, undoCopy } from "@/lib/gauge-studio/working-copy";

const g = (thickness: number): VectorGauge => ({ ...DEFAULT_GAUGE, thickness });
const origin = { kind: "library", itemId: "a" } as const;

describe("working copy", () => {
  it("undoes and redoes edits, a new edit clearing redo", () => {
    let wc = openCopy("Ring", g(1), origin);
    wc = editCopy(wc, g(2), undefined, 0);
    wc = editCopy(wc, g(3), undefined, 1000);
    expect([canUndo(wc), canRedo(wc)]).toEqual([true, false]);
    wc = undoCopy(wc);
    expect(wc.gauge.thickness).toBe(2);
    wc = undoCopy(wc);
    expect(wc.gauge.thickness).toBe(1);
    expect(undoCopy(wc)).toBe(wc);
    wc = redoCopy(wc);
    expect(wc.gauge.thickness).toBe(2);
    wc = editCopy(wc, g(9), undefined, 5000);
    expect(canRedo(wc)).toBe(false);
    expect(redoCopy(wc)).toBe(wc);
  });

  it("makes a slider drag (one key, close together) one step, and ignores an unchanged spec", () => {
    let wc = openCopy("Ring", g(1), origin);
    for (let i = 2; i <= 6; i++) wc = editCopy(wc, g(i), "thickness", i * 50);
    expect(wc.history.past).toHaveLength(1);
    expect(undoCopy(wc).gauge.thickness).toBe(1);
    expect(editCopy(wc, wc.gauge)).toBe(wc);
    wc = editCopy(wc, g(20), "thickness", 5000);
    expect(wc.history.past).toHaveLength(2);
  });

  it("is dirty after an edit or rename, and clean again when undone or saved; a copy never saved is clean until it is edited", () => {
    expect(isDirty(openCopy("Ring copy", g(1)))).toBe(false);
    expect(isDirty(editCopy(openCopy("Ring copy", g(1)), g(2), undefined, 0))).toBe(true);
    expect(isDirty(renameCopy(openCopy("Ring copy", g(1)), "Mine"))).toBe(true);
    const clean = openCopy("Ring", g(1), origin);
    expect(isDirty(clean)).toBe(false);
    const edited = editCopy(clean, g(2), undefined, 0);
    expect(isDirty(edited)).toBe(true);
    expect(isDirty(undoCopy(edited))).toBe(false);
    expect(isDirty(editCopy(edited, g(1), undefined, 9000))).toBe(false);
    expect(isDirty(renameCopy(clean, "Other"))).toBe(true);
    expect(renameCopy(clean, "Ring")).toBe(clean);
    const saved = markSaved(openCopy("New", g(1)), origin);
    expect(saved.origin).toEqual(origin);
    expect(isDirty(saved)).toBe(false);
    expect(isDirty(editCopy(saved, g(4), undefined, 0))).toBe(true);
  });

  it("makes a draft on the first edit of a copy with no item, keeps it up to date, and ends it on a deliberate save", () => {
    const fresh = openCopy("Ring copy", g(1));
    expect(autosaves(fresh)).toBe(false);
    const edited = editCopy(fresh, g(2), undefined, 0);
    expect(autosaves(edited)).toBe(true);
    // An edit made while the draft was being written is still unsaved.
    const drafted = markDrafted(editCopy(edited, g(3), undefined, 9000), origin, { name: edited.name, gauge: edited.gauge });
    expect(drafted.draft).toBe(true);
    expect(autosaves(drafted)).toBe(true);
    expect(isDirty(drafted)).toBe(true);
    const settled = markDrafted(edited, origin, { name: edited.name, gauge: edited.gauge });
    expect(isDirty(settled)).toBe(false);
    const saved = markSaved(settled, origin);
    expect([saved.draft, autosaves(saved)]).toEqual([false, false]);
    // A library item opened and edited asks on leaving; it is not drafted over.
    expect(autosaves(editCopy(openCopy("Ring", g(1), origin), g(2), undefined, 0))).toBe(false);
  });
});
