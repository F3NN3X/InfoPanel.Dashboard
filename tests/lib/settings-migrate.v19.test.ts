// Config v19 (the widget merges, _docs/widgets/MERGES.md): a merged-away widget's placement becomes its survivor in the
// matching view (M1: Forecast is Weather's forecast view; M3: Threshold Timeline is Session Stats' lanes view; M5: Vitals is
// KPI Tiles' cards view). Each case loads a config through `upgradeConfig` as the app does, or an outside file through
// `readImportedConfig`. What a migrated zone draws is tests/widgets/weather/forecast-view.test.tsx,
// tests/widgets/session-stats/lanes-view.test.tsx and tests/widgets/kpi-tiles/cards-view.test.tsx.
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

/** What the forecast view brings, so the View row reads Forecast and not Custom, and the Forecast widget's empty card. */
const VIEW = { view: "forecast", showForecast: true, showStats: false, showFeels: false, emptyCard: true };

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

describe("v19: a Threshold Timeline zone is Session Stats' lanes view (M3)", () => {
  it("one with no settings of its own gets the view and nothing else (no default differs)", () => {
    expect(zones(upgradeConfig(stored(18, [screen("s", [zone("t", "ThresholdTimeline")])])))[0]).toEqual(zone("t", "SessionStats", { settings: { view: "lanes" } }));
  });

  it("keeps its sensors, window, value thresholds and every other key, and the zone's id, box and flags", () => {
    const settings = { sensors: "libre.a,libre.b", window: 12, "warn.value": 60, "crit.value": 85, accent: "#00ff00", label: "Heat", compact: "card" };
    const extra = { colStart: 3, rowStart: 2, colSpan: 4, rowSpan: 2, visible: false, design: { header: true }, follow: { colors: false }, locked: true, name: "Lanes" };
    const out = zones(upgradeConfig(stored(18, [screen("s", [zone("t", "ThresholdTimeline", { ...extra, settings })])])))[0];
    expect(out).toEqual({ ...zone("t", "SessionStats", extra), settings: { ...settings, view: "lanes" } });
  });

  it("maps an inline canvas's Studio widget and an imported file", async () => {
    const canvas = { items: [{ kind: "Image", $: { widget: { module: "ThresholdTimeline", settings: { window: 3 } } } }] };
    const out = upgradeConfig(stored(18, [screen("s", [zone("c", "infopanel", { canvas })])]));
    expect((zones(out)[0].canvas as unknown as { items: { $: { widget: unknown } }[] }).items[0].$.widget).toEqual({ module: "SessionStats", settings: { window: 3, view: "lanes" } });
    const imported = await readImportedConfig(stored(CONFIG_VERSION, [screen("s", [zone("t", "ThresholdTimeline", { settings: { window: 7 } })])]));
    expect(zones(imported)[0]).toMatchObject({ module: "SessionStats", settings: { window: 7, view: "lanes" } });
  });

  it("leaves an existing Session Stats zone in its own view", () => {
    for (const settings of [undefined, { above: 70 }, { view: "stats", sensors: "libre.a" }]) {
      const z = zone("s", "SessionStats", settings ? { settings } : {});
      expect(zones(upgradeConfig(stored(18, [screen("s", [z])])))[0], JSON.stringify(settings)).toEqual(z);
    }
  });
});

describe("v19: a Vitals zone is KPI Tiles' cards view (M5)", () => {
  it("one with no metrics of its own gets the view, and the cards view's default (Vitals' own) applies", () => {
    expect(zones(upgradeConfig(stored(18, [screen("s", [zone("v", "Vitals")])])))[0]).toEqual(zone("v", "KpiTiles", { settings: { view: "cards" } }));
    const kpi = modules.find((m) => m.id === "KpiTiles")!;
    expect(kpi.settings?.find((d) => d.key === "cardMetrics")?.default).toBe("cpu,gpu,ram,net");
  });

  it("moves its metrics to cardMetrics, so the tiles view's own metrics never take FPS, and keeps every other key", () => {
    const out = zones(upgradeConfig(stored(18, [screen("s", [zone("v", "Vitals", { name: "Vitals", settings: { metrics: "cpu,fps,net", accent: "#ff0000", compact: "dense" } })])])))[0];
    expect(out).toEqual(zone("v", "KpiTiles", { name: "Vitals", settings: { cardMetrics: "cpu,fps,net", accent: "#ff0000", compact: "dense", view: "cards" } }));
    expect(out.settings).not.toHaveProperty("metrics");
  });

  it("maps an inline canvas's Studio widget and an imported file", async () => {
    const canvas = { items: [{ kind: "Group", DisplayItems: [{ kind: "Image", $: { widget: { module: "Vitals", settings: { metrics: "gpu" } } } }] }] };
    const out = upgradeConfig(stored(18, [screen("s", [zone("c", "infopanel", { canvas })])]));
    const items = (zones(out)[0].canvas as unknown as { items: { DisplayItems: { $: { widget: unknown } }[] }[] }).items;
    expect(items[0].DisplayItems[0].$.widget).toEqual({ module: "KpiTiles", settings: { cardMetrics: "gpu", view: "cards" } });
    const imported = await readImportedConfig({ profiles: [screen("s", [zone("v", "Vitals", { settings: { metrics: "vram" } })])] } as unknown as StoredConfig);
    expect(zones(imported)[0]).toMatchObject({ module: "KpiTiles", settings: { cardMetrics: "vram", view: "cards" } });
  });

  it("a Vitals from before v8 goes through the older steps first, then becomes the cards view", () => {
    const out = zones(upgradeConfig(stored(7, [screen("s", [zone("v", "Vitals", { settings: { metrics: "cpu,fps,net" } })])])))[0];
    expect(out).toMatchObject({ module: "KpiTiles", settings: { cardMetrics: "cpu,fps,net", view: "cards" } });
  });

  it("leaves an existing KPI Tiles zone in its own view, its metrics its own", () => {
    for (const settings of [undefined, { metrics: "cpu,power", lookback: 20 }]) {
      const z = zone("k", "KpiTiles", settings ? { settings } : {});
      expect(zones(upgradeConfig(stored(18, [screen("s", [z])])))[0], JSON.stringify(settings)).toEqual(z);
    }
  });
});

describe("v19: the version", () => {
  it("is stamped, and a migrated config loads again identical (the step is idempotent)", async () => {
    const out = upgradeConfig(stored(18, [screen("s", [zone("f", "Forecast", { settings: { days: 3 } }), zone("w", "Weather"), zone("t", "ThresholdTimeline", { settings: { window: 9 } }), zone("v", "Vitals", { settings: { metrics: "fps" } })])]));
    expect(out.version).toBe(CONFIG_VERSION);
    const again = JSON.parse(JSON.stringify(out)) as StoredConfig;
    expect(upgradeConfig(again)).toEqual(out);
    expect(await readConfig(again)).toEqual(out);
    expect(await readImportedConfig(again)).toEqual(out);
  });

  it("passes a v18 file without a merged-away id through untouched", () => {
    const profile = screen("s", [zone("w", "Weather", { settings: { view: "forecast", forecastDays: 3 } }), zone("c", "Clock"), zone("l", "SessionStats", { settings: { view: "lanes" } }), zone("k", "KpiTiles", { settings: { view: "cards", cardMetrics: "fps" } })]);
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
