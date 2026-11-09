// The recipes' Add rows (FORMAT.md §14): the lazy chunk `widgets/recipe/use-recipes.ts` loads, so the studio entry carries none of it.
import { listUserWidgets, loadRecipe } from "@/widgets/recipe/store";
import type { Recipe } from "@/widgets/recipe/types";
import { type AddItem, moduleItem } from "./add-catalog";
import type { ModuleMeta } from "./studio-modules";

/**
 * A recipe's row, after the built-in ones: its presets as rows, as a built-in's are. Every add, the default preset's too, stores
 * the recipe's version with the placement.
 */
export function recipeItem(r: Recipe): AddItem {
  const m: ModuleMeta = { id: r.id, title: r.name, minCols: r.size.min[0], minRows: r.size.min[1], category: r.category, icon: r.icon, description: r.description, defaultSize: r.size.default };
  const versioned = (i: AddItem): AddItem => ({ ...i, drop: { ...i.drop, settings: { recipeVersion: r.version, ...i.drop.settings } } });
  const item = moduleItem(m, r.presets);
  return { ...versioned(item), ...(item.presets ? { presets: item.presets.map(versioned) } : {}) };
}

/** The rows of the recipes the server holds that pass the validator (a refused one is not offered; none while the store is off). */
export async function recipeItems(): Promise<AddItem[]> {
  const { list } = await listUserWidgets();
  const all = await Promise.all(list.map((w) => loadRecipe(w.id)));
  return all.flatMap((l) => (l.recipe ? [recipeItem(l.recipe)] : []));
}
