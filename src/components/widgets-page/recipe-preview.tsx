// A recipe drawn as a placement of it would be, before it is stored: the browse cards, the detail pane and the builder's stage.
// It goes through one template module (the shell, the zone's look, the theme, a pack's T3 values) whose component reads the
// recipe from context, so a draft that changes on every edit needs no module of its own. A zone is drawn at its size on the
// validator's nominal grid (`metrics.ts`), so what the stage shows at 2×2 is what the floor was checked at, then scaled to its box.
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { tokenScope } from "@/components/widget-style";
import { useSensors } from "@/hooks/useSensors";
import { resolveWith, type Appearance } from "@/lib/style-resolve";
import { chromeOf } from "@/modules/standard-settings";
import type { ModuleSettings } from "@/modules/types";
import { NOMINAL_CELL } from "@/widgets/recipe/metrics";
import { recipeReads } from "@/widgets/recipe/reads";
import RecipeView, { type RecipeViewProps } from "@/widgets/recipe/RecipeView";
import type { Cells, Recipe } from "@/widgets/recipe/types";
import { templateModule } from "@/widgets/module";

const Draft = createContext<{ recipe: Recipe; sample: boolean } | null>(null);

function DraftRecipe(p: Omit<RecipeViewProps, "recipe">) {
  const draft = useContext(Draft)!;
  return <RecipeView {...p} recipe={draft.recipe} sample={draft.sample} />;
}

const meta = { id: "recipe:draft", name: "Recipe", category: "Recipes", icon: "dashboard", prefixes: [], defaultSize: [3, 2] as Cells, minSize: [1, 1] as Cells, description: "" };
const draftModule = templateModule({ meta, Component: DraftRecipe, settings: [], toProps: (_look, saved) => ({ saved }) });
// a draft draws with or without data (its Sample has its own readings)
draftModule.readsFor = () => [];

/** The gap between grid cells on the nominal grid. */
const GAP = 8;
/** A zone of `cells` on the nominal grid, px. */
export const zonePx = (cells: Cells): { w: number; h: number } => ({ w: cells[0] * NOMINAL_CELL.w + (cells[0] - 1) * GAP, h: cells[1] * NOMINAL_CELL.h + (cells[1] - 1) * GAP });

/** Option values as a placement stores them (a place list as JSON text). */
export function storedValues(recipe: Recipe, values: Record<string, unknown>): ModuleSettings {
  return Object.fromEntries(recipe.options.flatMap((o) => (values[o.key] === undefined ? [] : [[o.key, o.type === "place-list" ? JSON.stringify(values[o.key]) : values[o.key]]]))) as ModuleSettings;
}

export interface RecipePreviewProps {
  recipe: Recipe;
  /** The placement's option values (unset: the defaults). */
  values?: Record<string, unknown>;
  cells: Cells;
  /** The recipe's sample readings instead of the live ones. */
  sample: boolean;
  appearance?: Appearance;
  /** The page's theme variables and font. */
  pageStyle?: CSSProperties;
  /** A Look to draw it in ("Preview in"); unset: the screen's. */
  lookId?: string;
  /** The box it is scaled into, px; the scale never goes over `maxScale`. */
  fit: { w: number; h: number };
  maxScale?: number;
  /** Drawn over the zone, in its own px (the stage's selection). */
  overlay?: ReactNode;
}

/**
 * Live readings, or none for a sample (its own readings come from the recipe). "Every sensor" is the Data API's; the weather of the
 * recipe's places is the dashboard server's own stream, kept open here by its prefixes (`weather.place.<id>.`).
 */
function useReadings(sample: boolean, recipe: Recipe, own: ModuleSettings) {
  const weather = sample ? [] : recipeReads(recipe)(own).filter((k) => k.startsWith("weather."));
  useSensors(weather);
  return useSensors(sample ? [] : null);
}

export function RecipePreview({ recipe, values, cells, sample, appearance, pageStyle, lookId, fit, maxScale = 1, overlay }: RecipePreviewProps) {
  const own: ModuleSettings = { ...storedValues(recipe, values ?? {}), ...(lookId ? { lookId } : {}) };
  const sensors = useReadings(sample, recipe, own);
  const settings = resolveWith(appearance, own, undefined, undefined, draftModule.settings) ?? own;
  const scope = tokenScope(chromeOf(settings)) as CSSProperties;
  const { w, h } = zonePx(cells);
  const scale = Math.min(maxScale, fit.w / w, fit.h / h);
  return (
    <div className="relative shrink-0" style={{ width: w * scale, height: h * scale }}>
      <div data-recipe-zone="" className="absolute left-0 top-0 origin-top-left text-foreground" style={{ ...pageStyle, ...scope, width: w, height: h, transform: `scale(${scale})` }}>
        <Draft.Provider value={{ recipe, sample }}>{draftModule.render(sensors, settings)}</Draft.Provider>
        {overlay}
      </div>
    </div>
  );
}
