// The resolve hook for recipe widgets: the one piece in the kiosk entry. A placement whose module is `recipe:<id>` (Gate 0
// answer 5) and that no registered widget claims gets a module made here, drawn by the recipe chunk (`RecipeWidget.tsx`),
// which fetches, validates and draws the recipe; until then, and for a recipe that is missing or refused, that chunk draws
// the standard empty card. The module goes through `templateModule`, so the standard look, the theme and the pack apply as
// for a built-in widget.
//
// A code widget (`ext:<publisher>.<name>`, Phase 6b) resolves here too, to the code chunk (`code/CodeWidget.tsx`), which imports
// its bundle only after the server verified it (`code/loader.ts`); this file holds nothing of that but the id test.
import { useEffect, useState } from "react";
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { lazyWidget } from "../lazy-widget";
import { templateModule } from "../module";

/** A recipe id: `recipe:` and a lowercase name of up to 48 (widgets.rs `is_widget_key`). */
export const isRecipeId = (id: unknown): id is string => typeof id === "string" && /^recipe:[a-z0-9][a-z0-9-]{0,47}$/.test(id);
/** A code widget id: `ext:<publisher>.<name>`, a publisher of up to 32 and a name of up to 48 (widgets.rs `is_widget_key`). */
export const isCodeId = (id: unknown): id is string => typeof id === "string" && /^ext:[a-z0-9][a-z0-9-]{0,31}\.[a-z0-9][a-z0-9-]{0,47}$/.test(id);

// one call site for the chunk: the widget, and the store its placements load their reads through (`loadReads`)
const chunk = () => import("./RecipeWidget");
const RecipeWidget = lazyWidget(chunk);
const CodeWidget = lazyWidget(() => import("../code/CodeWidget"));
const made = new Map<string, DashboardModule>();

/** The module that draws a recipe or code widget placement, or undefined for an id that is neither. One per id. */
export function recipeModule(id: string): DashboardModule | undefined {
  const code = isCodeId(id);
  if (!code && !isRecipeId(id)) return undefined;
  let mod = made.get(id);
  if (!mod) {
    const meta = { id, name: id.slice(code ? 4 : 7), category: "Recipes", icon: "dashboard", prefixes: [], defaultSize: [3, 2] as [number, number], minSize: [1, 1] as [number, number], description: "" };
    mod = code
      ? templateModule({ meta, Component: CodeWidget, settings: [], toProps: (_look, saved) => ({ code: id, saved }) })
      : templateModule({ meta, Component: RecipeWidget, settings: [], toProps: (_look, saved) => ({ recipe: id, saved }) });
    made.set(id, mod);
  }
  return mod;
}

/** Told whenever a recipe's reads change, so its placements subscribe again (`useRecipeReads`). */
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
  for (const heard of readers) heard();
}

/** Calls `heard` whenever a recipe's reads change; returns the unsubscribe. */
export function subscribeReads(heard: () => void): () => void {
  readers.add(heard);
  return () => void readers.delete(heard);
}

/**
 * Loads a recipe's reads (the recipe chunk and the recipe, once: the store keeps it): what a placement waits for, not a key. A recipe
 * that reads only weather by place has no key to wait for until its reads open the weather stream.
 */
export const loadReads = (id: string): Promise<unknown> => chunk().then((m) => m.loadRecipe(id)).catch(() => undefined);

/** A placement of `module`: when it is a recipe, starts loading its reads and draws again when they change (and once they are in,
 * should they have come between its render and this effect). */
export function useRecipeReads(module: string): void {
  const [, heard] = useState(0);
  useEffect(() => {
    if (!isRecipeId(module)) return;
    const again = () => heard((n) => n + 1);
    const stop = subscribeReads(again);
    void loadReads(module).then(again);
    return stop;
  }, [module]);
}
