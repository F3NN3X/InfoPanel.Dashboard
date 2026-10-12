import { describe, expect, it } from "vitest";
import { modules } from "@/modules";
import {
  CARD_SETTINGS,
  PANEL_SETTINGS,
  PROFILE_STYLE_KEYS,
  STANDARD_SETTINGS,
} from "@/modules/standard-settings";
import { settingKeys, type ModuleSetting } from "@/modules/types";
import {
  categorize,
  categoryTitleOf,
  filterCategories,
  GENERAL_CATEGORIES,
  OTHER_TITLE,
  withGeneral,
  categoryAdvanced,
  categoryTab,
  isAdvanced,
  tabOf,
} from "./inspector-categories";

const def = (key: string, group?: string, label = key): ModuleSetting => ({
  key,
  label,
  type: "boolean",
  default: false,
  group,
});

const GENERAL_TITLES = new Set(GENERAL_CATEGORIES.map((c) => c.title));

/**
 * Module categories that deliberately hold one setting: the plain card
 * widgets have a single option of their own.
 */
const SINGLE_SETTING_OK = new Set(["vbz:Content", "textfile:Content", "webpage:Page", "WebPage:Page", "TextFile:Content"]);

const sheets: [string, ModuleSetting[]][] = [
  ...modules.map((m): [string, ModuleSetting[]] => [m.id, m.settings ?? []]),
  ["cards", CARD_SETTINGS],
  ["panel", PANEL_SETTINGS],
];

describe("general categories", () => {
  it("keeps the canonical order and unique ids / titles", () => {
    expect(GENERAL_CATEGORIES.map((c) => c.title)).toEqual([
      "Widget",
      "Look",
      "Size & alignment",
      "Typography",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
      "Advanced",
    ]);
    expect(new Set(GENERAL_CATEGORIES.map((c) => c.id)).size).toBe(GENERAL_CATEGORIES.length);
  });

  it("holds every standard setting exactly once, in the category its group names", () => {
    const keys = GENERAL_CATEGORIES.flatMap((c) => c.keys);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of [...STANDARD_SETTINGS, { key: "hideWhenIdle", group: undefined } as ModuleSetting]) {
      const cat = GENERAL_CATEGORIES.find((c) => c.keys.includes(d.key));
      expect(cat, d.key).toBeDefined();
      if (d.group) expect(cat?.title, d.key).toBe(d.group);
    }
  });

  it("covers every profile style key", () => {
    const keys = new Set(GENERAL_CATEGORIES.flatMap((c) => c.keys));
    for (const key of PROFILE_STYLE_KEYS) {
      expect(keys.has(key) || key === "alignY", key).toBe(true);
    }
  });
});

describe("categorize", () => {
  it("puts general categories first in canonical order, then the widget's own as they appear", () => {
    const cats = categorize([
      def("tempWarn", "Thresholds"),
      def("customCss"),
      def("showFans", "Fans"),
      def("label"),
      def("tempCrit", "Thresholds"),
      def("preset"),
    ]);
    expect(cats.map((c) => [c.title, c.defs.map((d) => d.key)])).toEqual([
      ["Widget", ["label"]],
      ["Colors & surface", ["preset"]],
      ["Advanced", ["customCss"]],
      ["Thresholds", ["tempWarn", "tempCrit"]],
      ["Fans", ["showFans"]],
    ]);
    expect(cats.map((c) => c.general)).toEqual([true, true, true, false, false]);
  });

  it("files unfiled settings last under Other", () => {
    const cats = categorize([def("x"), def("y", "Own"), def("label")]);
    expect(cats.map((c) => c.title)).toEqual(["Widget", "Own", OTHER_TITLE]);
  });

  it("files a standard key by its key, whatever group it carries", () => {
    expect(categoryTitleOf(def("font", "Whatever"))).toBe("Typography");
    expect(categoryTitleOf(def("custom", "Mine"))).toBe("Mine");
  });

  it("is deterministic", () => {
    const defs = modules.flatMap((m) => m.settings ?? []);
    expect(categorize(defs)).toEqual(categorize([...defs]));
  });
});

describe("every widget's settings", () => {
  it.each(sheets)("%s: each setting is in a known category", (_id, defs) => {
    const cats = categorize(defs);
    expect(cats.some((c) => c.title === OTHER_TITLE)).toBe(false);
    // Nothing lost or duplicated.
    const filed = cats.flatMap((c) => c.defs.flatMap(settingKeys));
    expect(filed.sort()).toEqual(defs.flatMap(settingKeys).sort());
    // Own categories never reuse a general title.
    for (const c of cats.filter((c) => !c.general)) expect(GENERAL_TITLES.has(c.title)).toBe(false);
    // General ones hold only standard keys.
    for (const c of cats.filter((c) => c.general)) {
      const spec = GENERAL_CATEGORIES.find((g) => g.id === c.id)!;
      for (const d of c.defs) expect(spec.keys).toContain(d.key);
    }
  });

  it.each(sheets)("%s: own categories are not single-setting ones", (id, defs) => {
    for (const c of categorize(defs).filter((c) => !c.general)) {
      if (c.defs.length === 1) expect(SINGLE_SETTING_OK.has(`${id}:${c.title}`), `${id}:${c.title}`).toBe(true);
      expect(c.defs.length, `${id}:${c.title}`).toBeLessThanOrEqual(12);
    }
  });

  it("only allow-lists single-setting categories that exist", () => {
    for (const entry of SINGLE_SETTING_OK) {
      const [id, title] = entry.split(":");
      const cats = categorize(sheets.find(([sid]) => sid === id)?.[1] ?? []);
      expect(cats.find((c) => c.title === title)?.defs).toHaveLength(1);
    }
  });
});

describe("filterCategories", () => {
  const cats = categorize([
    def("glow", undefined, "Edge glow"),
    def("borderWidth", undefined, "Border width"),
    def("tempWarn", "Thresholds", "Warning at"),
    def("tempCrit", "Thresholds", "Critical at"),
  ]);

  it("keeps everything for a blank query", () => {
    expect(filterCategories(cats, "  ")).toBe(cats);
  });

  it("returns matching rows in their categories", () => {
    const hit = filterCategories(cats, "glow");
    expect(hit.map((c) => [c.title, c.defs.map((d) => d.key)])).toEqual([["Border & effects", ["glow"]]]);
  });

  it("returns a whole category when only its title matches", () => {
    const hit = filterCategories(cats, "thresholds");
    expect(hit.map((c) => [c.title, c.defs.length])).toEqual([["Thresholds", 2]]);
  });

  it("prefers row matches over a title match", () => {
    const hit = filterCategories(cats, "border");
    expect(hit.flatMap((c) => c.defs.map((d) => d.key))).toEqual(["borderWidth"]);
  });

  it("finds nothing for an unknown query", () => {
    expect(filterCategories(cats, "zzz")).toEqual([]);
  });
});

describe("withGeneral", () => {
  const cats = categorize([def("customCss"), def("tempWarn", "Thresholds")]);

  it("adds the named general categories at their canonical place", () => {
    const out = withGeneral(cats, ["widget", "effects"]);
    expect(out.map((c) => c.title)).toEqual(["Widget", "Border & effects", "Advanced", "Thresholds"]);
    expect(out[0].defs).toEqual([]);
  });

  it("keeps existing ones and adds nothing for unknown ids", () => {
    expect(withGeneral(cats, ["advanced", "nope"])).toEqual(cats);
  });
});

describe("tabs and advanced", () => {
  const cat = (defs: ModuleSetting[], title = "Own") => categorize(defs.map((d) => ({ ...d, group: d.group ?? title })))[0];
  const color = (key: string): ModuleSetting => ({ key, label: key, type: "color", default: "" });

  it("files the Widget card in Content and the look cards in Style", () => {
    const tabs = Object.fromEntries(
      categorize(STANDARD_SETTINGS).map((c) => [c.title, categoryTab(c)])
    );
    expect(tabs).toMatchObject({
      Widget: "content",
      "Size & alignment": "style",
      Typography: "style",
      "Spacing & shape": "style",
      "Colors & surface": "style",
      "Border & effects": "style",
      Advanced: "style",
    });
  });

  it("files a widget's own categories in Content, those of color pickers in Style as advanced", () => {
    const plain = cat([def("showFans")]);
    expect([categoryTab(plain), categoryAdvanced(plain)]).toEqual(["content", false]);
    const colors = cat([color("a"), color("b")], "Device colors");
    expect([categoryTab(colors), categoryAdvanced(colors)]).toEqual(["style", true]);
    const mixed = cat([color("a"), def("b")], "Meter");
    expect([categoryTab(mixed), categoryAdvanced(mixed)]).toEqual(["content", false]);
  });

  it("only the Advanced general category is advanced by itself", () => {
    const advanced = categorize(STANDARD_SETTINGS).filter(categoryAdvanced);
    expect(advanced.map((c) => c.title)).toEqual(["Advanced"]);
  });

  it("lets a setting's own tab and advanced flag win", () => {
    const own = cat([def("x")]);
    expect(tabOf({ ...def("x"), tab: "data" }, own)).toBe("data");
    expect(tabOf(def("x"), own)).toBe("content");
    expect(isAdvanced({ ...def("x"), advanced: true }, own)).toBe(true);
    expect(isAdvanced(def("x"), own)).toBe(false);
    expect(isAdvanced(def("x"), cat([color("a")]))).toBe(true);
  });
});
