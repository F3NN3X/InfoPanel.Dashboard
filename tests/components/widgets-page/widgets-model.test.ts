import { describe, expect, it } from "vitest";
import { newRecipe } from "@/components/widgets-page/builder-model";
import { commit, historyOf } from "@/components/widgets-page/history";
import { isUnsaved } from "@/components/widgets-page/widgets-model";

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
