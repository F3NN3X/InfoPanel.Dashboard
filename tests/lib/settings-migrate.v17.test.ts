// Config v17 (D6): each level stores a `lookId` plus the values over it. Each case loads a v16 config through
// `upgradeConfig`, as the app does. "As v16 read it" is the config normalised without the v17 step (`mergeConfig`):
// v17 changes no other field, so the resolved look of every widget must be the same on both.
import { describe, expect, it } from "vitest";
import { upgradeConfig } from "@/lib/config-upgrade";
import type { AppearancePreset } from "@/lib/appearance-presets";
import { CONFIG_VERSION, mergeConfig, readConfig, type DashboardConfig, type MonitorProfile, type Placement, type StoredConfig } from "@/lib/layout";
import { samplePreset } from "@/lib/screen-templates/sample-presets";
import { applyThemeToLevel } from "@/lib/theme-apply";
import { appearanceOf, resolveWith } from "@/lib/style-resolve";
import { lookIdOf } from "@/lib/theme-model";
import { SAMPLE_THEMES } from "@/looks/sample-themes";
import { MATERIALS } from "@/looks/materials";
import { SKIN_PACKS } from "@/widgets/core/theme";
import type { ModuleSettings } from "@/modules/types";

const TERM = SAMPLE_THEMES.find((t) => t.id === "term")!;
const PAPER = SAMPLE_THEMES.find((t) => t.id === "paper")!;
const SKINS = [undefined, "auto", "default", ...SKIN_PACKS.map((p) => p.name).filter((n) => n !== "default")];
const SURFACES = [...Object.keys(MATERIALS), "look-term", "auto"];

const zone = (id: string, settings?: ModuleSettings, follow?: Placement["follow"]): Placement => ({
  id, module: "CpuMonitor", colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2, visible: true, ...(settings ? { settings } : {}), ...(follow ? { follow } : {}),
});

/** One screen per skin and per surface, with widgets that follow, own a section, or own everything; locks and custom pages. */
function screens(): unknown[] {
  const out: unknown[] = [];
  SKINS.forEach((skin, i) => {
    const surface = SURFACES[i % SURFACES.length];
    out.push({
      id: `skin-${i}`, name: `Skin ${skin ?? "unset"}`, width: 1920, height: 550, cols: 12, rows: 4, fit: "fill",
      widgetTheme: { values: { ...(skin !== undefined ? { skin } : {}), surface, stroke: 120 }, ...(i % 3 === 0 ? { locks: { skin: true, colors: true } } : {}) },
      pages: [
        {
          id: `skin-${i}-a`, name: "A",
          placements: [zone(`${i}-follow`), zone(`${i}-own`, { skin: SKINS[(i + 1) % SKINS.length] ?? "auto", surface: "matte-light", accent: "#ff6a3d" }, { skin: false, surface: false }), zone(`${i}-all`, { surface: "neon" }, Object.fromEntries(["skin", "colors", "surface", "type", "spacing", "border"].map((s) => [s, false])))],
        },
        { id: `skin-${i}-b`, name: "B", widgetTheme: { values: { skin: "ink", surface: "carbon", accent: "#00ff00" }, follow: { skin: false, colors: i % 2 === 0 ? false : undefined } }, placements: [zone(`${i}-page`)] },
      ],
    });
  });
  SURFACES.forEach((surface, i) => out.push({ id: `surface-${i}`, name: surface, width: 800, height: 480, cols: 6, rows: 4, widgetTheme: { values: { surface } }, pages: [{ id: `surface-${i}-a`, name: "A", placements: [zone(`s${i}`)] }] }));
  return out;
}

const SAVED: AppearancePreset = { id: "desk", name: "Desk", description: "", theme: "ocean", radius: 1, style: { skin: "tui", accent: "#38bdf8" } };
const COPY = { ...samplePreset(TERM), id: "my-term", name: "My Term", style: (({ lookId: _l, ...rest }) => rest)(samplePreset(TERM).style) };

/** A v16 config as a v16 build saved it (no `lookId` anywhere). */
const v16 = (profiles: unknown[], extra: Record<string, unknown> = {}): StoredConfig =>
  JSON.parse(JSON.stringify({ version: 16, activeProfile: "auto", profiles, appearancePresets: [SAVED, COPY], ...extra })) as StoredConfig;

const load = (c: StoredConfig): DashboardConfig => upgradeConfig(c);
const asV16 = (c: StoredConfig): DashboardConfig => mergeConfig({ ...c, version: CONFIG_VERSION });
const byId = (c: DashboardConfig, id: string): MonitorProfile => c.profiles.find((p) => p.id === id)!;

/** Every widget's resolved settings, without the Look (a v16 build has none). */
function resolved(c: DashboardConfig): Record<string, ModuleSettings | undefined> {
  const out: Record<string, ModuleSettings | undefined> = {};
  for (const p of c.profiles) {
    for (const page of p.pages) {
      const levels = appearanceOf(c, { ...p, pageId: page.id, pageTheme: page.widgetTheme });
      for (const z of page.placements) {
        const { lookId: _look, ...rest } = resolveWith(levels, z.settings, z.follow) ?? {};
        out[z.id] = rest;
      }
    }
  }
  return out;
}

/** A v16 screen that applied a sample theme (as P3b's Theme view did: no `lookId`). */
function sampleScreen(id: string, theme = TERM, extra: Record<string, unknown> = {}): unknown {
  const { lookId: _l, ...style } = samplePreset(theme).style;
  const base = { id, name: id, width: 1920, height: 550, cols: 12, rows: 4, pages: [{ id: `${id}-main`, name: "Main", placements: [zone(`${id}-a`)] }] };
  const applied = applyThemeToLevel({ version: CONFIG_VERSION, activeProfile: "auto", profiles: [base as never] } as DashboardConfig, { ...samplePreset(theme), style }, { kind: "profile", profileId: id }).profiles[0];
  return { ...applied, ...extra };
}

describe("v17: the version", () => {
  it("is stamped, and a v17 config loads again identical", async () => {
    expect(CONFIG_VERSION).toBe(17);
    const out = load(v16(screens()));
    expect(out.version).toBe(17);
    const again = JSON.parse(JSON.stringify(out)) as StoredConfig;
    expect(load(again)).toEqual(out);
    expect(await readConfig(again)).toEqual(out);
  });
});

describe("v17: a config with no sample theme", () => {
  const stored = v16(screens());

  it("changes nothing but the version: every skin, surface, follow and lock shape, saved theme and snapshot round-trips", () => {
    const withSnapshot = v16([{ ...(screens()[0] as object), appliedTheme: { id: "desk", name: "Desk", tokens: { primary: "1 2% 3%" }, radius: 1, values: SAVED.style } }]);
    expect(load(stored)).toEqual({ ...asV16(stored), appearancePresets: load(stored).appearancePresets });
    expect(load(withSnapshot).profiles).toEqual(asV16(withSnapshot).profiles);
    expect(load(stored).appearancePresets?.[0]).toEqual(asV16(stored).appearancePresets?.[0]);
  });

  it("every widget resolves as a v16 build resolved it, and every level shows Classic", () => {
    const out = load(stored);
    expect(resolved(out)).toEqual(resolved(asV16(stored)));
    for (const p of out.profiles) {
      for (const page of p.pages) expect(lookIdOf(appearanceOf(out, { ...p, pageId: page.id, pageTheme: page.widgetTheme }))).toBe("classic");
    }
  });
});

describe("v17: a sample theme becomes its Look (L32)", () => {
  it("a screen that applied one names its Look in its values and its snapshot, as applying it now would", () => {
    const stored = v16([sampleScreen("s")]);
    const p = byId(load(stored), "s");
    expect(p.widgetTheme?.values?.lookId).toBe("term");
    expect(p.appliedTheme).toMatchObject({ id: "builtin:look-term", values: { lookId: "term", surface: "look-term" } });
    const now = applyThemeToLevel(load(v16([sampleScreen("s")])), samplePreset(TERM), { kind: "profile", profileId: "s" });
    expect(byId(now, "s").widgetTheme).toEqual(p.widgetTheme);
    expect(byId(now, "s").appliedTheme).toEqual(p.appliedTheme);
    expect(resolved(load(stored))).toEqual(resolved(asV16(stored)));
  });

  it("keeps what the level changed since, and its skin", () => {
    const screen = sampleScreen("s") as MonitorProfile;
    const edited = { ...screen, widgetTheme: { values: { ...screen.widgetTheme?.values, accent: "#ff0000", skin: "hud" } } };
    const p = byId(load(v16([edited])), "s");
    expect(p.widgetTheme?.values).toMatchObject({ lookId: "term", accent: "#ff0000", skin: "hud", surface: "look-term" });
  });

  it("a page that applied one names it; following its screen's skin it keeps following, so no stored skin of its own starts to apply", () => {
    const base = { id: "s", name: "S", width: 1920, height: 550, cols: 12, rows: 4, widgetTheme: { values: { skin: "hud" } } };
    const page = (extra: Record<string, unknown>) => ({ id: "pg", name: "Main", placements: [zone("pg-a")], appliedTheme: { id: "builtin:look-paper", name: "Paper", values: { surface: "look-paper" } }, ...extra });
    const following = v16([{ ...base, pages: [page({ widgetTheme: { values: { skin: "ink", surface: "look-paper" }, follow: { surface: false } } })] }]);
    const pg = byId(load(following), "s").pages[0];
    expect(pg.widgetTheme).toEqual({ values: { skin: "ink", surface: "look-paper", lookId: "paper" }, follow: { surface: false } });
    expect(pg.appliedTheme?.values).toEqual({ surface: "look-paper", lookId: "paper" });
    expect(resolved(load(following))).toEqual(resolved(asV16(following)));
    // A page whose screen locks the skin section: applying skips it, so does the migration.
    const locked = v16([{ ...base, widgetTheme: { ...base.widgetTheme, locks: { skin: true } }, pages: [page({})] }]);
    expect(byId(load(locked), "s").pages[0]).toEqual(byId(asV16(locked), "s").pages[0]);
  });

  it("a saved theme copied from one names its Look; one that names a Look, or is no copy, is left as it is", () => {
    const out = load(v16([], { appearancePresets: [SAVED, COPY, { ...COPY, id: "mine", style: { ...COPY.style, lookId: "paper" } }] }));
    expect(out.appearancePresets?.map((p) => p.style.lookId)).toEqual([undefined, "term", "paper"]);
    expect(out.appearancePresets?.[1].style).toEqual({ ...COPY.style, lookId: "term" });
  });

  it("an unknown sample id, a template theme or a saved theme's snapshot names no Look", () => {
    const tpl = sampleScreen("t", PAPER, { appliedTheme: { id: "builtin:look-nope", name: "Nope", values: {} } });
    const other = sampleScreen("o", PAPER, { appliedTheme: { id: "builtin:tpl-meters", name: "Meters", values: {} } });
    const out = load(v16([tpl, other]));
    for (const id of ["t", "o"]) expect(byId(out, id).widgetTheme?.values?.lookId, id).toBeUndefined();
  });
});
