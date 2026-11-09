import { describe, expect, it } from "vitest";
import { packageOf } from "@/widgets/recipe/package";
import type { Block, CardBlock, PackageFile, Recipe, RingBlock } from "@/widgets/recipe/types";
import { BLOCKS_MAX, checkPackage, DEPTH_MAX, FILE_COUNT_MAX, hashIssues, OPTIONS_MAX, PACKAGE_MAX_BYTES, PRESETS_MAX, RECIPE_MAX_BYTES, validateRecipe } from "@/widgets/recipe/validate";
import { fixtureFiles, fixtureImages, fixtureRecipe, manifestOfFiles, variant, withFile } from "./fixture-files";

// The recipe validator: one case per rule, plus its boundaries. Each case starts from a fixture package that passes and changes
// one thing (its manifest written again where the change is the recipe's), so the rule it names is the one that fires.

/** The rules that refuse a package, each once. */
const errors = (files: readonly PackageFile[]): string[] => [...new Set(validateRecipe({ files }).filter((i) => i.severity === "error").map((i) => i.rule))];
const cpu = (edit: (r: Recipe) => void) => variant("cpu-card", edit);
const rootOf = (r: Recipe): CardBlock => r.root;
/** The CPU card's top row, its ring and its values column. */
const topRow = (r: Recipe) => rootOf(r).children[0] as Extract<Block, { type: "row" }>;
const ring = (r: Recipe) => topRow(r).children[0] as RingBlock;
const enc = new TextEncoder();

describe("validateRecipe", () => {
  // the root card is depth 1: nest(n) puts n rows and a label under it, the label at depth n + 2
  it("passes the three fixture packages, hashes included", async () => {
    for (const name of ["cpu-card", "gpu-card", "weather-places"]) {
      const checked = await checkPackage({ files: fixtureFiles(name) });
      expect(checked.issues, name).toEqual([]);
      expect(checked.recipe?.id).toBe(`recipe:${name}`);
    }
  });

  it("json-shape: a key that names the prototype chain", async () => {
    const files = await cpu(() => {});
    const text = new TextDecoder().decode(files.find((f) => f.path === "recipe.json")!.bytes).replace('"format": 1,', '"format": 1, "__proto__": {},');
    expect(errors(withFile(files, "recipe.json", text))).toContain("json-shape");
  });

  it("schema: a missing field, a field no recipe has, a manifest without its files", async () => {
    expect(errors(await cpu((r) => void delete (r as Partial<Recipe>).name))).toEqual(["schema"]);
    expect(errors(await cpu((r) => Object.assign(r, { script: "x" })))).toEqual(["schema"]);
    const files = await cpu(() => {});
    expect(errors(withFile(files, "manifest.json", JSON.stringify({ ...manifestOfFiles(files), files: undefined })))).toContain("schema");
    expect(errors(withFile(files, "recipe.json", "not json"))).toEqual(["schema"]);
  });

  it("block-type: a block this build does not have, wherever it stands", async () => {
    const files = await cpu((r) => topRow(r).children.push({ type: "chart" } as unknown as Block));
    expect(errors(files)).toContain("block-type");
    expect(validateRecipe({ files }).find((i) => i.rule === "block-type")?.message).toMatch(/^\$\.root\.children\[0\]\.children\[2\]: chart/);
  });

  it("url: an address, a script or markup in any value", async () => {
    expect(errors(await cpu((r) => (rootOf(r).title = "https://example.com")))).toEqual(["url"]);
    expect(errors(await cpu((r) => (r.description = "//cdn.example/x")))).toEqual(["url"]);
    expect(errors(await cpu((r) => (r.author = "javascript:alert(1)")))).toEqual(["url"]);
    expect(errors(await cpu((r) => (r.sample.sensors["libre.x"] = "url(x)")))).toEqual(["url"]);
    // the id's `recipe:` is its namespace
    expect(errors(await cpu(() => {}))).toEqual([]);
  });

  it("size: the file count, a file's bytes, the package's, recipe.json's, and the block, option and preset counts", async () => {
    const files = fixtureFiles("cpu-card");
    const png = (n: number) => Uint8Array.from({ length: n }, (_, k) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][k] ?? 0);
    const many = Array.from({ length: FILE_COUNT_MAX - 1 }, (_, k) => ({ path: `images/f${k}.png`, bytes: png(8) }));
    expect(errors([...files, ...many])).toContain("size");
    expect(errors([...files, ...many.slice(1)]).filter((r) => r === "size")).toEqual([]);
    expect(errors([...files, { path: "images/big.png", bytes: png(256_001) }])).toContain("size");
    const half = (k: number) => ({ path: `images/h${k}.png`, bytes: png(PACKAGE_MAX_BYTES / 2) });
    expect(errors([...files, half(1), half(2)])).toContain("size");
    expect(errors(await cpu((r) => (r.description = "a".repeat(400)) && Object.assign(r.sample.sensors, Object.fromEntries(Array.from({ length: 2200 }, (_, k) => [`libre.sensor_${k}`, "1 %"])))))).toContain("size");
    expect(RECIPE_MAX_BYTES).toBe(64_000);
    expect(errors(await cpu((r) => (rootOf(r).children = Array.from({ length: BLOCKS_MAX }, () => ({ type: "label", text: "x" }) as Block))))).toContain("size");
    expect(errors(await cpu((r) => (rootOf(r).children = Array.from({ length: BLOCKS_MAX - 1 }, () => ({ type: "label", text: "x" }) as Block))))).toEqual([]);
    expect(errors(await cpu((r) => r.options.push(...Array.from({ length: OPTIONS_MAX - r.options.length + 1 }, (_, k) => ({ key: `extra${k}`, label: "X", type: "boolean" as const, default: true })))))).toContain("size");
    expect(errors(await cpu((r) => r.presets.push(...Array.from({ length: PRESETS_MAX - r.presets.length + 1 }, (_, k) => ({ id: `p${k}`, name: "P", settings: {}, size: [3, 2] as [number, number] })))))).toContain("size");
  });

  it("path: a file a package does not have, and one given twice", async () => {
    const files = fixtureFiles("cpu-card");
    expect(errors([...files, { path: "bundle.js", bytes: enc.encode("x") }])).toContain("path");
    expect(errors([...files, { path: "images/../x.png", bytes: enc.encode("x") }])).toContain("path");
    expect(errors([...files, files[1]])).toContain("path");
  });

  it("kind: a code widget's manifest", async () => {
    const files = await cpu(() => {});
    expect(errors(withFile(files, "manifest.json", JSON.stringify({ ...manifestOfFiles(files), kind: "code" })))).toEqual(["kind"]);
  });

  it("signature: a recipe carries none", async () => {
    const files = await cpu(() => {});
    expect(errors(withFile(files, "manifest.json", JSON.stringify({ ...manifestOfFiles(files), signature: { alg: "ed25519" } })))).toEqual(["signature"]);
  });

  it("id and version: the manifest's are the recipe's", async () => {
    const files = await cpu(() => {});
    expect(errors(withFile(files, "manifest.json", JSON.stringify({ ...manifestOfFiles(files), id: "recipe:other" })))).toEqual(["id"]);
    expect(errors(withFile(files, "manifest.json", JSON.stringify({ ...manifestOfFiles(files), version: "1.0.1" })))).toEqual(["version"]);
    expect(errors(await cpu((r) => (r.version = "1.0")))).toEqual(["schema"]);
  });

  it("files: a file not listed, a listed file missing, a size that is not the file's", async () => {
    const files = await variant("gpu-card", () => {});
    expect(errors(files.filter((f) => f.path !== "images/logo.png"))).toContain("files");
    expect(errors([...files, { path: "images/more.png", bytes: fixtureImages("gpu-card")[0].bytes }])).toEqual(["files"]);
    const m = manifestOfFiles(files) as { files: { path: string; bytes: number }[] };
    expect(errors(withFile(files, "manifest.json", JSON.stringify({ ...m, files: m.files.map((f) => ({ ...f, bytes: f.bytes + 1 })) })))).toContain("files");
  });

  it("hash: a file changed after the export, its size kept", async () => {
    const files = await variant("gpu-card", () => {});
    const logo = files.find((f) => f.path === "images/logo.png")!.bytes.slice();
    logo[logo.length - 20] ^= 1;
    const changed = withFile(files, "images/logo.png", logo);
    expect(errors(changed)).toEqual([]);
    expect((await hashIssues({ files: changed })).map((i) => [i.rule, i.file])).toEqual([["hash", "images/logo.png"]]);
    expect((await checkPackage({ files: changed })).recipe).toBeUndefined();
  });

  it("size-range: min over max, a default outside them", async () => {
    expect(errors(await cpu((r) => (r.size.min = [5, 2])))).toContain("size-range");
    expect(errors(await cpu((r) => (r.size.default = [5, 2])))).toContain("size-range");
    expect(errors(await cpu((r) => (r.size.default = [4, 3])))).toEqual([]);
  });

  it("option: a key twice, a standard key, a default that is not of its type", async () => {
    expect(errors(await cpu((r) => r.options.push({ ...r.options[0] })))).toEqual(["option"]);
    expect(errors(await cpu((r) => r.options.push({ key: "accent", label: "A", type: "color", default: "" })))).toEqual(["option"]);
    expect(errors(await cpu((r) => r.options.push({ key: "mode", label: "M", type: "select", default: "x", options: [{ value: "a", label: "A" }] })))).toEqual(["option"]);
    expect(errors(await cpu((r) => r.options.push({ key: "n", label: "N", type: "number", default: 13, min: 1, max: 12 })))).toEqual(["option"]);
    expect(errors(await cpu((r) => r.options.push({ key: "n", label: "N", type: "number", default: 12, min: 1, max: 12 })))).toEqual([]);
    expect(errors(await cpu((r) => r.options.push({ key: "where", label: "W", type: "place-list", default: [{ name: "X", lat: 91, lon: 0 }] })))).toContain("schema");
    expect(errors(await cpu((r) => r.options.push({ key: "where", label: "W", type: "place-list", default: "Oslo" })))).toEqual(["option"]);
    expect(errors(await cpu((r) => r.options.push({ key: "flag", label: "F", type: "boolean", default: "yes" })))).toEqual(["option"]);
    expect(errors(await cpu((r) => (r.options[0].default = "not a key")))).toEqual(["option"]);
  });

  it("preset: one default, sizes inside the recipe's, settings that are option values", async () => {
    expect(errors(await cpu((r) => (r.presets[1].default = true)))).toEqual(["preset"]);
    expect(errors(await cpu((r) => delete r.presets[0].default))).toEqual(["preset"]);
    expect(errors(await cpu((r) => (r.presets[1].size = [1, 1])))).toEqual(["preset"]);
    expect(errors(await cpu((r) => (r.presets[1].size = [4, 3])))).toEqual([]);
    expect(errors(await cpu((r) => (r.presets[1].settings = { nope: true })))).toEqual(["preset"]);
    expect(errors(await cpu((r) => (r.presets[1].settings = { showClock: "off" })))).toEqual(["preset"]);
    expect(errors(await cpu((r) => (r.presets[1].id = r.presets[0].id)))).toEqual(["preset"]);
  });

  it("block: the root is a card, containers hold children and others none, directions, ranges and thresholds", async () => {
    expect(errors(await cpu((r) => (r.root = { type: "row", children: [] } as unknown as CardBlock)))).toContain("block");
    expect(errors(await cpu((r) => void delete (topRow(r) as { children?: unknown }).children))).toContain("block");
    expect(errors(await cpu((r) => Object.assign(ring(r), { children: [] })))).toContain("block");
    expect(errors(await cpu((r) => Object.assign(topRow(r), { direction: "grid" })))).toEqual(["block"]);
    expect(errors(await cpu((r) => Object.assign(ring(r), { min: 100, max: 100 })))).toEqual(["block"]);
    expect(errors(await cpu((r) => Object.assign(ring(r), { min: 99, max: 100 })))).toEqual([]);
    expect(errors(await cpu((r) => void delete ring(r).thresholds))).toEqual(["block"]);
    expect(errors(await cpu((r) => Object.assign(ring(r), { style: "bars" })))).toEqual(["block"]);
  });

  it("binding: every target exists", async () => {
    expect(errors(await cpu((r) => (ring(r).bind = { sensor: "no dots here" })))).toEqual(["binding"]);
    expect(errors(await cpu((r) => (ring(r).bind = { option: "nope" })))).toEqual(["binding"]);
    expect(errors(await cpu((r) => (ring(r).bind = { field: "temp" })))).toEqual(["binding"]);
    expect(errors(await cpu((r) => void delete (ring(r) as { bind?: unknown }).bind))).toEqual(["binding"]);
    expect(errors(await cpu((r) => (ring(r).when = { option: "nope", is: true })))).toEqual(["binding"]);
    expect(errors(await cpu((r) => topRow(r).children.push({ type: "label" })))).toEqual(["binding"]);
    const weather = (edit: (r: Recipe) => void) => variant("weather-places", edit);
    const first = (r: Recipe) => (rootOf(r).children[0] as Extract<Block, { type: "repeat" }>).children[0] as Extract<Block, { type: "weather-icon" }>;
    expect(errors(await weather((r) => (first(r).bind = { field: "humidity" })))).toEqual(["binding"]);
    expect(errors(await weather((r) => rootOf(r).children.push({ type: "value", bind: { option: "places" } })))).toEqual(["binding"]);
    expect(errors(await weather((r) => (first(r).bind = { field: "code" })))).toEqual([]);
  });

  it("depth: blocks nest at most six deep", async () => {
    const nest = (n: number): Block => (n === 0 ? { type: "label", text: "x" } : { type: "row", children: [nest(n - 1)] });
    expect(errors(await cpu((r) => (rootOf(r).children = [nest(DEPTH_MAX - 2)])))).toEqual([]);
    expect(errors(await cpu((r) => (rootOf(r).children = [nest(DEPTH_MAX - 1)])))).toEqual(["depth"]);
  });

  it("repeat: over a place list, never inside another, at most twelve shown", async () => {
    const weather = (edit: (r: Recipe) => void) => variant("weather-places", edit);
    const list = (r: Recipe) => rootOf(r).children[0] as Extract<Block, { type: "repeat" }>;
    expect(errors(await weather((r) => (list(r).over = "units")))).toEqual(["repeat"]);
    expect(errors(await weather((r) => list(r).children.push({ type: "repeat", over: "places", source: "weather-by-place", children: [] })))).toEqual(["repeat"]);
    expect(errors(await weather((r) => (list(r).max = 13)))).toEqual(["repeat"]);
    expect(errors(await weather((r) => (list(r).max = 12)))).toEqual([]);
  });

  it("follow: a Repeat's direction, most shown, hours and units and a sparkline's window follow an option that gives what they take", async () => {
    const weather = (edit: (r: Recipe) => void) => variant("weather-places", edit);
    const list = (r: Recipe) => rootOf(r).children[0] as Extract<Block, { type: "repeat" }>;
    // the fixture follows layout (mapped), hours (a number 4-12) and units (mapped)
    expect(errors(await weather(() => {}))).toEqual([]);
    expect(errors(await weather((r) => (list(r).direction = { option: "nope" })))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).direction = { option: "layout" })))).toEqual(["follow"]); // list, grid, one are not directions: it needs a map
    expect(errors(await weather((r) => (list(r).direction = { option: "layout", map: { list: "rows", diagonal: "rows" } })))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).direction = { option: "layout", map: { list: "sideways" as "rows" } })))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).direction = { option: "hours" })))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).max = { option: "layout", map: { one: 13 } })))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).max = { option: "hours" })))).toEqual([]);
    expect(errors(await weather((r) => (list(r).hours = { option: "units" })))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).hours = { option: "hours", map: { "8": 8 } })))).toEqual(["follow"]); // a map reads a select
    expect(errors(await weather((r) => (r.options.find((o) => o.key === "hours")!.max = 30)))).toEqual(["follow"]);
    expect(errors(await weather((r) => void delete r.options.find((o) => o.key === "hours")!.min))).toEqual(["follow"]);
    expect(errors(await weather((r) => (list(r).hours = 25)))).toEqual(["repeat"]);
    expect(errors(await weather((r) => (list(r).hours = 24)))).toEqual([]);
    expect(errors(await weather((r) => (list(r).units = { option: "units" })))).toEqual(["follow"]); // c and f are not units: it needs a map
    // a sparkline's window: fixed or following a number option
    expect(errors(await cpu((r) => r.options.push({ key: "secs", label: "History", type: "number", default: 60, min: 10, max: 300, step: 10 })))).toEqual([]);
    const spark = (r: Recipe) => (rootOf(r).children as Block[]).find((b) => b.type === "sparkline") as Extract<Block, { type: "sparkline" }>;
    expect(errors(await cpu((r) => (r.options.push({ key: "secs", label: "History", type: "number", default: 60, min: 10, max: 300, step: 10 }), (spark(r).window = { option: "secs" }))))).toEqual([]);
    expect(errors(await cpu((r) => (spark(r).window = 5)))).toEqual(["block"]);
    expect(errors(await cpu((r) => (spark(r).window = 600)))).toEqual([]);
    // nothing else follows, and hours, units and window stay on their own blocks
    expect(errors(await cpu((r) => Object.assign(ring(r), { max: { option: "showCores" } })))).toEqual(["follow"]);
    expect(errors(await cpu((r) => Object.assign(ring(r), { window: 60 })))).toEqual(["block"]);
    expect(errors(await weather((r) => Object.assign(list(r).children[2], { direction: { option: "layout", map: { list: "row" } } })))).toEqual(["follow"]);
  });

  it("attribution: a recipe does not write the weather provider's credit", async () => {
    expect(errors(await cpu((r) => (r.description = "Weather data by somebody")))).toEqual(["attribution"]);
    expect(errors(await cpu((r) => (r.root.title = "Open-Meteo")))).toEqual(["attribution"]);
    expect(errors(await cpu((r) => (r.root.title = "Openmeteo")))).toEqual(["attribution"]);
    expect(errors(await cpu((r) => (r.root.title = "Weather")))).toEqual([]);
  });

  it("place-list: a place may be the one this PC's location put first, once", async () => {
    const weather = (edit: (r: Recipe) => void) => variant("weather-places", edit);
    const places = (r: Recipe) => r.options.find((o) => o.key === "places")!;
    expect(errors(await weather((r) => (places(r).default = [{ name: "Here", lat: 59.9, lon: 10.7, here: true }, { name: "Tokyo", lat: 35.68, lon: 139.69 }])))).toEqual([]);
    expect(errors(await weather((r) => (places(r).default = [{ name: "Here", lat: 59.9, lon: 10.7, here: true }, { name: "There", lat: 1, lon: 1, here: true }])))).toEqual(["option"]);
  });

  it("image: a file of the package, whose bytes are the image its name says", async () => {
    expect(errors(await variant("gpu-card", () => {}, []))).toEqual(["image"]);
    expect(errors(await variant("gpu-card", () => {}, [{ path: "images/logo.png", bytes: enc.encode("not a png") }]))).toEqual(["image"]);
  });

  it("text-floor: 11 px at every size the recipe allows", async () => {
    // the CPU card's smallest size is 2x2: a base of 15 px, so a scale of 0.74 is 11.1 px and 0.73 is 10.95
    expect(errors(await cpu((r) => (topRow(r).children[1] as Extract<Block, { type: "row" }>).children.forEach((v) => Object.assign(v, { scale: 0.74 }))))).toEqual([]);
    expect(errors(await cpu((r) => Object.assign((topRow(r).children[1] as Extract<Block, { type: "row" }>).children[0], { scale: 0.73 })))).toEqual(["text-floor"]);
    // the same recipe allowed down to 1x1 (a base of 7.5 px) breaks it at that size alone
    const files = await cpu((r) => {
      r.size.min = [1, 1];
    });
    expect(validateRecipe({ files }).find((i) => i.rule === "text-floor")?.message).toMatch(/at 1x1/);
  });

  it("sample: sensor keys, items for a place list with the source's fields", async () => {
    expect(errors(await cpu((r) => (r.sample.sensors["no-dot"] = 1)))).toEqual(["sample"]);
    expect(errors(await cpu((r) => (r.sample.items = { load: [] })))).toEqual(["sample"]);
    expect(errors(await variant("weather-places", (r) => (r.sample.items!.places[0] = { name: "Oslo", humidity: 80 })))).toEqual(["sample"]);
  });

  it("internal: a package it cannot read to the end is refused, never thrown", async () => {
    const files = await cpu(() => {});
    const broken = [...files, { path: "images/x.png", bytes: null as unknown as Uint8Array }];
    expect(validateRecipe({ files: broken }).map((i) => i.rule)).toEqual(["internal"]);
  });

  it("is what an export writes: a package made from a fixture's recipe is the fixture byte for byte", async () => {
    for (const name of ["cpu-card", "gpu-card", "weather-places"]) {
      const made = await packageOf(fixtureRecipe(name), fixtureImages(name));
      const disk = fixtureFiles(name);
      for (const f of made) expect(f.bytes, `${name} ${f.path}`).toEqual(disk.find((d) => d.path === f.path)?.bytes);
    }
  });
});
