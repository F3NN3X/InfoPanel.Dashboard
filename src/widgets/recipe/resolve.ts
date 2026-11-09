// The resolve hook for recipe widgets: the one piece in the kiosk entry. A placement whose module is `recipe:<id>` (Gate 0
// answer 5) and that no registered widget claims gets a module made here, drawn by the recipe chunk (`RecipeWidget.tsx`),
// which fetches, validates and draws the recipe; until then, and for a recipe that is missing or refused, that chunk draws
// the standard empty card. The module goes through `templateModule`, so the standard look, the theme and the pack apply as
// for a built-in widget.
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { lazyWidget } from "../lazy-widget";
import { templateModule } from "../module";

/** A recipe id: `recipe:` and a lowercase name of up to 48 (widgets.rs `is_widget_key`). */
export const isRecipeId = (id: unknown): id is string => typeof id === "string" && /^recipe:[a-z0-9][a-z0-9-]{0,47}$/.test(id);

const RecipeWidget = lazyWidget(() => import("./RecipeWidget"));
const made = new Map<string, DashboardModule>();
/** Each loaded recipe's keys per placement (`reads.ts`, set by the store when the recipe has loaded). */
const reads = new Map<string, (saved: ModuleSettings | undefined) => string[]>();

/**
 * What a recipe's placements read from now on: its keys once loaded (`[]` for one that is missing or refused, so the empty
 * card draws without data; none forgets them). Until then a placement reads every key, and its next tick narrows the subscription.
 */
export const learnReads = (id: string, keys?: (saved: ModuleSettings | undefined) => string[]): void => void (keys ? reads.set(id, keys) : reads.delete(id));

/** The module that draws a recipe placement, or undefined for an id that is not a recipe's. One per id. */
export function recipeModule(id: string): DashboardModule | undefined {
  if (!isRecipeId(id)) return undefined;
  let mod = made.get(id);
  if (!mod) {
    const meta = { id, name: id.slice(7), category: "Recipes", icon: "dashboard", prefixes: [], defaultSize: [3, 2] as [number, number], minSize: [1, 1] as [number, number], description: "" };
    mod = templateModule({ meta, Component: RecipeWidget, settings: [], toProps: (_look, saved) => ({ recipe: id, saved }), readsFor: (saved) => reads.get(id)?.(saved) });
    made.set(id, mod);
  }
  return mod;
}
