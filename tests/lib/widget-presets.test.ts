// The presets a user saved for a widget (`widgetPresets`, an optional key of config v19): guarded on load, edited as one undo step each, and
// carried through the config's save, export and import (a file without the key arrives without it and leaves without it).
import { describe, expect, it } from "vitest";
import { readConfigText } from "@/components/studio/config-file";
import { upgradeConfig } from "@/lib/config-upgrade";
import { defaultConfig, mergeConfig, type DashboardConfig } from "@/lib/layout";
import {
  deleteWidgetPreset,
  normalizeWidgetPresets,
  renameWidgetPreset,
  saveWidgetPreset,
  WIDGET_PRESET_CAPS,
  widgetPresetsOf,
  type UserWidgetPreset,
} from "@/lib/widget-presets";

const preset = (id: string, extra: Partial<UserWidgetPreset> = {}): UserWidgetPreset => ({
  id,
  widget: "Weather",
  name: `Preset ${id}`,
  view: "minimal",
  settings: { showStats: false },
  size: [2, 1],
  created: "2026-01-15T12:00:00.000Z",
  ...extra,
});

describe("normalizeWidgetPresets", () => {
  it("keeps a well-formed list as it is", () => {
    const list = [preset("a"), preset("b", { widget: "Clock", view: undefined })];
    const kept = normalizeWidgetPresets(JSON.parse(JSON.stringify(list)));
    expect(kept).toEqual([preset("a"), { id: "b", widget: "Clock", name: "Preset b", settings: { showStats: false }, size: [2, 1], created: "2026-01-15T12:00:00.000Z" }]);
  });

  it("is undefined for anything that is not a list, or a list with nothing usable", () => {
    for (const v of [undefined, null, "x", 3, {}, [], [null, 1, "x", []]]) expect(normalizeWidgetPresets(v)).toBeUndefined();
  });

  it("drops an entry of the wrong shape and keeps the others", () => {
    const bad: unknown[] = [
      { ...preset("noid"), id: "" },
      { ...preset("nowidget"), widget: 3 },
      { ...preset("noname"), name: "  " },
      { ...preset("settings-list"), settings: [] },
      { ...preset("settings-null"), settings: null },
      { ...preset("size-short"), size: [2] },
      { ...preset("size-zero"), size: [0, 1] },
      { ...preset("size-frac"), size: [1.5, 1] },
      { ...preset("size-huge"), size: [1, WIDGET_PRESET_CAPS.span + 1] },
      { ...preset("size-text"), size: ["2", "1"] },
    ];
    expect(normalizeWidgetPresets([...bad, preset("ok")])?.map((p) => p.id)).toEqual(["ok"]);
  });

  it("keeps the first of a repeated id, cuts a long name, drops a view that is not text, and fills a missing time", () => {
    const kept = normalizeWidgetPresets([preset("a"), preset("a", { name: "second" }), { ...preset("b"), name: "n".repeat(200), view: 4, created: undefined }])!;
    expect(kept.map((p) => p.name.length)).toEqual(["Preset a".length, WIDGET_PRESET_CAPS.name]);
    expect(kept[1]).not.toHaveProperty("view");
    expect(kept[1].created).toBe("");
  });

  it("holds the caps: settings bytes per entry and the total", () => {
    const fat = preset("fat", { settings: { blob: "x".repeat(WIDGET_PRESET_CAPS.settingsBytes) } });
    expect(normalizeWidgetPresets([fat, preset("slim")])?.map((p) => p.id)).toEqual(["slim"]);
    const many = Array.from({ length: WIDGET_PRESET_CAPS.total + 25 }, (_, i) => preset(`p${i}`));
    expect(normalizeWidgetPresets(many)).toHaveLength(WIDGET_PRESET_CAPS.total);
  });

  it("keeps a preset of a widget this build does not have (a newer build's must survive)", () => {
    expect(normalizeWidgetPresets([preset("x", { widget: "FutureWidget" })])?.[0].widget).toBe("FutureWidget");
  });
});

describe("editing the saved list", () => {
  const base = (list?: UserWidgetPreset[]): DashboardConfig => ({ ...defaultConfig(), widgetPresets: list });

  it("saves after the existing ones, renames within the name cap, and the last delete leaves no list", () => {
    let c = saveWidgetPreset(base(), preset("a"));
    c = saveWidgetPreset(c, preset("b"));
    expect(c.widgetPresets?.map((p) => p.id)).toEqual(["a", "b"]);
    c = renameWidgetPreset(c, "a", `  ${"z".repeat(100)}  `);
    expect(c.widgetPresets?.[0].name).toBe("z".repeat(WIDGET_PRESET_CAPS.name));
    expect(renameWidgetPreset(c, "a", "   ").widgetPresets?.[0].name).toBe("z".repeat(WIDGET_PRESET_CAPS.name));
    c = deleteWidgetPreset(c, "a");
    expect(c.widgetPresets?.map((p) => p.id)).toEqual(["b"]);
    expect(deleteWidgetPreset(c, "b").widgetPresets).toBeUndefined();
  });

  it("refuses a save past the total cap, leaving the config as it was", () => {
    const full = base(Array.from({ length: WIDGET_PRESET_CAPS.total }, (_, i) => preset(`p${i}`)));
    expect(saveWidgetPreset(full, preset("one-more"))).toBe(full);
  });

  it("lists one widget's presets in save order", () => {
    const list = [preset("a"), preset("b", { widget: "Clock" }), preset("c")];
    expect(widgetPresetsOf(list, "Weather").map((p) => p.id)).toEqual(["a", "c"]);
    expect(widgetPresetsOf(undefined, "Weather")).toEqual([]);
  });
});

describe("widgetPresets in the config", () => {
  const withList = { ...defaultConfig(), widgetPresets: [preset("a"), preset("b", { widget: "Clock", view: undefined })] };
  const roundTrip = (c: unknown) => JSON.parse(JSON.stringify(c));

  it("survives a save and load (mergeConfig) and the full upgrade", () => {
    const stored = roundTrip(withList);
    expect(mergeConfig(stored).widgetPresets).toEqual(stored.widgetPresets);
    expect(upgradeConfig(stored).widgetPresets).toEqual(stored.widgetPresets);
  });

  it("arrives from a file without the key, current or older, with none", () => {
    for (const version of [19, 15, 9]) expect(upgradeConfig({ ...roundTrip(defaultConfig()), version }).widgetPresets).toBeUndefined();
  });

  it("guards a hand-edited list on import: the bad entries go, the good ones stay", () => {
    const edited = { ...roundTrip(withList), widgetPresets: [...roundTrip(withList).widgetPresets, { id: "bad", widget: "Weather" }, 7] };
    expect(upgradeConfig(edited).widgetPresets?.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("exports and imports as part of the config file: the same list comes back", async () => {
    const text = JSON.stringify(withList);
    const { config } = await readConfigText(text);
    expect(config.widgetPresets).toEqual(roundTrip(withList).widgetPresets);
    const again = await readConfigText(JSON.stringify(config));
    expect(again.config.widgetPresets).toEqual(config.widgetPresets);
  });
});
