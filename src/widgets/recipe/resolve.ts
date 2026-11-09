// The resolve hook for recipe widgets: the one piece in the kiosk entry. A placement whose module is `recipe:<id>` (Gate 0
// answer 5) and that no registered widget claims gets a module made here, drawn by the recipe chunk (`RecipeWidget.tsx`),
// which fetches, validates and draws the recipe; until then, and for a recipe that is missing or refused, that chunk draws
// the standard empty card. The module goes through `templateModule`, so the standard look, the theme and the pack apply as
// for a built-in widget.
import { useEffect, useSyncExternalStore } from "react";
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { lazyWidget } from "../lazy-widget";
import { templateModule } from "../module";

/** A recipe id: `recipe:` and a lowercase name of up to 48 (widgets.rs `is_widget_key`). */
export const isRecipeId = (id: unknown): id is string => typeof id === "string" && /^recipe:[a-z0-9][a-z0-9-]{0,47}$/.test(id);

const RecipeWidget = lazyWidget(() => import("./RecipeWidget"));
const made = new Map<string, DashboardModule>();

/** The module that draws a recipe placement, or undefined for an id that is not a recipe's. One per id. */
export function recipeModule(id: string): DashboardModule | undefined {
  if (!isRecipeId(id)) return undefined;
  let mod = made.get(id);
  if (!mod) {
    const meta = { id, name: id.slice(7), category: "Recipes", icon: "dashboard", prefixes: [], defaultSize: [3, 2] as [number, number], minSize: [1, 1] as [number, number], description: "" };
    mod = templateModule({ meta, Component: RecipeWidget, settings: [], toProps: (_look, saved) => ({ recipe: id, saved }) });
    made.set(id, mod);
  }
  return mod;
}

/** Bumped whenever a recipe's reads change, so its placements subscribe again (`useRecipeReads`). */
let readsVersion = 0;
const readers = new Set<() => void>();

/**
 * What a recipe's placements read from now on (`DashboardModule.readsFor`, set by the store when the recipe has loaded): its keys,
 * `[]` for one that is missing or refused (so the empty card draws without data), none to forget them. Until then a placement reads
 * every key; its placements hear the change and narrow the subscription at once.
 */
export function learnReads(id: string, keys?: (saved: ModuleSettings | undefined) => string[]): void {
  const mod = recipeModule(id);
  if (!mod) return;
  mod.readsFor = keys;
  readsVersion++;
  for (const heard of readers) heard();
}

/** Calls `heard` whenever a recipe's reads change; returns the unsubscribe. */
export function subscribeReads(heard: () => void): () => void {
  readers.add(heard);
  return () => void readers.delete(heard);
}

/**
 * Loads a recipe's reads (the recipe chunk and the recipe) unless they are known: what a placement waits for, not a key. A recipe
 * that reads only weather by place has no key to wait for until its reads open the weather stream.
 */
export const loadReads = (id: string): Promise<unknown> =>
  recipeModule(id)?.readsFor ? Promise.resolve() : import("./store").then((s) => s.loadRecipe(id)).catch(() => undefined);

const unheard = () => () => {};
const version = () => readsVersion;

/** A placement of `module`: when it is a recipe, starts loading its reads and draws again when they change. */
export function useRecipeReads(module: string): void {
  const recipe = isRecipeId(module) ? module : undefined;
  useSyncExternalStore(recipe ? subscribeReads : unheard, version, version);
  useEffect(() => {
    if (recipe) void loadReads(recipe);
  }, [recipe]);
}
