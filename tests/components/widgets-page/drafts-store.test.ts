import { describe, expect, it } from "vitest";
import { newRecipe } from "@/components/widgets-page/builder-model";
import { DRAFTS_KEY, draftsOf, draftsText, keeps, loadDrafts, type OpenRecipe, saveDrafts } from "@/components/widgets-page/drafts-store";
import { commit, historyOf } from "@/components/widgets-page/history";

// The builder's autosave: leaving the Widgets page keeps every open recipe whose edits the server does not have, and opening the page
// again brings them back (with their images), as the Gauges page's drafts do. Nothing a person did is lost; nothing saved is kept twice.

const recipe = newRecipe("Card", new Set());
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255]);
const edited = (key: string, name: string, images = [] as OpenRecipe["images"]): OpenRecipe => ({ key, history: commit(historyOf({ ...recipe, id: key }), { ...recipe, id: key, name }), images });

/** A Storage stand-in. */
function store(): Storage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k), clear: () => data.clear(), key: () => null, length: 0 };
}

describe("the builder's autosave", () => {
  it("keeps a new recipe once it is edited, and a stored one while it differs from the server's", () => {
    expect(keeps({ key: "a", history: historyOf(recipe), images: [] })).toBe(false);
    expect(keeps(edited("a", "Mine"))).toBe(true);
    expect(keeps({ key: "b", history: historyOf(recipe), images: [], stored: recipe })).toBe(false);
    expect(keeps({ key: "b", history: historyOf({ ...recipe, name: "Changed" }), images: [], stored: recipe })).toBe(true);
  });

  it("brings the drafts back as they were left, images included, with a fresh undo history", () => {
    const storage = store();
    const stored = { ...recipe, id: "recipe:old" };
    const drafts = [edited("recipe:new", "New one", [{ path: "images/logo.png", bytes: PNG }]), { key: "recipe:old", history: historyOf({ ...stored, name: "Old, changed" }), images: [], stored }];
    saveDrafts(drafts, storage);
    const back = loadDrafts(storage);
    expect(back.map((d) => [d.key, d.history.present.name, d.history.past.length, d.stored?.id])).toEqual([
      ["recipe:new", "New one", 0, undefined],
      ["recipe:old", "Old, changed", 0, "recipe:old"],
    ]);
    expect([...back[0].images[0].bytes]).toEqual([...PNG]);
    expect(back[0].images[0].path).toBe("images/logo.png");
  });

  it("forgets a draft once it is saved, and the key with the last one", () => {
    const storage = store();
    saveDrafts([edited("recipe:a", "A")], storage);
    expect(storage.data.has(DRAFTS_KEY)).toBe(true);
    const saved = edited("recipe:a", "A");
    saveDrafts([{ ...saved, stored: saved.history.present }], storage);
    expect(storage.data.has(DRAFTS_KEY)).toBe(false);
  });

  it("leaves images out first, then whole drafts, to stay within the cap", () => {
    const big = new Uint8Array(3000).fill(7);
    const drafts = [edited("recipe:a", "A", [{ path: "images/a.png", bytes: big }]), edited("recipe:b", "B", [{ path: "images/b.png", bytes: big }])];
    const all = draftsText(drafts);
    const noImages = draftsText(drafts.map((d) => ({ ...d, images: [] })));
    const capped = draftsOf(draftsText(drafts, noImages.length + 10));
    expect(capped.map((d) => [d.key, d.images.length])).toEqual([["recipe:a", 0], ["recipe:b", 0]]);
    expect(all.length).toBeGreaterThan(noImages.length);
    expect(draftsOf(draftsText(drafts, noImages.length - 10)).map((d) => d.key)).toEqual(["recipe:a"]);
  });

  it("reads nothing from a text that is not drafts, and survives a storage that refuses", () => {
    expect(draftsOf("not json")).toEqual([]);
    expect(draftsOf(JSON.stringify([{ key: 1 }, { key: "x", recipe: { id: "recipe:x" } }, null]))).toEqual([]);
    const full = { ...store(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(() => saveDrafts([edited("recipe:a", "A")], full)).not.toThrow();
  });
});
