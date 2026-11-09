import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { knownWidget, placementContent } from "@/components/studio/placement-content";
import type { Placement } from "@/lib/layout";
import { STANDARD_KEYS } from "@/modules/standard-settings";
import RecipeWidget from "@/widgets/recipe/RecipeWidget";
import { isRecipeId, recipeModule } from "@/widgets/recipe/resolve";
import { forgetRecipe, loadRecipe, removeWidget, storePackage } from "@/widgets/recipe/store";
import type { PackageFile } from "@/widgets/recipe/types";
import { fixtureFiles, withFile } from "./fixture-files";

// How a placement's `recipe:<id>` becomes something drawn: the resolve hook in the kiosk entry, the store's load (validated every
// time, off when the server says so), and a missing or refused recipe drawn as the standard empty card, never an error.

afterEach(() => {
  vi.unstubAllGlobals();
  for (const id of ["recipe:cpu-card", "recipe:gpu-card", "recipe:gone"]) forgetRecipe(id);
});

/** A fetch that serves `files` under `/api/widgets/<key>/` and takes every write, `off` saying the store is switched off. */
function serve(key: string, files: readonly PackageFile[], off = false) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    const headers: Record<string, string> = off ? { "X-User-Widgets": "off" } : {};
    if (off) return new Response(null, { status: url === "/api/widgets" ? 200 : 404, headers });
    if (init?.method === "POST") return new Response("{}", { status: 200 });
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    const path = url.startsWith(`/api/widgets/${key}/`) ? url.slice(`/api/widgets/${key}/`.length) : undefined;
    const file = files.find((f) => f.path === path);
    return file ? new Response(file.bytes, { status: 200 }) : new Response(null, { status: 404 });
  });
  return calls;
}

describe("the recipe resolve hook", () => {
  it("takes recipe ids only", () => {
    for (const ok of ["recipe:a", "recipe:cpu-card", `recipe:${"a".repeat(48)}`]) expect(isRecipeId(ok), ok).toBe(true);
    for (const bad of ["GpuMonitor", "recipe:", "recipe:A", "recipe:-a", "recipe:a.b", "recipe.a", "ext:me.a", `recipe:${"a".repeat(49)}`, undefined]) expect(isRecipeId(bad), String(bad)).toBe(false);
    expect(recipeModule("GpuMonitor")).toBeUndefined();
  });

  it("makes one module per id, with the standard look rows, drawn only with data as the built-ins are", () => {
    const mod = recipeModule("recipe:cpu-card")!;
    expect(recipeModule("recipe:cpu-card")).toBe(mod);
    expect(mod.id).toBe("recipe:cpu-card");
    expect(mod.settings?.some((s) => STANDARD_KEYS.has(s.key))).toBe(true);
    expect(typeof mod.preload).toBe("function");
    expect(mod.render({}, {})).toBeNull();
    expect(mod.render({ "libre.x": { value: 1, unit: "%" } }, {})).not.toBeNull();
  });

  it("is what a placement of a recipe draws, in the kiosk and on a Free page", () => {
    const p: Placement = { id: "z", module: "recipe:cpu-card", colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 2, visible: true };
    const drawn = placementContent(p, { "libre.x": { value: 1, unit: "%" } }, []);
    expect(drawn.content).not.toBeNull();
    expect(drawn.hasData).toBe(true);
    expect(knownWidget("recipe:cpu-card")).toBe(true);
    expect(knownWidget("recipe:Bad")).toBe(false);
  });
});

describe("loading a recipe", () => {
  it("reads the manifest, then each file it lists, and validates them", async () => {
    const calls = serve("recipe.gpu-card", fixtureFiles("gpu-card"));
    const loaded = await loadRecipe("recipe:gpu-card");
    expect(loaded.issues).toEqual([]);
    expect(loaded.recipe?.name).toBe("GPU card");
    expect(calls.sort()).toEqual(["GET /api/widgets/recipe.gpu-card/images/logo.png", "GET /api/widgets/recipe.gpu-card/manifest.json", "GET /api/widgets/recipe.gpu-card/recipe.json"]);
  });

  it("refuses a package whose files are not its manifest's, on every load", async () => {
    const files = fixtureFiles("cpu-card");
    const recipe = files.find((f) => f.path === "recipe.json")!.bytes.slice();
    recipe[recipe.length - 2] = 0x20;
    serve("recipe.cpu-card", withFile(files, "recipe.json", recipe));
    const loaded = await loadRecipe("recipe:cpu-card");
    expect(loaded.recipe).toBeUndefined();
    expect(loaded.issues.map((i) => i.rule)).toContain("hash");
  });

  it("says a recipe that is not on the server is missing, and one the server has switched off is off", async () => {
    serve("recipe.gone", []);
    expect((await loadRecipe("recipe:gone")).issues.map((i) => i.rule)).toEqual(["missing"]);
    forgetRecipe("recipe:gone");
    serve("recipe.gone", [], true);
    expect(await loadRecipe("recipe:gone")).toEqual({ issues: [], off: true });
  });

  it("draws nothing yet while the recipe loads, and never throws", () => {
    expect(() => renderToStaticMarkup(<RecipeWidget data={{}} recipe="recipe:gone" />)).not.toThrow();
  });
});

describe("storing a recipe", () => {
  it("validates first and sends nothing the validator refuses", async () => {
    const calls = serve("recipe.cpu-card", []);
    const broken = withFile(fixtureFiles("cpu-card"), "manifest.json", "{}");
    expect(await storePackage(broken)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("posts the files, then reads them back through the route before saying yes", async () => {
    const files = fixtureFiles("cpu-card");
    const calls = serve("recipe.cpu-card", files);
    expect(await storePackage(files)).toBeUndefined();
    expect(calls[0]).toBe("POST /api/widgets");
    expect(calls.slice(1).sort()).toEqual(["GET /api/widgets/recipe.cpu-card/manifest.json", "GET /api/widgets/recipe.cpu-card/recipe.json"]);
    expect(await removeWidget("recipe:cpu-card")).toBe(true);
  });
});
