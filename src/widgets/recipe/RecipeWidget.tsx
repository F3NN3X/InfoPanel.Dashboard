// The recipe module's component (its own lazy chunk, `resolve.ts`): reads the placement's recipe from the server, validates it
// (`store.ts`: on every load), and draws it. A recipe that is missing or refused draws the standard empty card, never an error;
// with user widgets switched off on the server (`USER_WIDGETS=off`) it draws nothing.
import { useEffect, useState } from "react";
import { useSensors } from "@/hooks/useSensors";
import type { ModuleSettings } from "@/modules/types";
import { Empty, shell, Widget, type ShellProps } from "../kit";
import RecipeView from "./RecipeView";
import { recipeReads } from "./reads";
import { loadRecipe, type LoadedRecipe } from "./store";
import { WEATHER_PREFIX } from "./weather";

export interface RecipeWidgetProps extends ShellProps {
  look?: ModuleSettings;
  /** The placement's module id, `recipe:<id>`. */
  recipe: string;
  saved?: ModuleSettings;
}

export default function RecipeWidget(p: RecipeWidgetProps) {
  const [loaded, setLoaded] = useState<LoadedRecipe>();
  useEffect(() => {
    let live = true;
    void loadRecipe(p.recipe).then((l) => live && setLoaded(l));
    return () => {
      live = false;
    };
  }, [p.recipe]);
  // Its places' weather, asked for here: the placement reads every Data API key until its next tick narrows it to the recipe's
  // reads, and "every sensor" leaves the dashboard server's weather stream closed (a page holds few connections to its server)
  useSensors(loaded?.recipe ? recipeReads(loaded.recipe)(p.saved).filter((k) => k.startsWith(WEATHER_PREFIX)) : []);
  if (loaded?.off) return null;
  if (loaded?.recipe) return <RecipeView {...p} recipe={loaded.recipe} />;
  const why = loaded?.issues.find((i) => i.severity === "error");
  return (
    <Widget {...shell(p)} title={p.title ?? p.recipe.slice(7)} icon="dashboard" design={null}>
      {loaded && <Empty icon="dashboard" label="Widget not available" hint={why ? why.message.slice(0, 120) : undefined} large />}
    </Widget>
  );
}
