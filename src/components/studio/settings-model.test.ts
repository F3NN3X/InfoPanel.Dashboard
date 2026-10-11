import { describe, expect, it } from "vitest";
import {
  GROUP_COLORS,
  GROUP_EFFECTS,
  IDLE_SETTING,
  PROFILE_STYLE_KEYS,
  STANDARD_SETTINGS,
} from "@/modules/standard-settings";
import type { ModuleSetting } from "@/modules/types";
import {
  dropKeys,
  filterSettings,
  isStyleSetting,
  matchesQuery,
  settingState,
  splitSettings,
} from "./settings-model";

const def = (key: string, extra: Partial<ModuleSetting> = {}): ModuleSetting => ({
  key,
  label: key,
  type: "boolean",
  default: false,
  ...extra,
});

describe("isStyleSetting", () => {
  it("treats every standard setting and profile style key as style", () => {
    for (const s of STANDARD_SETTINGS) expect(isStyleSetting(s)).toBe(true);
    for (const key of PROFILE_STYLE_KEYS) expect(isStyleSetting(def(key))).toBe(true);
    for (const key of ["label", "icon", "background", "backgroundOn", "preset", "layout"])
      expect(isStyleSetting(def(key))).toBe(true);
  });

  it("treats hide-when-idle and module settings as content", () => {
    expect(isStyleSetting(IDLE_SETTING)).toBe(false);
    expect(isStyleSetting(def("showTemps"))).toBe(false);
    expect(isStyleSetting(def("tempWarn", { group: "Thresholds" }))).toBe(false);
  });

  it("files module settings in a standard style group under style", () => {
    expect(isStyleSetting(def("cpuColor", { type: "color", group: GROUP_COLORS }))).toBe(true);
    expect(isStyleSetting(def("x", { group: GROUP_EFFECTS }))).toBe(true);
  });
});

describe("splitSettings", () => {
  it("splits into content and style, preserving order", () => {
    const defs = [
      def("preset"),
      def("devices"),
      def("glow"),
      IDLE_SETTING,
      def("tempWarn", { group: "Thresholds" }),
      def("cpuColor", { group: GROUP_COLORS }),
    ];
    const { content, style } = splitSettings(defs);
    expect(content.map((d) => d.key)).toEqual(["devices", "hideWhenIdle", "tempWarn"]);
    expect(style.map((d) => d.key)).toEqual(["preset", "glow", "cpuColor"]);
  });

  it("handles no settings", () => {
    expect(splitSettings([])).toEqual({ content: [], style: [] });
  });
});

describe("filterSettings", () => {
  const defs = [
    def("glow", { label: "Edge glow", group: GROUP_EFFECTS }),
    def("glowColor", { label: "Glow color (empty = accent)", group: GROUP_EFFECTS }),
    def("tempUnit", {
      label: "Temperature unit",
      type: "select",
      options: [
        { value: "c", label: "Celsius" },
        { value: "f", label: "Fahrenheit" },
      ],
    }),
    def("cafe", { label: "Café mode" }),
    def("blur", { label: "Background blur", group: GROUP_EFFECTS }),
    def("tempWarn", { label: "Warn at", group: "Thresholds" }),
  ];
  const keys = (q: string) => filterSettings(defs, q).map((d) => d.key);

  it("returns everything for a blank query", () => {
    expect(keys("")).toHaveLength(defs.length);
    expect(keys("   ")).toHaveLength(defs.length);
  });

  it("matches the label case-insensitively", () => {
    expect(keys("GLOW")).toEqual(["glow", "glowColor"]);
  });

  it("does not pull in a whole group when rows match directly", () => {
    expect(keys("glow")).toEqual(["glow", "glowColor"]);
  });

  it("falls back to the group name when no row matches directly", () => {
    expect(keys("border, glow")).toEqual(["glow", "glowColor", "blur"]);
  });

  it("matches the key, the group and option labels", () => {
    expect(keys("tempunit")).toEqual(["tempUnit"]);
    expect(keys("thresh")).toEqual(["tempWarn"]);
    expect(keys("fahren")).toEqual(["tempUnit"]);
  });

  it("ignores diacritics on both sides", () => {
    expect(keys("cafe")).toEqual(["cafe"]);
    expect(keys("CAFÉ")).toEqual(["cafe"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(keys("zzz")).toEqual([]);
  });
});

describe("matchesQuery", () => {
  it("folds case and diacritics; blank matches", () => {
    expect(matchesQuery(["Zone frame"], "FRAME")).toBe(true);
    expect(matchesQuery(["Fond d'écran"], "ecran")).toBe(true);
    expect(matchesQuery(["Zone frame"], "glow")).toBe(false);
    expect(matchesQuery([], "")).toBe(true);
  });
});

describe("settingState", () => {
  it("is default when nothing is set", () => {
    expect(settingState("glow", undefined, undefined, "none")).toBe("default");
    expect(settingState("glow", {}, {}, "none")).toBe("default");
  });

  it("is own when only the widget sets it", () => {
    expect(settingState("glow", { glow: "soft" }, undefined, "none")).toBe("own");
  });

  it("is default when the widget's own value is the default", () => {
    expect(settingState("glow", { glow: "none" }, undefined, "none")).toBe("default");
  });

  it("is profile when only the profile style sets it", () => {
    expect(settingState("glow", {}, { glow: "soft" }, "none")).toBe("profile");
  });

  it("is override when both set it", () => {
    expect(settingState("glow", { glow: "strong" }, { glow: "soft" }, "none")).toBe("override");
    expect(settingState("glow", { glow: "none" }, { glow: "soft" }, "none")).toBe("override");
  });

  it("treats false and 0 as set values", () => {
    expect(settingState("tint", { tint: false }, undefined, true)).toBe("own");
    expect(settingState("scale", undefined, { scale: 0 }, 100)).toBe("profile");
  });
});

describe("dropKeys", () => {
  it("removes the given keys and keeps the rest", () => {
    expect(dropKeys({ a: 1, b: 2, c: 3 }, new Set(["a", "c"]))).toEqual({ b: 2 });
  });

  it("returns undefined when nothing is left", () => {
    expect(dropKeys({ a: 1 }, new Set(["a"]))).toBeUndefined();
    expect(dropKeys(undefined, new Set(["a"]))).toBeUndefined();
  });
});
