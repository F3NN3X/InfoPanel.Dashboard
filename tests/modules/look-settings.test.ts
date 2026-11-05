import { describe, expect, it } from "vitest";
import { categorize, categoryTab } from "@/components/studio/inspector-categories";
import { settingStateOf } from "@/components/studio/settings-model";
import { isValidStyleValue } from "@/lib/appearance-presets";
import { resolveStyle } from "@/lib/style-resolve";
import { SKIN_PACKS } from "@/widgets/core/theme";
import { CARD_SETTINGS, PANEL_SETTINGS, PROFILE_STYLE_KEYS, STANDARD_SETTINGS, STYLE_SETTINGS } from "@/modules/standard-settings";
import { isMore } from "@/modules/types";

const LOOK_DEFAULTS = { lookId: "classic", graph: "auto", meter: "auto" };
const find = (defs: typeof STYLE_SETTINGS, key: string) => defs.find((d) => d.key === key)!;
const values = (defs: typeof STYLE_SETTINGS, key: string) => find(defs, key).options!.map((o) => o.value);

describe("look settings", () => {
  it("are profile style keys with the agreed defaults", () => {
    for (const [key, value] of Object.entries(LOOK_DEFAULTS)) {
      expect(PROFILE_STYLE_KEYS.has(key), key).toBe(true);
      expect(find(STYLE_SETTINGS, key).default, key).toBe(value);
    }
  });

  it("offer every skin pack once as its Look, the Default skin as Classic (SPEC §8 item 7)", () => {
    expect(values(STYLE_SETTINGS, "lookId")).toEqual(["classic", ...SKIN_PACKS.filter((p) => p.name !== "default").map((p) => p.name)]);
    expect(find(STYLE_SETTINGS, "lookId").options!.map((o) => o.label).slice(0, 2)).toEqual(["Classic", "TUI"]);
    // Any Look id that is text is valid (a sample Look, the hidden `default`, a newer build's), and the picker offers only the above.
    expect(["classic", "hud", "term", "default", "nope", "", 3].map((v) => isValidStyleValue("lookId", v))).toEqual([true, true, true, true, true, false, false]);
  });

  it("offer the graph and meter choices; Small zones and Density are the template widgets' own (no look keys)", () => {
    expect(values(STYLE_SETTINGS, "graph")).toEqual(["auto", "area", "line", "step", "bars", "dots", "braille"]);
    expect(values(STYLE_SETTINGS, "meter")).toEqual(["auto", "bar", "pill", "segments", "blocks", "hair", "wave", "square"]);
    expect(values(STANDARD_SETTINGS, "compact")).toEqual(["auto", "full", "card", "dense"]);
    expect(find(STANDARD_SETTINGS, "compact").label).toBe("Small sizes");
    expect(values(STANDARD_SETTINGS, "sizeTier")).toEqual(["auto", "lg", "md", "sm", "xs"]);
    for (const key of ["compact", "sizeTier", "variant", "compactView", "layout", "autoScale"]) expect(PROFILE_STYLE_KEYS.has(key), key).toBe(false);
  });

  it("reach widgets, cards and (skin, graph, meter only) panels", () => {
    for (const key of Object.keys(LOOK_DEFAULTS)) {
      expect(STANDARD_SETTINGS.some((d) => d.key === key), key).toBe(true);
      expect(CARD_SETTINGS.some((d) => d.key === key), key).toBe(true);
    }
    const panel = PANEL_SETTINGS.map((d) => d.key);
    expect(["lookId", "graph", "meter"].every((k) => panel.includes(k))).toBe(true);
    for (const key of ["compact", "sizeTier"]) {
      expect(panel).not.toContain(key);
      expect(CARD_SETTINGS.some((d) => d.key === key), key).toBe(false);
    }
  });

  it("file under Theme in Style, with graph and meter behind More, and graph updates in Motion", () => {
    const categories = categorize(STANDARD_SETTINGS);
    const skin = categories.find((c) => c.title === "Theme")!;
    expect(skin.general).toBe(true);
    expect(skin.defs.map((d) => d.key)).toEqual(["lookId", "graph", "meter", "stroke"]);
    expect(categoryTab(skin)).toBe("style");
    expect(skin.defs.filter(isMore).map((d) => d.key)).toEqual(["graph", "meter"]);
    const motion = categories.find((c) => c.title === "Motion")!;
    expect(motion.defs.map((d) => d.key)).toEqual(["smoothing"]);
    expect(categoryTab(motion)).toBe("behaviour");
  });

  it("resolve the base layer, then profile, then the widget, with source dots", () => {
    const base = { lookId: "tui" };
    const profile = { values: { lookId: "hud" } };
    expect(resolveStyle({ levels: { base } })).toMatchObject({ settings: { lookId: "tui" }, source: { lookId: "app" } });
    expect(resolveStyle({ levels: { base, profile } })).toMatchObject({ settings: { lookId: "hud" }, source: { lookId: "profile" } });
    const own = { lookId: "ink" };
    const custom = { skin: false };
    expect(resolveStyle({ levels: { base, profile }, own, follow: custom })).toMatchObject({ settings: { lookId: "ink" }, source: { lookId: "own" } });
    expect(resolveStyle({ levels: { base, profile }, own }).settings.lookId).toBe("hud");
    const locked = { base, profile: { ...profile, locks: { skin: true } } };
    expect(resolveStyle({ levels: locked, own, follow: custom }).settings.lookId).toBe("hud");
  });

  it("show the layer a skin comes from", () => {
    const skin = find(STYLE_SETTINGS, "lookId");
    expect(settingStateOf(skin, undefined, undefined)).toBe("default");
    expect(settingStateOf(skin, { lookId: "ink" }, undefined)).toBe("here");
    expect(settingStateOf(skin, { lookId: "ink" }, { lookId: "hud" })).toBe("overriding");
    expect(settingStateOf(skin, {}, { lookId: "hud" })).toBe("profile");
  });
});
