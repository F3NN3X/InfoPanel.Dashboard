// The top bar's saved state (P-1): every state the autosave can be in, and a refusal never hides behind Saved.
import { describe, expect, it } from "vitest";
import { saveChip, type SaveFacts } from "@/components/studio/editor/save-chip";

const base: SaveFacts = { pending: false, offline: false, refused: false, readOnly: false, displays: 0 };

describe("saveChip", () => {
  it("is green only while a display shows the screen", () => {
    expect(saveChip(base).tone).toBe("neutral");
    expect(saveChip({ ...base, displays: 1 }).tone).toBe("ok");
    expect(saveChip({ ...base, displays: 2 }).text).not.toBe(saveChip({ ...base, displays: 1 }).text);
  });

  it("warns while edits are on their way, whoever is watching", () => {
    expect(saveChip({ ...base, pending: true, displays: 3 }).tone).toBe("warn");
  });

  it("puts a refusal before read only, offline and pending", () => {
    const all = { ...base, pending: true, offline: true, readOnly: true, refused: true };
    const states = [all, { ...all, refused: false }, { ...all, refused: false, readOnly: false }, { ...all, refused: false, readOnly: false, offline: false }].map(saveChip);
    expect(states[0].tone).toBe("danger");
    // Each one is a state of its own: dropping the worst fact shows the next, never the same words.
    expect(new Set(states.map((s) => s.text)).size).toBe(states.length);
    expect(new Set(states.map((s) => s.tip)).size).toBe(states.length);
  });
});
