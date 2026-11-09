// The recipes on the server, for the studio's Add panel: listed, each loaded and validated (`store.ts`, a lazy chunk shared with
// the recipe renderer, so the studio entry carries only this hook). A recipe the validator refuses is not offered; with user
// widgets switched off on the server the list is empty.
import { useEffect, useState } from "react";
import type { Recipe } from "./types";

let pending: Promise<readonly Recipe[]> | undefined;
let loaded: readonly Recipe[] = [];

/** The recipes the server holds that pass the validator, loaded once (again after `reloadRecipes`). */
export const loadRecipes = (): Promise<readonly Recipe[]> =>
  (pending ??= import("./store").then(async ({ listUserWidgets, loadRecipe }) => {
    const { list } = await listUserWidgets();
    const all = await Promise.all(list.map((w) => loadRecipe(w.id)));
    return all.flatMap((l) => (l.recipe ? [l.recipe] : []));
  }));

/** Reads the list again on the next load (a package was imported or removed). */
export const reloadRecipes = (): void => {
  pending = undefined;
};

/** The recipes to offer; empty until the list has loaded. */
export function useRecipes(): readonly Recipe[] {
  const [list, setList] = useState(loaded);
  useEffect(() => {
    let live = true;
    void loadRecipes().then((r) => {
      loaded = r;
      if (live) setList(r);
    });
    return () => {
      live = false;
    };
  }, []);
  return list;
}
