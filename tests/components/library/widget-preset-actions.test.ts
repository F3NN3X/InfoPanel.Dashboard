// Saved widget presets in the Library, as the saved Styles are: listed (with their widget's name), applied to a selected
// zone of that widget, renamed, duplicated and deleted in the config, one config edit each.
import { describe, expect, it, vi } from "vitest";
import { deleteConfigItems, isSavedInConfig } from "@/components/library/multi-delete";
import { presetPrimary, presetSecondary, renamePreset, type PresetContext } from "@/components/library/preset-actions";
import { defaultConfig, type DashboardConfig, type Placement } from "@/lib/layout";
import { CONFIG_WPRESET, configItems } from "@/lib/my-library/config-items";
import { inCollection, KIND_LABEL, metaLine, type LibraryIndex } from "@/lib/my-library/model";
import type { UserWidgetPreset } from "@/lib/widget-presets";

const saved: UserWidgetPreset = { id: "w1", widget: "Weather", name: "Desk weather", view: "minimal", settings: { showStats: false }, size: [2, 1], created: "2026-01-15T12:00:00.000Z" };
const config = (): DashboardConfig => ({ ...defaultConfig(), widgetPresets: [saved, { ...saved, id: "w2", name: "Other", widget: "Clock", view: undefined }] });
const zone = (id: string, module: string, settings = {}) => ({ id, module, settings }) as unknown as Placement;

function ctxOver(start: DashboardConfig, selection: Placement[] = []) {
  let current = start;
  let placements = selection;
  const ctx = {
    bridge: {
      get config() {
        return current;
      },
      profileId: "p",
      selection,
      setConfig: (fn: (c: DashboardConfig) => DashboardConfig) => {
        current = fn(current);
      },
      updateProfile: (fn: (p: { placements: Placement[] }) => { placements: Placement[] }) => {
        placements = fn({ placements }).placements;
      },
      toast: vi.fn(),
    },
    selectionStyle: null,
    select: vi.fn(),
    rename: vi.fn(),
  } as unknown as PresetContext;
  return { ctx, now: () => current, zones: () => placements };
}
const titleOf = (id: string) => (id === "Weather" ? "Weather" : id);
const item = (id = "w1") => configItems(config(), titleOf).find((i) => i.id === CONFIG_WPRESET + id)!;
const run = (list: { label: string; run: () => void }[], label: string) => list.find((a) => a.label === label)!.run();

describe("saved widget presets as Library items", () => {
  it("lists each preset as a widget preset with its widget's name and size, after the saved Styles", () => {
    const items = configItems(config(), titleOf).filter((i) => i.kind === "wpreset");
    expect(items.map((i) => [i.id, i.name])).toEqual([[`${CONFIG_WPRESET}w1`, "Desk weather"], [`${CONFIG_WPRESET}w2`, "Other"]]);
    expect(KIND_LABEL.wpreset).toBe("Widget preset");
    expect(metaLine(items[0])).toBe("Weather · 2×1");
    expect(items[0].meta).toMatchObject({ source: "config", widget: "Weather" });
  });

  it("is its own collection, and skips an entry that is not shaped like a preset", () => {
    const index = { items: [], duplicates: [], groupOf: new Map(), suggested: [], used: new Set() } as LibraryIndex;
    const items = configItems({ ...config(), widgetPresets: [...config().widgetPresets!, { id: "bad" } as never] });
    expect(items.filter((i) => inCollection(i, "wpresets", index)).map((i) => i.name)).toEqual(["Desk weather", "Other"]);
    expect(inCollection(items[0], "styles", index)).toBe(false);
  });

  it("is kept in the config: saved, so deleted with the Styles and panels", () => {
    const items = configItems(config());
    expect(items.filter((i) => i.kind === "wpreset").every((i) => isSavedInConfig(i))).toBe(true);
    const next = deleteConfigItems(config(), [item("w1")]);
    expect(next.widgetPresets?.map((p) => p.id)).toEqual(["w2"]);
    expect(deleteConfigItems(next, [item("w2")]).widgetPresets).toBeUndefined();
  });
});

describe("the detail's actions", () => {
  it("applies the view and settings to a selected zone of the widget only, the size staying", () => {
    const { ctx, zones } = ctxOver(config(), [zone("z1", "Weather", { units: "imperial" }), zone("z2", "Clock")]);
    const primary = presetPrimary(item(), ctx);
    expect(primary.disabled).toBe(false);
    primary.run();
    expect(zones().find((z) => z.id === "z1")?.settings).toEqual({ units: "imperial", view: "minimal", showStats: false });
    expect(zones().find((z) => z.id === "z2")?.settings).toEqual({});
  });

  it("is off with nothing of its widget selected", () => {
    const { ctx, zones } = ctxOver(config(), [zone("z2", "Clock")]);
    const primary = presetPrimary(item(), ctx);
    expect(primary.disabled).toBe(true);
    primary.run();
    expect(zones()[0].settings).toEqual({});
    expect((ctx.bridge.toast as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe("Select a Weather widget first");
  });

  it("renames, duplicates after the original, and deletes", () => {
    const { ctx, now } = ctxOver(config());
    const actions = presetSecondary(item(), ctx);
    expect(actions.map((a) => a.label)).toEqual(["Rename", "Duplicate", "Delete"]);
    renamePreset(item(), ctx.bridge, "Renamed");
    expect(now().widgetPresets?.[0].name).toBe("Renamed");
    run(actions, "Duplicate");
    expect(now().widgetPresets?.map((p) => p.name)).toEqual(["Renamed", "Renamed copy", "Other"]);
    expect(now().widgetPresets?.[1]).toMatchObject({ widget: "Weather", view: "minimal", settings: { showStats: false }, size: [2, 1] });
    expect(now().widgetPresets?.[1].id).not.toBe("w1");
    run(actions, "Delete");
    expect(now().widgetPresets?.map((p) => p.id)).not.toContain("w1");
  });
});
