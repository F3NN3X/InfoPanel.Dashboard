// The keys a recipe placement reads, for its data gate and its subscription (`DashboardModule.readsFor`, the gate the built-ins
// have through their prefixes): every sensor binding in its blocks, and the value of each sensor option (the placement's
// stored one, else the recipe's default). A Repeat over places reads no sensor (5c serves its weather under a namespace of
// its own). A recipe that reads none draws without data.
import type { ModuleSettings } from "@/modules/types";
import type { Binding, Block, Recipe } from "./types";

/** The sensor keys bound by name anywhere in the tree (a binding to an option is the option's, read per placement). */
function boundSensors(recipe: Recipe): string[] {
  const keys = new Set<string>();
  const add = (b: Binding | undefined) => {
    if (b && "sensor" in b) keys.add(b.sensor);
  };
  const walk = (b: Block) => {
    if ("bind" in b) add(b.bind);
    if ("cells" in b) for (const c of b.cells ?? []) add(c);
    if ("children" in b) for (const c of b.children) walk(c);
  };
  add(recipe.root.subtitle);
  walk(recipe.root);
  return [...keys];
}

/** A placement's keys, sorted: the recipe's bound sensors and its sensor options' values. */
export function recipeReads(recipe: Recipe): (saved: ModuleSettings | undefined) => string[] {
  const fixed = boundSensors(recipe);
  const options = recipe.options.filter((o) => o.type === "sensor");
  return (saved) => {
    const chosen = options.flatMap((o) => String(saved?.[o.key] ?? o.default ?? "").split(",").filter(Boolean));
    return [...new Set([...fixed, ...chosen])].sort();
  };
}
