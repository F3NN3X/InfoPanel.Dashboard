// Config v19 (the widget merges, _docs/widgets/MERGES.md): a merged-away widget's placement becomes its survivor in the
// matching view (M1: Forecast is Weather's forecast view). Each case loads a config through `upgradeConfig` as the app
// does, or an outside file through `readImportedConfig`. What a migrated zone draws is tests/widgets/weather/forecast-view.test.tsx.
import { describe, expect, it } from "vitest";
import { upgradeConfig } from "@/lib/config-upgrade";
import { CONFIG_VERSION, readConfig, readImportedConfig, type DashboardConfig, type StoredConfig } from "@/lib/layout";
import { SCREEN_TEMPLATES } from "@/lib/screen-templates/catalog";
import { instantiate } from "@/lib/screen-templates/instantiate";
import { REFERENCE } from "@/lib/screen-templates/kit";
import { migrateMergedWidgetsV19, migratePlacementV19, WIDGET_MERGES } from "@/lib/settings-migrate.v19";
import { modules } from "@/modules";
import type { ModuleSettings } from "@/modules/types";

const zone = (id: string, module: string, extra: Record<string, unknown> = {}) => ({ id, module, colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 1, visible: true, ...extra });
const screen = (id: string, placements: unknown[], pages = [{ id: "main", name: "Main", placements }]) => ({ id, name: id, width: 1920, height: 1080, cols: 12, rows: 6, fit: "fill", pages });
const stored = (version: number, profiles: unknown[]): StoredConfig => JSON.parse(JSON.stringify({ version, activeProfile: "auto", profiles })) as StoredConfig;
const zones = (c: DashboardConfig, i = 0, page = 0) => c.profiles[i].pages[page].placements;

/** What the forecast view brings, so the View row reads Forecast and not Custom. */
const VIEW = { view: "forecast", showForecast: true, showStats: false, showFeels: false };

describe("v19: a Forecast zone is Weather's forecast view", () => {
  it("one that stored no days fits as many as the zone holds (forecastDays 0), not Weather's 5", () => {
    expect(zones(upgradeConfig(stored(18, [screen("s", [zone("f", "Forecast")])])))[0]).toEqual(zone("f", "Weather", { settings: { ...VIEW, forecastDays: 0 } }));
  });

  it("one with its own days keeps them as forecastDays, and every other key it stored", () => {
    const out = zones(upgradeConfig(stored(18, [screen("s", [zone("f", "Forecast", { settings: { days: 3, location: "brevik-norway", tempUnit: "f", accent: "#ff0000", label: "Week" } })])])))[0];
    expect(out.module).toBe("Weather");
    expect(out.settings).toEqual({ location: "brevik-norway", tempUnit: "f", accent: "#ff0000", label: "Week", ...VIEW, forecastDays: 3 });
    for (const days of [0, 7]) expect(migratePlacementV19({ module: "Forecast", settings: { days } as ModuleSettings }).settings?.forecastDays, String(days)).toBe(days);
  });

  it("keeps the id, box, visibility, design, follow flags, lock, name, group and island send", () => {
    const extra = {
      colStart: 9,
      rowStart: 5,
      colSpan: 4,
      rowSpan: 2,
      visible: false,
      design: { header: true },
      follow: { colors: false, format: true },
      locked: true,
      name: "Days ahead",
      settings: { island: true, islandDetail: "rich", days: 2 },
    };
    const out = zones(upgradeConfig(stored(18, [screen("s", [zone("f", "Forecast", extra)])])))[0];
    expect(out).toEqual({ ...zone("f", "Weather", extra), settings: { island: true, islandDetail: "rich", ...VIEW, forecastDays: 2 } });
    // a page group the load keeps when the page has it (normalizeProfile drops one it does not)
    expect(migratePlacementV19({ module: "Forecast", groupId: "g1" })).toMatchObject({ module: "Weather", groupId: "g1" });
  });

  it("maps every profile and page, and the Studio widgets an inline canvas holds (groups included)", () => {
    const widget = (settings?: object) => ({ kind: "Image", $: { widget: { module: "Forecast", ...(settings ? { settings } : {}) } } });
    const canvas = { items: [widget(), { kind: "Group", DisplayItems: [widget({ days: 4 }), { kind: "Text", $: { key: "x" } }] }] };
    const out = upgradeConfig(
      stored(18, [
        screen("a", [], [
          { id: "p1", name: "One", placements: [zone("f1", "Forecast"), zone("w", "Weather", { settings: { view: "now" } })] },
          { id: "p2", name: "Two", placements: [zone("f2", "Forecast", { settings: { days: 5 } })] },
        ]),
        screen("b", [zone("c", "infopanel", { canvas })]),
      ]),
    );
    expect(zones(out, 0, 0).map((z) => [z.module, z.settings?.view, z.settings?.forecastDays])).toEqual([["Weather", "forecast", 0], ["Weather", "now", undefined]]);
    expect(zones(out, 0, 1)[0].settings).toEqual({ ...VIEW, forecastDays: 5 });
    const items = (zones(out, 1)[0].canvas as unknown as { items: { $?: { widget?: unknown }; DisplayItems?: { $?: { widget?: unknown } }[] }[] }).items;
    expect(items[0].$?.widget).toEqual({ module: "Weather", settings: { ...VIEW, forecastDays: 0 } });
    expect(items[1].DisplayItems?.[0].$?.widget).toEqual({ module: "Weather", settings: { ...VIEW, forecastDays: 4 } });
    expect(items[1].DisplayItems?.[1]).toEqual({ kind: "Text", $: { key: "x" } });
  });

  it("maps an old id in an imported file, whatever version it says: a config, a screen file labelled current, a bare profile", async () => {
    for (const version of [18, CONFIG_VERSION]) {
      const out = await readImportedConfig(stored(version, [screen("s", [zone("f", "Forecast", { settings: { days: 6 } })])]));
      expect(zones(out)[0], String(version)).toMatchObject({ module: "Weather", settings: { ...VIEW, forecastDays: 6 } });
    }
    const bare = await readImportedConfig({ profiles: [screen("s", [zone("f", "Forecast")])] } as unknown as StoredConfig);
    expect(zones(bare)[0]).toMatchObject({ module: "Weather", settings: { ...VIEW, forecastDays: 0 } });
  });

  it("a Forecast from before v7 (its `units`) goes through the older steps first, then becomes Weather's view", () => {
    const out = zones(upgradeConfig(stored(6, [screen("s", [zone("f", "Forecast", { settings: { units: "F", days: 3 } })])])))[0];
    expect(out).toMatchObject({ module: "Weather", settings: { tempUnit: "f", ...VIEW, forecastDays: 3 } });
    expect(out.settings).not.toHaveProperty("units");
    expect(out.settings).not.toHaveProperty("days");
  });
});

describe("v19: the version", () => {
  it("is stamped, and a migrated config loads again identical (the step is idempotent)", async () => {
    const out = upgradeConfig(stored(18, [screen("s", [zone("f", "Forecast", { settings: { days: 3 } }), zone("w", "Weather")])]));
    expect(out.version).toBe(CONFIG_VERSION);
    const again = JSON.parse(JSON.stringify(out)) as StoredConfig;
    expect(upgradeConfig(again)).toEqual(out);
    expect(await readConfig(again)).toEqual(out);
    expect(await readImportedConfig(again)).toEqual(out);
  });

  it("passes a v18 file without a merged-away id through untouched", () => {
    const profile = screen("s", [zone("w", "Weather", { settings: { view: "forecast", forecastDays: 3 } }), zone("c", "Clock")]);
    expect(migrateMergedWidgetsV19(profile as never)).toBe(profile);
    const out = upgradeConfig(stored(18, [profile]));
    expect(zones(out)).toEqual(profile.pages[0].placements);
  });
});

describe("v19: the merge table", () => {
  it("maps each merged-away id to a registered survivor and one of its views, and no merged-away id is registered", () => {
    for (const m of WIDGET_MERGES) {
      const to = modules.find((x) => x.id === m.to);
      expect(to, m.to).toBeDefined();
      expect(to!.views?.map((v) => v.id), m.from).toContain(m.view);
      expect(modules.some((x) => x.id === m.from), m.from).toBe(false);
      expect(migratePlacementV19({ module: m.from, settings: {} as ModuleSettings }).settings?.view, m.from).toBe(m.view);
    }
  });

  it("leaves no merged-away id in the built-in screen templates", () => {
    const merged = new Set(WIDGET_MERGES.map((m) => m.from));
    for (const t of SCREEN_TEMPLATES)
      for (const v of t.variants ?? [undefined])
        for (const s of [...Object.values(REFERENCE), t.size]) {
          const { profile } = instantiate(t, { name: t.name, variant: v?.id, width: s.width, height: s.height });
          for (const pg of profile.pages) for (const p of pg.placements) expect(merged.has(p.module), `${t.id}: ${p.module}`).toBe(false);
        }
  });
});
