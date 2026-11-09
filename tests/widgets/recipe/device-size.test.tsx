import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cellsOf } from "@/widgets/recipe/metrics";
import { expandKey, recipeReads } from "@/widgets/recipe/reads";
import RecipeView, { holds } from "@/widgets/recipe/RecipeView";
import type { Block, PackageFile, Recipe, RingBlock } from "@/widgets/recipe/types";
import { sizeHolds, validateRecipe } from "@/widgets/recipe/validate";
import { fixtureRecipe, variant } from "./fixture-files";

// Phase 5b's two format additions: a `device` option a sensor key names in braces (a recipe that reads whichever CPU or GPU a
// person picks, Auto the first the data has), and a size condition in `when` (a part that leaves a zone too small for its text).
// Each in the validator, the renderer and the data gate.

const errors = (files: readonly PackageFile[]): string[] => [...new Set(validateRecipe({ files }).filter((i) => i.severity === "error").map((i) => i.rule))];
const topRow = (r: Recipe) => r.root.children[0] as Extract<Block, { type: "row" }>;
const ring = (r: Recipe) => topRow(r).children[0] as RingBlock;
const values = (r: Recipe) => topRow(r).children[1] as Extract<Block, { type: "row" }>;

/** The CPU card reading its CPU through a device option: the ring's load and the header's name from `libre.{cpu}_cpu_total`. */
function byDevice(r: Recipe): void {
  r.options.unshift({ key: "cpu", label: "CPU", type: "device", kind: "cpu", default: "auto" });
  ring(r).bind = { sensor: "libre.{cpu}_cpu_total" };
  r.root.subtitle = { sensor: "libre.{cpu}_cpu_total" };
}

describe("device options", () => {
  it("validate: a device option names its kind, its default is auto or a device id, and only it has a kind", async () => {
    expect(errors(await variant("cpu-card", byDevice))).toEqual([]);
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), (r.options[0].default = "amd_ryzen_9_9950x3d"))))).toEqual([]);
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), delete r.options[0].kind)))).toEqual(["option"]);
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), (r.options[0].default = "AMD Ryzen"))))).toEqual(["option"]);
    expect(errors(await variant("cpu-card", (r) => r.options.push({ key: "flag", label: "F", type: "boolean", default: true, kind: "cpu" })))).toEqual(["option"]);
    expect(errors(await variant("cpu-card", (r) => r.options.push({ key: "dev", label: "D", type: "device", kind: "fan" as "cpu", default: "auto" })))).toEqual(["schema"]);
  });

  it("validate: a key names device options only, and a device is read through a key, not bound as a value", async () => {
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), (ring(r).bind = { sensor: "libre.{gpu}_gpu_core_load" }))))).toEqual(["binding"]);
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), (ring(r).bind = { sensor: "libre.{showClock}_cpu_total" }))))).toEqual(["binding"]);
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), (ring(r).bind = { sensor: "{cpu}" }))))).toEqual(["binding"]);
    expect(errors(await variant("cpu-card", (r) => (byDevice(r), (ring(r).bind = { option: "cpu" }))))).toEqual(["binding"]);
  });

  it("renders the picked device, or on Auto the first CPU the data has, and names it in the header", () => {
    const recipe = fixtureRecipe("cpu-card");
    byDevice(recipe);
    const data = { "libre.amd_ryzen_9_9950x3d_cpu_total": "64 %", "libre.intel_core_i9_14900k_cpu_total": "41 %" };
    const draw = (saved: Record<string, string>) => renderToStaticMarkup(<RecipeView data={data} recipe={recipe} saved={saved} />);
    expect(draw({})).toContain(">64<");
    expect(draw({ cpu: "intel_core_i9_14900k" })).toContain(">41<");
    expect(draw({ cpu: "intel_core_i9_14900k" })).toContain("14900K");
    expect(draw({})).toContain("Ryzen 9 9950X3D");
    // a device the data does not have reads nothing (a dash), never another device's value
    expect(draw({ cpu: "gone" })).not.toContain(">64<");
  });

  it("names the device in the header from a plain key too, when no reading name is known", () => {
    const recipe = fixtureRecipe("cpu-card");
    recipe.root.subtitle = { sensor: "libre.amd_ryzen_9_9950x3d_cpu_total" };
    expect(renderToStaticMarkup(<RecipeView data={{ "libre.amd_ryzen_9_9950x3d_cpu_total": "64 %" }} recipe={recipe} />)).toContain("Ryzen 9 9950X3D");
  });

  it("expands a key per placement, and the data gate reads the picked device's key, else the part before it", () => {
    const recipe = fixtureRecipe("cpu-card");
    byDevice(recipe);
    expect(expandKey(recipe, "libre.{cpu}_cpu_total", { cpu: "auto" }, { "libre.x_cpu_total": "1" })).toEqual({ key: "libre.x_cpu_total", device: "x" });
    expect(expandKey(recipe, "libre.{cpu}_cpu_total", { cpu: "auto" })).toEqual({ device: undefined });
    const reads = recipeReads(recipe);
    expect(reads({ cpu: "intel_core_i9_14900k" })).toContain("libre.intel_core_i9_14900k_cpu_total");
    expect(reads({})).toContain("libre.");
    expect(reads({}).some((k) => k.includes("{"))).toBe(false);
  });
});

describe("size conditions", () => {
  it("hold inside their range and when the size is not known yet", () => {
    const when = { size: { min: [2, 1] as [number, number], max: [4, 3] as [number, number] } };
    expect(sizeHolds(when, [1, 1])).toBe(false);
    expect(sizeHolds(when, [2, 1])).toBe(true);
    expect(sizeHolds(when, [4, 3])).toBe(true);
    expect(sizeHolds(when, [5, 3])).toBe(false);
    expect(holds(when, {}, undefined)).toBe(true);
    // with an option part, both must hold
    expect(holds({ option: "a", is: true, size: { min: [2, 2] } }, { a: true }, [2, 2])).toBe(true);
    expect(holds({ option: "a", is: true, size: { min: [2, 2] } }, { a: false }, [2, 2])).toBe(false);
    expect(holds({ option: "a", is: true, size: { min: [2, 2] } }, { a: true }, [1, 2])).toBe(false);
  });

  it("read the card's box in the validator's nominal cells", () => {
    expect(cellsOf(0, 100)).toBeUndefined();
    expect(cellsOf(120, 100)).toEqual([1, 1]);
    expect(cellsOf(376, 208)).toEqual([3, 2]);
    expect(cellsOf(40, 30)).toEqual([1, 1]);
  });

  it("validate: an option or a size, is/not only with an option, whole cells, min not over max", async () => {
    const cpu = (edit: (r: Recipe) => void) => variant("cpu-card", edit);
    expect(errors(await cpu((r) => (ring(r).when = { size: { min: [2, 2] } })))).toEqual([]);
    expect(errors(await cpu((r) => (ring(r).when = { option: "showClock", is: true, size: { max: [4, 3] } })))).toEqual([]);
    expect(errors(await cpu((r) => (ring(r).when = { is: true })))).toEqual(["block"]);
    expect(errors(await cpu((r) => (ring(r).when = { size: { min: [2.5, 2] } })))).toEqual(["block"]);
    expect(errors(await cpu((r) => (ring(r).when = { size: { min: [3, 2], max: [2, 2] } })))).toEqual(["block"]);
    expect(errors(await cpu((r) => (ring(r).when = {} as never)))).toEqual(["schema"]);
    expect(errors(await cpu((r) => (ring(r).when = { size: {} } as never)))).toEqual(["schema"]);
  });

  it("text-floor: a text hidden below a size is not checked there, so a 1x1 'Ring only' passes", async () => {
    // down to 1x1, the values column (0.9 x a 7.5 px base) is under the floor at one column
    const oneByOne = (r: Recipe) => {
      r.size.min = [1, 1];
      r.presets.find((p) => p.id === "ring")!.size = [1, 1];
    };
    expect(errors(await variant("cpu-card", oneByOne))).toEqual(["text-floor"]);
    expect(errors(await variant("cpu-card", (r) => (oneByOne(r), (values(r).when = { option: "showValues", is: true, size: { min: [2, 1] } }))))).toEqual([]);
    // a condition on an ancestor counts for the texts under it (the top row, ring and values, gone at one column)
    expect(errors(await variant("cpu-card", (r) => (oneByOne(r), (topRow(r).when = { size: { min: [2, 1] } }))))).toEqual([]);
    expect(errors(await variant("cpu-card", (r) => (oneByOne(r), (topRow(r).when = { size: { max: [3, 3] } }))))).toEqual(["text-floor"]);
  });
});

describe("options in the Content tab", () => {
  it("are the recipe's options as rows after the standard ones, a device as its kind's picker, a place list left to 5c", async () => {
    const { learnSettings, recipeSettings } = await import("@/widgets/recipe/settings");
    const { recipeModule } = await import("@/widgets/recipe/resolve");
    const recipe = fixtureRecipe("cpu-card");
    byDevice(recipe);
    expect(recipeSettings(recipe).map((s) => [s.key, s.type, s.default])).toEqual([
      ["cpu", "select", "auto"],
      ["load", "sensor", "libre.amd_ryzen_9_9950x3d_cpu_total"],
      ["temp", "sensor", "libre.amd_ryzen_9_9950x3d_core__tctl_tdie"],
      ["showClock", "boolean", true],
      ["showValues", "boolean", true],
      ["showHistory", "boolean", true],
      ["showCores", "boolean", false],
    ]);
    expect(recipeSettings(recipe)[0]).toMatchObject({ optionsFrom: "cpu", tab: "show" });
    expect(recipeSettings(fixtureRecipe("weather-places")).map((s) => s.key)).toEqual(["units", "hours", "layout"]);
    const mod = recipeModule("recipe:settings-test")!;
    const standard = mod.settings!.length;
    learnSettings(mod, recipe);
    learnSettings(mod, recipe);
    expect(mod.settings!.length).toBe(standard + 7);
    learnSettings(mod);
    expect(mod.settings!.length).toBe(standard);
  });
});
