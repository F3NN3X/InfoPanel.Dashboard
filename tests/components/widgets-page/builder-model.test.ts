import { describe, expect, it } from "vitest";
import { addBlock, addOption, blockAt, blockCount, devicesIn, flatten, layerName, moveBlock, moveOption, newRecipe, optionUses, pickBinding, pickWhat, presetLine, presetValues, recipeIssues, removeBlock, removeOption, removePreset, savePreset, setDefaultPreset, unpickBinding, updateBlock, validationLine, withSample } from "@/components/widgets-page/builder-model";
import { commit, historyOf, HISTORY_LIMIT, redo, undo } from "@/components/widgets-page/history";
import { NO_START, START, whyNoStart } from "@/components/widgets-page/start-points";
import { WIDGET_ORDER } from "@/widgets/order";
import type { Block, Recipe } from "@/widgets/recipe/types";

// The builder's model: the block tree edits, a binding turned into an option (a device or a sensor), options and presets, undo,
// and the start points. Each edit is checked by the validator the builder's line reads, so a recipe built here is one the
// Widgets page can store.

const CPU = "amd_ryzen_9_9950x3d";
const DATA = { [`libre.${CPU}_cpu_total`]: "64.2 %", [`libre.${CPU}_core__tctl_tdie`]: "67.5 °C", "libre.nvidia_geforce_rtx_5090_gpu_core_load": "87 %" };
const DEVICES = devicesIn(DATA);
const errorsOf = (r: Recipe) => recipeIssues(r).filter((i) => i.severity === "error").map((i) => i.message);

/** The mockup's CPU card as the builder makes it: a top row of a ring and a column of values, then a sparkline. */
function cpuCard(): Recipe {
  const row = addBlock(newRecipe("CPU card", new Set()), [], "row", `libre.${CPU}_cpu_total`);
  const ring = addBlock(updateBlock(row.recipe, row.path, { name: "Top row" }), row.path, "ring", `libre.${CPU}_cpu_total`);
  const values = addBlock(ring.recipe, row.path, "row", `libre.${CPU}_cpu_total`);
  const temp = addBlock(updateBlock(values.recipe, values.path, { name: "Values", direction: "column" }), values.path, "value", `libre.${CPU}_core__tctl_tdie`);
  return addBlock(temp.recipe, [], "sparkline", `libre.${CPU}_cpu_total`).recipe;
}

describe("the block tree", () => {
  it("adds into a container, after a leaf, and to the root card when nothing is selected", () => {
    const r = cpuCard();
    expect(flatten(r).map(({ block, depth }) => `${depth}:${block.type}`)).toEqual(["0:card", "1:row", "2:ring", "2:row", "3:value", "1:sparkline"]);
    expect(blockCount(r)).toBe(6);
    const { recipe, path } = addBlock(r, [0, 0], "value", `libre.${CPU}_package`);
    expect(path).toEqual([0, 1]);
    expect(blockAt(recipe, [0, 1])?.type).toBe("value");
    expect(addBlock(r, [], "label", "x.y").path).toEqual([2]);
  });

  it("a Repeat runs over the first place list, made as Locations when there is none, and its blocks read the item's fields", () => {
    const { recipe, path } = addBlock(newRecipe("Weather", new Set()), [], "repeat", "x.y");
    expect(recipe.options).toMatchObject([{ key: "places", label: "Locations", type: "place-list" }]);
    expect(recipe.sample.items?.places.map((i) => i.name)).toEqual(["Oslo", "Brevik", "Tokyo"]);
    expect(layerName(recipe, blockAt(recipe, path)!)).toBe("Repeat · Locations");
    const inside = addBlock(recipe, path, "value", "x.y");
    expect((blockAt(inside.recipe, inside.path) as Extract<Block, { type: "value" }>).bind).toEqual({ field: "temp" });
    expect(addBlock(inside.recipe, inside.path, "weather-icon", "x.y").recipe.root.children[0]).toMatchObject({ children: [{ type: "value" }, { type: "weather-icon", bind: { field: "condition" } }] });
  });

  it("removes a block and selects its previous sibling, else its parent; the root stays", () => {
    const r = cpuCard();
    expect(removeBlock(r, [1])).toMatchObject({ path: [0] });
    expect(removeBlock(r, [0, 1, 0])).toMatchObject({ path: [0, 1] });
    expect(blockCount(removeBlock(r, [0]).recipe)).toBe(2);
    expect(removeBlock(r, []).recipe).toBe(r);
  });

  it("moves a block among its siblings, and not past either end", () => {
    const r = cpuCard();
    const down = moveBlock(r, [0, 0], 1);
    expect(down.path).toEqual([0, 1]);
    expect((blockAt(down.recipe, [0]) as Extract<Block, { type: "row" }>).children.map((b) => b.type)).toEqual(["row", "ring"]);
    expect(moveBlock(r, [0, 1], 1)).toMatchObject({ recipe: r, path: [0, 1] });
  });

  it("sets and removes a block's fields", () => {
    const r = updateBlock(cpuCard(), [0, 0], { color: "thresholds", thresholds: { warn: 70, crit: 90 } });
    expect(blockAt(r, [0, 0])).toMatchObject({ color: "thresholds" });
    expect(blockAt(updateBlock(r, [0, 0], { thresholds: undefined }), [0, 0])).not.toHaveProperty("thresholds");
  });
});

describe("Let people pick", () => {
  it("turns a device's key into a device option, and every key of that device in the recipe names it", () => {
    const r = pickBinding(cpuCard(), [0, 0], DEVICES);
    expect(r.options).toEqual([{ key: "cpu", label: "CPU", type: "device", kind: "cpu", default: "auto" }]);
    expect(blockAt(r, [0, 0])).toMatchObject({ bind: { sensor: "libre.{cpu}_cpu_total" } });
    expect(blockAt(r, [0, 1, 0])).toMatchObject({ bind: { sensor: "libre.{cpu}_core__tctl_tdie" } });
    expect(blockAt(r, [1])).toMatchObject({ bind: { sensor: "libre.{cpu}_cpu_total" } });
    expect(pickWhat(r, [0, 0], DEVICES)).toBe("the CPU");
    expect(optionUses(r, "cpu")).toBe(3);
    expect(errorsOf(r)).toEqual([]);
  });

  it("turns any other key into a sensor option holding it", () => {
    const r0 = updateBlock(cpuCard(), [1], { bind: { sensor: "plugins.fps.value" } });
    expect(pickWhat(r0, [1], DEVICES)).toBe("the sensor");
    const r = pickBinding(r0, [1], DEVICES);
    expect(r.options).toEqual([{ key: "sparkline", label: "Sparkline", type: "sensor", default: "plugins.fps.value" }]);
    expect(blockAt(r, [1])).toMatchObject({ bind: { option: "sparkline" } });
    expect(unpickBinding(r, [1], DATA)).toEqual(r0);
  });

  it("turned off, a device option's keys take its device (Auto: the one in the data) and the option goes", () => {
    const r = unpickBinding(pickBinding(cpuCard(), [0, 0], DEVICES), [0, 0], DATA);
    expect(r).toEqual(cpuCard());
  });

  it("is not offered for a Repeat item's field", () => {
    const { recipe, path } = addBlock(addBlock(newRecipe("W", new Set()), [], "repeat", "x.y").recipe, [0], "value", "x.y");
    expect(pickWhat(recipe, path, DEVICES)).toBeUndefined();
  });
});

describe("options and presets", () => {
  const withToggles = () =>
    addOption(addOption(pickBinding(cpuCard(), [0, 0], DEVICES), { key: "showClock", label: "Show clock", type: "boolean", default: true }), {
      key: "history",
      label: "History",
      type: "select",
      default: "60",
      options: [{ value: "60", label: "60 s" }, { value: "300", label: "5 min" }],
    });

  it("orders options by drag and removes one with its preset values", () => {
    const r = withToggles();
    expect(moveOption(r, 2, 0).options.map((o) => o.key)).toEqual(["history", "cpu", "showClock"]);
    expect(moveOption(r, 0, 9)).toBe(r);
    const saved = savePreset(r, "Compact", { showClock: false, history: "60" }, [2, 2]);
    expect(removeOption(saved, "showClock").presets.at(-1)?.settings).toEqual({});
    expect(addOption(r, { key: "showClock", label: "Again", type: "boolean", default: false }).options.at(-1)?.key).toBe("showClock2");
  });

  it("saves the current values that differ from the defaults and the size, under a unique id; one default stays", () => {
    let r = withToggles();
    r = savePreset(r, "Compact", { cpu: "auto", showClock: false, history: "60" }, [2, 2]);
    expect(r.presets.at(-1)).toEqual({ id: "compact", name: "Compact", settings: { showClock: false }, size: [2, 2] });
    expect(savePreset(r, "Compact", {}, [2, 2]).presets.at(-1)?.id).toBe("compact-2");
    expect(presetValues(r, r.presets.at(-1))).toMatchObject({ showClock: false, history: "60", cpu: "auto" });
    expect(presetLine(r, r.presets.at(-1)!)).toBe("Show clock Off · 2×2");
    r = setDefaultPreset(r, "compact");
    expect(r.presets.filter((p) => p.default).map((p) => p.id)).toEqual(["compact"]);
    r = removePreset(r, "compact");
    expect(r.presets.filter((p) => p.default).map((p) => p.id)).toEqual(["default"]);
    expect(removePreset(r, "default")).toBe(r);
    expect(errorsOf(r)).toEqual([]);
  });

  it("a 1x1 Ring only preset passes the floor once the values leave one column", () => {
    let r = withToggles();
    r = { ...r, size: { ...r.size, min: [1, 1] } };
    r = savePreset(r, "Ring only", {}, [1, 1]);
    expect(validationLine(r, recipeIssues(r)).floor).toMatch(/under 11 px/);
    r = updateBlock(r, [0, 1], { when: { size: { min: [2, 1] } } });
    const line = validationLine(r, recipeIssues(r));
    expect(line).toMatchObject({ ok: true, floor: "Text stays above 11 px at every size" });
    expect(line.summary).toBe("No code · 6 blocks · 3 options · fits 1×1 to 4×3");
  });
});

describe("the sample a save writes", () => {
  it("holds the readings of every key the recipe reads, with its devices filled in", () => {
    const r = withSample(pickBinding(cpuCard(), [0, 0], DEVICES), DATA);
    expect(r.sample.sensors).toEqual({ [`libre.${CPU}_cpu_total`]: "64.2 %", [`libre.${CPU}_core__tctl_tdie`]: "67.5 °C" });
  });
});

describe("undo", () => {
  it("steps back and forward, an edit drops what was undone, the same value is no step", () => {
    let h = historyOf(1);
    h = commit(commit(h, 2), 3);
    expect(commit(h, 3)).toBe(h);
    h = undo(h);
    expect(h.present).toBe(2);
    expect(redo(h).present).toBe(3);
    h = commit(undo(h), 9);
    expect([h.past, h.present, h.future]).toEqual([[], 9, []].map((x, k) => (k === 0 ? [1] : x)));
    expect(undo(historyOf(1))).toEqual(historyOf(1));
    let long = historyOf(0);
    for (let n = 1; n <= HISTORY_LIMIT + 5; n++) long = commit(long, n);
    expect(long.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe("start points", () => {
  it("every built-in has a start point or a reason, never both", () => {
    for (const id of WIDGET_ORDER) {
      expect(!!START[id] !== !!NO_START[id], id).toBe(true);
      expect(!!whyNoStart(id), id).toBe(!START[id]);
    }
    expect(Object.keys(START).sort()).toEqual(["CpuMonitor", "GpuMonitor", "SensorValue", "Weather"]);
  });

  it("each start point is a recipe the validator passes", () => {
    for (const [id, make] of Object.entries(START)) expect(errorsOf(make(`${id} recipe`, new Set())), id).toEqual([]);
  });
});
