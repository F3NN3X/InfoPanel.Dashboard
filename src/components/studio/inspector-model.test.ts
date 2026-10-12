import { describe, expect, it } from "vitest";
import { modules } from "@/modules";
import { CARD_SETTINGS, PANEL_SETTINGS, PROFILE_STYLE_SETTINGS } from "@/modules/standard-settings";
import { settingKeys, type DashboardModule, type ModuleSetting } from "@/modules/types";
import {
  allSections,
  applyAdvanced,
  changedCount,
  extraMatches,
  jumpTarget,
  sharedDefs,
  visibleSections,
  globalStyleValues,
  isVisible,
  inspectorNotes,
  inspectorTabs,
  lookEditPatch,
  resetKeysOfSection,
  searchAll,
  sectionSize,
  sectionsFor,
  sourceState,
  tabChangedCounts,
  widgetContext,
  widgetLookValues,
  type InspectorContext,
  type InspectorSection,
} from "./inspector-model";

const mod = (id: string): DashboardModule => modules.find((m) => m.id === id)!;
const ids = (sections: InspectorSection[]) => sections.map((s) => s.id);
const titles = (sections: InspectorSection[]) => sections.map((s) => s.title);
const keysOf = (sections: InspectorSection[]) => sections.flatMap((s) => s.settings.map((d) => d.key));
const find = (sections: InspectorSection[], title: string) => sections.find((s) => s.title === title)!;

const spotify = widgetContext(mod("spotifymodern"));
const system = widgetContext(mod("systemmodern"));
const webpage = widgetContext(mod("webpage"));
const panel: InspectorContext = { kind: "panel", defs: PANEL_SETTINGS };

describe("every setting is in exactly one section of exactly one tab", () => {
  const contexts: [string, InspectorContext, ModuleSetting[]][] = [
    ...modules
      .map((m): [string, InspectorContext, ModuleSetting[]] => [m.id, widgetContext(m), m.settings ?? []]),
    ["cards", { kind: "widget", defs: CARD_SETTINGS }, CARD_SETTINGS],
    ["panel", panel, PANEL_SETTINGS],
  ];

  it.each(contexts)("%s", (_name, context, defs) => {
    const sections = allSections(context);
    expect(new Set(ids(sections)).size).toBe(sections.length);
    const tabs = new Set(inspectorTabs(context).map((t) => t.id));
    for (const s of sections) expect(tabs.has(s.tab), s.id).toBe(true);
    const listed = keysOf(sections);
    expect(new Set(listed).size).toBe(listed.length);
    // The tabs partition the same sections.
    const byTab = [...tabs].flatMap((tab) => sectionsFor(context, tab));
    expect(ids(byTab).sort()).toEqual(ids(sections).sort());
    expect([...listed].sort()).toEqual(defs.map((d) => d.key).sort());
  });

  it("holds the multi-select's shared look and the global style, each once", () => {
    for (const context of [
      { kind: "multi", defs: CARD_SETTINGS } as InspectorContext,
      { kind: "dashboard", scope: "all" } as InspectorContext,
    ]) {
      const listed = keysOf(allSections(context));
      expect(new Set(listed).size).toBe(listed.length);
    }
    const global = keysOf(sectionsFor({ kind: "dashboard", scope: "all" }, "gstyle"));
    expect([...global].sort()).toEqual(PROFILE_STYLE_SETTINGS.map((d) => d.key).sort());
  });
});

describe("inspectorTabs", () => {
  it("has Content, Style and Data for widgets and panels", () => {
    for (const context of [spotify, panel]) {
      expect(inspectorTabs(context)).toEqual([
        { id: "content", label: "Content" },
        { id: "style", label: "Style" },
        { id: "data", label: "Data" },
      ]);
    }
  });

  it("has none for a blank zone or several zones", () => {
    expect(inspectorTabs({ kind: "blank" })).toEqual([]);
    expect(inspectorTabs({ kind: "multi", defs: CARD_SETTINGS })).toEqual([]);
  });

  it("has the four dashboard tabs", () => {
    expect(inspectorTabs({ kind: "dashboard", scope: "all" }).map((t) => t.id)).toEqual([
      "profile",
      "appearance",
      "gstyle",
      "general",
    ]);
  });
});

describe("widget sections", () => {
  it("files the Widget card and the widget's own categories in Content", () => {
    expect(titles(sectionsFor(spotify, "content"))).toEqual([
      "Widget",
      "Now playing",
      "Cover art",
      "Waveform",
      "Visualizer",
      "Waveform shape",
    ]);
    expect(find(sectionsFor(spotify, "content"), "Widget").extras.map((e) => e.kind)).toEqual([
      "widgetPicker",
      "visible",
    ]);
  });

  it("files the look cards in Style, then the color categories, as advanced", () => {
    const style = sectionsFor(system, "style");
    expect(titles(style)).toEqual([
      "Size & alignment",
      "Typography",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
      "Advanced",
      "Device colors",
    ]);
    expect(style.filter((s) => s.advanced).map((s) => s.title)).toEqual(["Advanced", "Device colors"]);
    expect(find(style, "Colors & surface").extras.map((e) => e.kind)).toEqual(["styleMode", "styleTools"]);
    expect(find(style, "Border & effects").extras).toEqual([{ kind: "zoneFrame", advanced: true, count: 3 }]);
  });

  it("files the other color-picker categories in Style too", () => {
    for (const [id, title] of [
      ["hardwaremodern", "Dot colors"],
      ["fpsmodern", "Gauge colors"],
      ["bluetoothmodern", "Battery colors"],
      ["networkmodern", "Speed colors"],
    ]) {
      const context = widgetContext(mod(id));
      expect(titles(sectionsFor(context, "content")), id).not.toContain(title);
      const section = find(sectionsFor(context, "style"), title);
      expect(section.advanced, id).toBe(true);
    }
  });

  it("keeps the meter's colors in Content, flagged advanced one by one", () => {
    const meter = find(sectionsFor(widgetContext(mod("audiomodern")), "content"), "Meter");
    expect(meter.advanced).toBe(false);
    expect(meter.settings.filter((d) => d.advanced).map((d) => d.key)).toEqual(["levelColor", "hotColor"]);
  });

  it("files Audio source in Data, after the bound data", () => {
    const data = sectionsFor(spotify, "data");
    expect(titles(data)).toEqual(["Bound data", "Audio source"]);
    expect(data[0]).toMatchObject({ special: "boundData" });
    expect(keysOf(data)).toEqual(["liveSource", "liveCapture", "liveSources"]);
    expect(titles(sectionsFor(spotify, "content"))).not.toContain("Audio source");
  });

  it("offers Hide when idle only to the widgets that can be idle, and Layout only to adaptive ones", () => {
    for (const m of modules) {
      const sections = allSections(widgetContext(m));
      const keys = keysOf(sections);
      expect(keys.includes("hideWhenIdle"), `${m.id} idle`).toBe(m.isIdle !== undefined);
      if (keys.includes("hideWhenIdle")) {
        expect(find(sections, "Widget").settings.map((d) => d.key)).toContain("hideWhenIdle");
      }
      const adaptive = (m.settings ?? []).some((d) => d.key === "layout");
      expect(keys.includes("layout"), `${m.id} layout`).toBe(adaptive);
    }
    const adaptive = modules.filter((m) => (m.settings ?? []).some((d) => d.key === "layout")).map((m) => m.id);
    expect(adaptive).toContain("spotifymodern");
    expect(adaptive).not.toContain("vbz");
    expect(adaptive).not.toContain("webpage");
  });

  it("still has a Widget card when the schema has no setting in it (the picker lives there)", () => {
    const sections = sectionsFor(webpage, "content");
    expect(titles(sections)).toEqual(["Widget", "Page"]);
    expect(sections[0].settings).toEqual([]);
  });
});

describe("Web Page", () => {
  it("offers only the few look settings it has, each in its normal section, and no custom CSS", () => {
    expect(titles(sectionsFor(webpage, "style"))).toEqual([
      "Size & alignment",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
    ]);
    expect(keysOf(sectionsFor(webpage, "style"))).toContain("scale");
    expect(keysOf(sectionsFor(webpage, "style"))).not.toContain("customCss");
    expect(keysOf(sectionsFor(webpage, "content"))).toEqual(["url"]);
  });

  it("says so in a note on the Style tab", () => {
    expect(inspectorNotes(webpage, "style").map((n) => n.kind)).toEqual(["reduced"]);
    expect(inspectorNotes(webpage, "content")).toEqual([]);
  });
});

describe("panel sections", () => {
  it("lists Panel, Layout and Widgets, then the Widget card, in Content", () => {
    expect(titles(sectionsFor(panel, "content"))).toEqual(["Panel", "Layout", "Widgets", "Widget"]);
    expect(find(sectionsFor(panel, "content"), "Widget").extras.map((e) => e.kind)).toEqual(["visible"]);
  });

  it("adds Background for an overlay and the selected widget's cards after the list", () => {
    const overlay: InspectorContext = { ...panel, layout: "overlay", selectedWidget: true } as InspectorContext;
    expect(titles(sectionsFor(overlay, "content"))).toEqual([
      "Panel",
      "Layout",
      "Background",
      "Widgets",
      "Selected · widget",
      "Display",
      "Size & placement",
      "Typography & colors",
      "Selected · Advanced",
      "Widget",
    ]);
    expect(
      titles(sectionsFor({ ...overlay, selectedLabel: "Slider" } as InspectorContext, "content")).filter((t) => t.startsWith("Selected ·"))
    ).toEqual(["Selected · Slider", "Selected · Advanced"]);
    expect(sectionsFor(overlay, "content").filter((s) => s.advanced).map((s) => s.special)).toEqual(["widgetAdvanced"]);
  });

  it("swaps the layout and widget cards for the JSON in the code view", () => {
    const code: InspectorContext = { ...panel, codeView: true } as InspectorContext;
    expect(titles(sectionsFor(code, "content"))).toEqual(["Panel", "Panel JSON", "Widget"]);
  });

  it("has the same look cards as a widget and lists its sensors in Data", () => {
    expect(titles(sectionsFor(panel, "style"))).toEqual([
      "Size & alignment",
      "Typography",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
      "Advanced",
    ]);
    expect(sectionsFor(panel, "data")).toHaveLength(1);
    expect(sectionsFor(panel, "data")[0].special).toBe("panelData");
  });
});

describe("blank zone and several zones", () => {
  it("shows the Widget card and the zone frame, without tabs", () => {
    const sections = sectionsFor({ kind: "blank" });
    expect(titles(sections)).toEqual(["Widget", "Zone frame"]);
    expect(sections[0].special).toBe("blankPick");
    expect(inspectorNotes({ kind: "blank" }, undefined)[0].kind).toBe("blank");
  });

  it("shows only the Style sections for several zones", () => {
    const sections = sectionsFor({ kind: "multi", defs: spotify.kind === "widget" ? spotify.defs : [] });
    expect(sections.every((s) => s.tab === "style")).toBe(true);
    expect(titles(sections)).toEqual([
      "Size & alignment",
      "Typography",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
      "Advanced",
    ]);
    expect(find(sections, "Colors & surface").extras.map((e) => e.kind)).toEqual(["styleMode"]);
  });
});

describe("dashboard sections", () => {
  const dash: InspectorContext = { kind: "dashboard", scope: "all" };

  it("maps onto the existing cards", () => {
    expect(titles(sectionsFor(dash, "profile"))).toEqual(["Profile", "This profile", "Profile selection"]);
    expect(titles(sectionsFor(dash, "appearance"))).toEqual(["Scope", "Appearance presets", "Theme", "Page background"]);
    expect(titles(sectionsFor(dash, "general"))).toEqual(["Type", "Clock & date", "Display", "Studio", "Connection"]);
    expect(sectionsFor(dash, "appearance").map((s) => s.cardId)).toEqual([
      "doc:appearance",
      "doc:presets",
      "doc:theme",
      "doc:background",
    ]);
    expect(find(sectionsFor(dash, "general"), "Studio").terms).toContain("Inspector position");
  });

  it("has the look categories as the global style, without Follow, Preset or the Widget card", () => {
    const style = sectionsFor(dash, "gstyle");
    expect(titles(style)).toEqual([
      "Size & alignment",
      "Typography",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
      "Advanced",
    ]);
    expect(keysOf(style)).not.toContain("preset");
    expect(keysOf(style)).not.toContain("layout");
    expect(style.flatMap((s) => s.extras)).toEqual([]);
    expect(style.every((s) => s.id.startsWith("gs-"))).toBe(true);
  });

  it("states which level the global style edits", () => {
    expect(inspectorNotes(dash, "gstyle")[0].text).toContain("applies to all profiles");
    const note = inspectorNotes({ kind: "dashboard", scope: "profile", profileName: "Wide" }, "gstyle")[0].text;
    expect(note).toContain("'Wide' only");
    expect(inspectorNotes(dash, "general")).toEqual([]);
  });

  it("reads the global style's dots by scope", () => {
    const glow = PROFILE_STYLE_SETTINGS.find((d) => d.key === "glow")!;
    const all = globalStyleValues("all", { glow: "soft" }, { glow: "strong" });
    expect(sourceState(glow, all)).toBe("here");
    const profile = globalStyleValues("profile", { glow: "soft" }, {});
    expect(sourceState(glow, profile)).toBe("dashboard");
    expect(sourceState(glow, globalStyleValues("profile", { glow: "soft" }, { glow: "strong" }))).toBe("overriding");
    expect(sourceState(glow, globalStyleValues("profile", undefined, undefined))).toBe("default");
  });
});

describe("source states and changed counts", () => {
  const accent = CARD_SETTINGS.find((d) => d.key === "accent")!;
  const url = mod("webpage").settings!.find((d) => d.key === "url")!;
  const own = { accent: "#ff0000", glow: "soft", url: "https://example.com" };

  it("reads here, overriding and the inherited layers", () => {
    const custom = widgetLookValues({ own, dashboard: { glow: "strong", radius: "8" }, profile: { radius: "12" } });
    expect(sourceState(accent, custom)).toBe("here");
    expect(sourceState(CARD_SETTINGS.find((d) => d.key === "glow")!, custom)).toBe("overriding");
    expect(sourceState(CARD_SETTINGS.find((d) => d.key === "radius")!, custom)).toBe("profile");
    expect(sourceState(CARD_SETTINGS.find((d) => d.key === "blur")!, custom)).toBe("default");
  });

  it("marks set look values ignored while the widget follows or the style is forced", () => {
    for (const input of [{ mode: "follow" as const }, { enforce: true }]) {
      const values = widgetLookValues({ own, ...input });
      expect(sourceState(accent, values)).toBe("ignored");
    }
    // Content settings are never ignored.
    expect(sourceState(url, widgetLookValues({ own, mode: "follow" }))).toBe("here");
  });

  it("counts only the fields set here, ignored ones included, per section and tab", () => {
    const context: InspectorContext = { kind: "widget", defs: [...CARD_SETTINGS, url] };
    const sections = allSections(context);
    const custom = widgetLookValues({ own });
    expect(changedCount(find(sections, "Colors & surface"), custom)).toBe(1);
    expect(changedCount(find(sections, "Border & effects"), custom)).toBe(1);
    expect(changedCount(find(sections, "Typography"), custom)).toBe(0);
    expect(tabChangedCounts(sections, custom)).toEqual({ content: 1, style: 2, data: 0 });
    expect(tabChangedCounts(sections, widgetLookValues({ own, mode: "follow" }))).toEqual({
      content: 1,
      style: 2,
      data: 0,
    });
  });

  it("does not count defaults or inherited values", () => {
    const sections = allSections(system);
    const values = widgetLookValues({ own: { accent: "" }, dashboard: { glow: "soft" } });
    expect(tabChangedCounts(sections, values)).toEqual({ content: 0, style: 0, data: 0 });
  });

  it("lists the stored keys a section's Reset drops (both axes of an alignment)", () => {
    const sections = allSections(spotify);
    const values = widgetLookValues({ own: { alignX: "start", alignY: "end", scale: 120 } });
    expect(resetKeysOfSection(find(sections, "Size & alignment"), values).sort()).toEqual(["alignX", "alignY", "scale"]);
  });
});

describe("applyAdvanced", () => {
  it("shows everything when Advanced is on", () => {
    const sections = allSections(system);
    expect(applyAdvanced(sections, true)).toEqual({ sections, hiddenCount: 0 });
  });

  it("drops advanced sections, settings and extras, and counts what it hid", () => {
    const sections = sectionsFor(system, "style");
    const { sections: shown, hiddenCount } = applyAdvanced(sections, false);
    expect(titles(shown)).toEqual([
      "Size & alignment",
      "Typography",
      "Spacing & shape",
      "Colors & surface",
      "Border & effects",
    ]);
    expect(find(shown, "Size & alignment").settings.map((d) => d.key)).toEqual(["layout", "scale", "alignX"]);
    expect(find(shown, "Colors & surface").settings.map((d) => d.key)).not.toContain("background");
    expect(find(shown, "Border & effects").extras).toEqual([]);
    // autoScale + background + backgroundOn + frame (3) + custom CSS + 5 device colors
    expect(hiddenCount).toBe(1 + 2 + 3 + 1 + 5);
    const total = sections.reduce((n, s) => n + sectionSize(s), 0);
    expect(shown.reduce((n, s) => n + sectionSize(s), 0) + hiddenCount).toBe(total);
  });

  it("hides the waveform shape and the advanced visualizer fields in Content", () => {
    const { sections, hiddenCount } = applyAdvanced(sectionsFor(spotify, "content"), false);
    expect(titles(sections)).not.toContain("Waveform shape");
    expect(find(sections, "Visualizer").settings.map((d) => d.key)).toEqual([
      "visualizer",
      "visualizerBarCount",
      "visualizerAlign",
      "visualizerIdle",
    ]);
    expect(hiddenCount).toBe(4 + 7);
  });

  it("drops a section left with nothing but keeps custom-only ones", () => {
    const { sections } = applyAdvanced(sectionsFor(panel, "content"), false);
    expect(titles(sections)).toEqual(["Panel", "Layout", "Widgets", "Widget"]);
  });
});

describe("searchAll", () => {
  it("searches every tab and labels each result with its tab", () => {
    const { groups, total } = searchAll(spotify, "mirror");
    // "Waveform style" matches by its Mirror option, "Visualizer mirrored" by its label.
    expect(groups.map((g) => [g.tabLabel, g.section.title])).toEqual([
      ["Content", "Waveform"],
      ["Content", "Visualizer"],
    ]);
    expect(total).toBe(groups.reduce((n, g) => n + g.section.settings.length, 0));
    expect(keysOf(groups.map((g) => g.section))).toEqual(["waveformVariant", "visualizerMirrored"]);
  });

  it("finds settings in Style and Data in the same pass", () => {
    const result = searchAll(spotify, "color");
    const tabs = new Set(result.groups.map((g) => g.tabLabel));
    expect(tabs.has("Style")).toBe(true);
    expect(searchAll(spotify, "capture").groups.map((g) => g.tabLabel)).toEqual(["Data"]);
  });

  it("includes advanced settings whatever the Advanced toggle says", () => {
    expect(keysOf(searchAll(spotify, "bar radius").groups.map((g) => g.section))).toEqual(["waveformBarRadius"]);
  });

  it("lists matching rows only, not their whole category", () => {
    const { groups, total } = searchAll(system, "glow");
    expect(keysOf(groups.map((g) => g.section)).sort()).toEqual(["glow", "glowColor"]);
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it("falls back to a section title when no row matches", () => {
    const { groups } = searchAll(system, "thresholds");
    expect(titles(groups.map((g) => g.section))).toEqual(["Thresholds"]);
    expect(groups[0].section.settings.length).toBeGreaterThan(1);
  });

  it("finds custom cards by title and terms, and the Look extra by name", () => {
    const dash = searchAll({ kind: "dashboard", scope: "all" }, "inspector position");
    expect(dash.groups.map((g) => [g.tabLabel, g.section.title])).toEqual([["General", "Studio"]]);
    expect(dash.total).toBe(1);
    const follow = searchAll(spotify, "follow global");
    expect(follow.groups.map((g) => g.section.title)).toEqual(["Colors & surface"]);
    expect(follow.groups[0].section.settings).toEqual([]);
  });

  it("returns everything for a blank query and nothing for a miss", () => {
    expect(searchAll(spotify, " ").groups).toHaveLength(allSections(spotify).length);
    expect(searchAll(spotify, "zzzz-no-match")).toEqual({ groups: [], total: 0 });
  });

  it("has no tab label in a context without tabs", () => {
    expect(searchAll({ kind: "blank" }, "frame").groups[0].tabLabel).toBe("");
  });
});

describe("isVisible", () => {
  const glowColor = CARD_SETTINGS.find((d) => d.key === "glowColor")!;
  const accent = CARD_SETTINGS.find((d) => d.key === "accent")!;

  it("shows the glow color only with a glow", () => {
    expect(isVisible(glowColor, {})).toBe(false);
    expect(isVisible(glowColor, { glow: "none" })).toBe(false);
    expect(isVisible(glowColor, { glow: "soft" })).toBe(true);
    expect(isVisible(accent, {})).toBe(true);
  });
});

describe("lookEditPatch", () => {
  it("switches a following widget to Custom when a look key is edited", () => {
    expect(lookEditPatch("accent", "follow", false)).toEqual({ styleMode: "custom" });
    expect(lookEditPatch(["alignX", "alignY"], "follow", undefined)).toEqual({ styleMode: "custom" });
  });

  it("leaves content keys, Custom widgets and a forced style alone", () => {
    expect(lookEditPatch("url", "follow", false)).toEqual({});
    expect(lookEditPatch("accent", "custom", false)).toEqual({});
    expect(lookEditPatch("accent", undefined, false)).toEqual({});
    expect(lookEditPatch("accent", "follow", true)).toEqual({});
  });
});

describe("inspectorNotes", () => {
  it("warns on the Style tab while following, and when the style is forced", () => {
    expect(inspectorNotes(spotify, "style", { mode: "follow" }).map((n) => n.kind)).toEqual(["follow"]);
    expect(inspectorNotes(spotify, "style", { mode: "follow", enforce: true }).map((n) => n.kind)).toEqual(["forced"]);
    expect(inspectorNotes(spotify, "style", { mode: "custom" })).toEqual([]);
    expect(inspectorNotes(spotify, "content", { mode: "follow" })).toEqual([]);
  });
});

describe("settingKeys coverage", () => {
  it("never lists an align picker's second key as a separate setting", () => {
    const keys = allSections(spotify).flatMap((s) => s.settings.flatMap(settingKeys));
    expect(keys).toContain("alignY");
    expect(keysOf(allSections(spotify))).not.toContain("alignY");
  });
});

describe("view helpers", () => {
  const a: ModuleSetting = { key: "a", label: "A", type: "boolean", default: false };
  const b: ModuleSetting = { key: "b", label: "B", type: "boolean", default: false };
  const c: ModuleSetting = { key: "c", label: "C", type: "boolean", default: false };

  it("sharedDefs keeps the settings every zone has, in the first zone's order", () => {
    expect(sharedDefs([[b, a, c], [a, b], [c, b, a]]).map((d) => d.key)).toEqual(["b", "a"]);
    expect(sharedDefs([])).toEqual([]);
  });

  it("visibleSections drops hidden settings and sections left empty", () => {
    const sections = allSections(spotify);
    const visible = visibleSections(sections, (d) => d.key !== "glowColor");
    expect(keysOf(visible)).not.toContain("glowColor");
    const none = visibleSections(sections, () => false);
    expect(none.every((s) => s.extras.length > 0 || s.special !== undefined)).toBe(true);
  });

  it("jumpTarget finds a section by id, document card or split id", () => {
    expect(jumpTarget(allSections(spotify), "colors")?.title).toBe("Colors & surface");
    const dashboard = allSections({ kind: "dashboard", scope: "all" });
    expect(jumpTarget(dashboard, "doc:type")?.tab).toBe("general");
    expect(jumpTarget(dashboard, "doc:background")?.id).toBe("ap-bg");
    expect(jumpTarget(dashboard, "nope")).toBeUndefined();
  });

  it("extraMatches searches custom UI by its terms", () => {
    expect(extraMatches({ kind: "zoneFrame", advanced: true, count: 3 }, "frame")).toBe(true);
    expect(extraMatches({ kind: "zoneFrame", advanced: true, count: 3 }, "glow")).toBe(false);
    expect(extraMatches({ kind: "visible", advanced: false, count: 1 }, "")).toBe(true);
  });
});
