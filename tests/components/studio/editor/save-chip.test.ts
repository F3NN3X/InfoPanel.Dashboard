// The top bar's saved state (P-1): every state the autosave can be in, and a refusal never hides behind Saved.
import { describe, expect, it } from "vitest";
import { saveChip, type SaveFacts } from "@/components/studio/editor/save-chip";

const base: SaveFacts = { pending: false, offline: false, refused: false, readOnly: false, displays: 0 };

describe("saveChip", () => {
  it("is green only while a display shows the screen", () => {
    expect(saveChip(base)).toMatchObject({ tone: "neutral", text: "Saved" });
    expect(saveChip({ ...base, displays: 1 })).toMatchObject({ tone: "ok", text: "Saved · live on 1 display" });
    expect(saveChip({ ...base, displays: 2 }).text).toBe("Saved · live on 2 displays");
  });

  it("says unsaved while edits are on their way, whoever is watching", () => {
    expect(saveChip({ ...base, pending: true, displays: 3 })).toMatchObject({ tone: "warn", text: "Unsaved changes" });
  });

  it("puts a refusal before read only, offline and pending", () => {
    const all = { ...base, pending: true, offline: true, readOnly: true, refused: true };
    expect(saveChip(all)).toMatchObject({ tone: "danger", text: "Not saved · newer config" });
    expect(saveChip({ ...all, refused: false }).text).toBe("Read only · edits refused");
    expect(saveChip({ ...all, refused: false, readOnly: false }).text).toBe("Offline · edits kept locally");
  });
});
