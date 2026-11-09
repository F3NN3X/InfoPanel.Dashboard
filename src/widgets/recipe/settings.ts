// A recipe's options as rows of its placements' Content tab (Phase 5b): what people can change when they add the widget, as the
// builder's Options tab orders them. Set on the recipe's module by the store once the recipe has loaded (`store.ts`), so the kiosk
// entry carries none of it. A place list is a text row of JSON (a setting is a scalar) that the studio edits with place search.
import { STANDARD_KEYS } from "@/modules/standard-settings";
import type { DashboardModule, ModuleSetting } from "@/modules/types";
import type { Recipe, RecipeOption } from "./types";

/** One option as a Content tab row. */
function rowOf(o: RecipeOption): ModuleSetting {
  const base = { key: o.key, label: o.label, group: o.group ?? "Options", ...(o.hint ? { hint: o.hint } : {}), tab: "show" as const };
  switch (o.type) {
    case "place-list":
      return { ...base, type: "text", default: JSON.stringify(o.default), places: true };
    case "device":
      return { ...base, type: "select", default: "auto", optionsFrom: o.kind };
    case "select":
      return { ...base, type: "select", default: String(o.default), options: o.options ?? [] };
    case "number":
      return { ...base, type: "number", default: Number(o.default), min: o.min, max: o.max, step: o.step };
    case "boolean":
      return { ...base, type: "boolean", default: o.default === true };
    default:
      return { ...base, type: o.type, default: String(o.default) };
  }
}

/** A recipe's Content tab rows. */
export const recipeSettings = (recipe: Recipe): ModuleSetting[] => recipe.options.map(rowOf);

/** The module's rows: its standard look rows, then the recipe's (none to forget them). */
export function learnSettings(mod: DashboardModule, recipe?: Recipe): void {
  mod.settings = [...(mod.settings ?? []).filter((s) => STANDARD_KEYS.has(s.key)), ...(recipe ? recipeSettings(recipe) : [])];
}
