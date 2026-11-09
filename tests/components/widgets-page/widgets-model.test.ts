import { describe, expect, it } from "vitest";
import { newRecipe } from "@/components/widgets-page/builder-model";
import { commit, historyOf } from "@/components/widgets-page/history";
import { isUnsaved, trustOf } from "@/components/widgets-page/widgets-model";

// Which open recipes the browse view offers back ("Open in the builder, not saved"): leaving the builder keeps them open, and
// one that is not on the server must stay reachable.
describe("an open recipe's saved state", () => {
  const recipe = newRecipe("Card", new Set());

  it("is unsaved when never saved, saved when the server has it as it is, unsaved again after an edit", () => {
    expect(isUnsaved({ history: historyOf(recipe) })).toBe(true);
    expect(isUnsaved({ stored: recipe, history: historyOf(structuredClone(recipe)) })).toBe(false);
    expect(isUnsaved({ stored: recipe, history: commit(historyOf(recipe), { ...recipe, name: "Card 2" }) })).toBe(true);
  });
});

// What the detail pane and the cards say of a package, from the server's `trust` (Phase 6b).
describe("a widget's trust state", () => {
  it.each([
    ["recipe", "unsigned", { kind: "recipe" }],
    ["recipe", "user:Mika", { kind: "recipe" }],
    ["code", "owner", { kind: "owner" }],
    ["code", "themely", { kind: "themely" }],
    ["code", "user:Mika", { kind: "user-key", signer: "Mika" }],
    ["code", "refused:signed with a revoked key (AB)", { kind: "refused", why: "signed with a revoked key (AB)" }],
    ["recipe", "refused:the signature does not match the package", { kind: "refused", why: "the signature does not match the package" }],
    ["code", "unsigned", { kind: "refused", why: "it is not signed by a key this app trusts" }],
  ])("%s %s", (kind, trust, want) => {
    expect(trustOf(kind, trust)).toEqual(want);
  });
});
