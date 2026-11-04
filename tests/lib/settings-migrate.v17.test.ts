// Config v17 (D6): the skins are Looks, and each level stores one `lookId` plus the values over it. Each case loads a
// v16 config through `upgradeConfig`, as the app does. What v16 drew is read off the stored v16 config by a small
// resolver of its own (`v16Skin`); every other value must resolve as `mergeConfig` reads the same file.
import { describe, expect, it } from "vitest";
import { upgradeConfig } from "@/lib/config-upgrade";
import type { AppearancePreset } from "@/lib/appearance-presets";
import { CONFIG_VERSION, mergeConfig, readConfig, type DashboardConfig, type MonitorProfile, type Placement, type StoredConfig } from "@/lib/layout";
import { lookOfStoredSkin, migrateLooksV17 } from "@/lib/look-migrate";
import { samplePreset } from "@/lib/screen-templates/sample-presets";
import { applyThemeToLevel, themeState } from "@/lib/theme-apply";
import { appearanceOf, resolveWith } from "@/lib/style-resolve";
import { lookIdOf } from "@/lib/theme-model";
import { SKIN_LOOK_IDS } from "@/looks/ids";
import { SAMPLE_THEMES } from "@/looks/sample-themes";
import { MATERIALS } from "@/looks/materials";
import { SKIN_PACKS, skinOfLook } from "@/widgets/core/theme";
import type { ModuleSettings } from "@/modules/types";

const TERM = SAMPLE_THEMES.find((t) => t.id === "term")!;
const PAPER = SAMPLE_THEMES.find((t) => t.id === "paper")!;
const SKINS = [undefined, "auto", "default", "", "nope", ...SKIN_PACKS.map((p) => p.name).filter((n) => n !== "default")];
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
        { id: `skin-${i}-b`, name: "B", widgetTheme: { values: { skin: i % 2 === 0 ? "ink" : "auto", surface: "carbon", accent: "#00ff00" }, follow: { skin: i % 4 === 0 ? undefined : false, colors: i % 2 === 0 ? false : undefined } }, placements: [zone(`${i}-page`)] },
      ],
    });
  });
  SURFACES.forEach((surface, i) => out.push({ id: `surface-${i}`, name: surface, width: 800, height: 480, cols: 6, rows: 4, widgetTheme: { values: { surface } }, pages: [{ id: `surface-${i}-a`, name: "A", placements: [zone(`s${i}`)] }] }));
  return out;
}

const SAVED: AppearancePreset = { id: "desk", name: "Desk", description: "", theme: "ocean", radius: 1, style: { skin: "tui", accent: "#38bdf8" } };
/** A saved copy of a sample theme as a v16 build saved it: no Look, the Default skin. */
const COPY = { ...samplePreset(TERM), id: "my-term", name: "My Term", style: (({ lookId: _l, ...rest }) => rest)(samplePreset(TERM).style) };

/** A v16 config as a v16 build saved it (no `lookId` anywhere). */
const v16 = (profiles: unknown[], extra: Record<string, unknown> = {}): StoredConfig =>
  JSON.parse(JSON.stringify({ version: 16, activeProfile: "auto", profiles, appearancePresets: [SAVED, COPY], ...extra })) as StoredConfig;

const load = (c: StoredConfig): DashboardConfig => upgradeConfig(c);
const asV16 = (c: StoredConfig): DashboardConfig => mergeConfig({ ...c, version: CONFIG_VERSION });
const byId = (c: DashboardConfig, id: string): MonitorProfile => c.profiles.find((p) => p.id === id)!;

type Raw = { widgetTheme?: { values?: ModuleSettings; follow?: Record<string, boolean>; locks?: Record<string, boolean> }; pages: (Raw & { id: string; placements: Placement[] })[] };

/** The skin v16 drew a widget in, from the stored v16 config: the cascade of `skin` (SPEC §3.2), `auto` and unknown spellings as none (`default` is the core Default skin, drawn as such). */
function v16Skin(screen: Raw, page: Raw, z: Placement): string | undefined {
  const locked = screen.widgetTheme?.locks?.skin === true;
  const pageCustom = page.widgetTheme?.follow?.skin === false && !locked;
  const theme = (pageCustom ? page.widgetTheme?.values?.skin : undefined) ?? screen.widgetTheme?.values?.skin;
  const own = !locked && z.follow?.skin === false ? z.settings?.skin : undefined;
  const skin = own ?? theme;
  return typeof skin === "string" && (skin === "default" || SKIN_LOOK_IDS.includes(skin)) ? skin : undefined;
}

/** Every widget's skin as drawn, and the rest of its resolved settings. */
function drawn(c: DashboardConfig): Record<string, { skin?: string; rest: ModuleSettings }> {
  const out: Record<string, { skin?: string; rest: ModuleSettings }> = {};
  for (const p of c.profiles) {
    for (const page of p.pages) {
      const levels = appearanceOf(c, { ...p, pageId: page.id, pageTheme: page.widgetTheme });
      for (const z of page.placements) {
        const { lookId, skin: _skin, ...rest } = resolveWith(levels, z.settings, z.follow) ?? {};
        out[z.id] = { skin: skinOfLook(lookId), rest };
      }
    }
  }
  return out;
}

/** What v16 drew: the skin by `v16Skin`, the rest as `mergeConfig` reads the file (only `skin` is gone from it). */
function drawnByV16(stored: StoredConfig): Record<string, { skin?: string; rest: ModuleSettings }> {
  const out = drawn(asV16(stored));
  for (const screen of stored.profiles as unknown as Raw[]) {
    for (const page of screen.pages) for (const z of page.placements) out[z.id] = { ...out[z.id], skin: v16Skin(screen, page, z) };
  }
  return out;
}

/** A v16 screen that applied a sample theme (as P3b's Theme view did: no Look, no skin). */
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
    expect(migrateLooksV17(out)).toEqual(out);
  });

  it("a version that is a string below 17, or no number at all, takes the step; a newer one does not", async () => {
    for (const version of ["16", "x"]) expect(byId(load({ ...v16(screens()), version } as unknown as StoredConfig), "skin-5").widgetTheme?.values?.lookId, version).toBe("tui");
    const newer = { version: 18, activeProfile: "auto", profiles: [{ id: "s", name: "S", width: 800, height: 480, widgetTheme: { values: { lookId: "a-newer-look", skin: "hud" } }, pages: [{ id: "a", name: "A", placements: [] }] }] } as unknown as StoredConfig;
    // Its Look is one this build doesn't know: kept in storage (a newer build's), drawn as Classic; a `skin` it holds is no Look and nothing reads it.
    expect((await readConfig(newer)).profiles[0].widgetTheme?.values?.lookId).toBe("a-newer-look");
    expect(load(newer).profiles[0].widgetTheme?.values?.lookId).toBe("a-newer-look");
  });
});

describe("v17: every stored skin is the level's Look", () => {
  const stored = v16(screens());
  const out = load(stored);

  it("at every level: screens, pages, widgets and saved themes; `auto` and unknown skins are Classic, `default` its own hidden Look", () => {
    expect(JSON.stringify(out)).not.toMatch(/"skin":"/);
    expect([undefined, "auto", "default", "", "nope", "hud", 3].map(lookOfStoredSkin)).toEqual(["classic", "classic", "default", "classic", "classic", "hud", "classic"]);
    const raw = stored.profiles as unknown as Raw[];
    for (const [i, screen] of raw.entries()) {
      const p = out.profiles[i];
      const skin = screen.widgetTheme?.values?.skin;
      expect(p.widgetTheme?.values?.lookId, p.id).toBe(skin === undefined ? undefined : lookOfStoredSkin(skin));
      screen.pages.forEach((page, j) => {
        const pageSkin = page.widgetTheme?.values?.skin;
        expect(p.pages[j].widgetTheme?.values?.lookId, page.id).toBe(pageSkin === undefined ? undefined : lookOfStoredSkin(pageSkin));
        page.placements.forEach((z, k) => expect(p.pages[j].placements[k].settings?.lookId, z.id).toBe(z.settings?.skin === undefined ? undefined : lookOfStoredSkin(z.settings.skin)));
      });
    }
    expect(out.appearancePresets?.[0].style).toEqual({ lookId: "tui", accent: "#38bdf8" });
  });

  it("keeps every follow and lock flag: the skin section's flags govern the Look", () => {
    const flags = (c: DashboardConfig) => c.profiles.map((p) => [p.widgetTheme?.locks, p.pages.map((pg) => [pg.widgetTheme?.follow, pg.placements.map((z) => z.follow)])]);
    expect(flags(out)).toEqual(flags(asV16(stored)));
  });

  it("every widget draws the skin v16 drew, every other value as before, and every level shows Classic or its skin's Look", () => {
    expect(drawn(out)).toEqual(drawnByV16(stored));
    for (const p of out.profiles) {
      for (const page of p.pages) expect(lookIdOf(appearanceOf(out, { ...p, pageId: page.id, pageTheme: page.widgetTheme }))).toMatch(/^(classic|[a-z]+)$/);
    }
  });

  it("a theme snapshot and its writes into widgets name the Look, so what changed since is what v16 said", () => {
    const writes = { "skin-0-follow": { was: { skin: "auto" }, now: { skin: "hud", accent: "#fff" } } };
    const snap = (values: ModuleSettings) => ({ id: "desk", name: "Desk", tokens: { primary: "1 2% 3%" }, radius: 1, values, zones: writes });
    const base = screens()[0] as { widgetTheme: { values: ModuleSettings } };
    const same = { ...base, id: "same", theme: { primary: "1 2% 3%" }, radius: 1, widgetTheme: { values: { skin: "auto" } }, appliedTheme: snap({ skin: "default" }) };
    const changed = { ...same, id: "changed", widgetTheme: { values: { skin: "hud" } }, appliedTheme: snap({ skin: "tui" }) };
    const c = load(v16([same, changed]));
    expect(byId(c, "same").appliedTheme?.values).toEqual({ lookId: "default" });
    expect(byId(c, "same").appliedTheme?.zones).toEqual({ "skin-0-follow": { was: { lookId: "classic" }, now: { lookId: "hud", accent: "#fff" } } });
    expect(themeState(c, { kind: "profile", profileId: "same" }).changed).toEqual([]);
    expect(themeState(c, { kind: "profile", profileId: "changed" }).changed).toEqual(["skin"]);
  });
});

describe("v17: a sample theme names its Look (L32)", () => {
  it("a screen that applied one names its Look in its values and its snapshot, as applying it now would", () => {
    const stored = v16([sampleScreen("s")]);
    const p = byId(load(stored), "s");
    expect(p.widgetTheme?.values?.lookId).toBe("term");
    expect(p.appliedTheme).toMatchObject({ id: "builtin:look-term", values: { lookId: "term", surface: "look-term" } });
    const now = applyThemeToLevel(load(v16([sampleScreen("s")])), samplePreset(TERM), { kind: "profile", profileId: "s" });
    expect(byId(now, "s").widgetTheme).toEqual(p.widgetTheme);
    expect(byId(now, "s").appliedTheme).toEqual(p.appliedTheme);
    expect(drawn(load(stored))).toEqual(drawnByV16(stored));
    expect(themeState(load(stored), { kind: "profile", profileId: "s" }).changed).toEqual([]);
  });

  it("a screen that picked a skin since keeps that skin as its Look, and shows the skin changed, as v16 did", () => {
    const screen = sampleScreen("s") as MonitorProfile;
    const edited = { ...screen, widgetTheme: { values: { ...screen.widgetTheme?.values, accent: "#ff0000", skin: "hud" } } };
    const out = load(v16([edited]));
    expect(byId(out, "s").widgetTheme?.values).toMatchObject({ lookId: "hud", accent: "#ff0000", surface: "look-term" });
    expect(byId(out, "s").appliedTheme?.values?.lookId).toBeUndefined();
    expect(themeState(out, { kind: "profile", profileId: "s" }).changed).toEqual(["skin"]);
    expect(drawn(out)).toEqual(drawnByV16(v16([edited])));
  });

  it("a page names it only where its skin section is its own and draws the Default skin; following, locked or under a skin it names none", () => {
    const screen = (skin: string | undefined, pageTheme: Record<string, unknown>, locks?: Record<string, boolean>) => ({
      id: "s", name: "S", width: 1920, height: 550, cols: 12, rows: 4,
      widgetTheme: { values: skin ? { skin } : {}, ...(locks ? { locks } : {}) },
      pages: [{ id: "pg", name: "Main", placements: [zone("pg-a")], appliedTheme: { id: "builtin:look-paper", name: "Paper", values: { surface: "look-paper" } }, widgetTheme: pageTheme }],
    });
    const own = v16([screen("auto", { values: { surface: "look-paper" }, follow: { skin: false, surface: false } })]);
    expect(byId(load(own), "s").pages[0].widgetTheme?.values).toEqual({ surface: "look-paper", lookId: "paper" });
    expect(byId(load(own), "s").pages[0].appliedTheme?.values).toEqual({ surface: "look-paper", lookId: "paper" });
    expect(themeState(load(own), { kind: "page", profileId: "s", pageId: "pg" }).changed).toEqual([]);
    const cases = [
      screen("hud", { values: { skin: "ink", surface: "look-paper" }, follow: { surface: false } }),
      screen("hud", { values: { surface: "look-paper" }, follow: { skin: false, surface: false } }),
      screen(undefined, { values: { surface: "look-paper" }, follow: { skin: false } }, { skin: true }),
    ];
    for (const [i, c] of cases.entries()) {
      const stored = v16([c]);
      const pg = byId(load(stored), "s").pages[0];
      expect(pg.appliedTheme?.values, String(i)).toEqual({ surface: "look-paper" });
      expect(pg.widgetTheme?.values?.lookId, String(i)).toBe(i === 0 ? "ink" : undefined);
      expect(themeState(load(stored), { kind: "page", profileId: "s", pageId: "pg" }).changed, String(i)).toEqual([]);
      expect(drawn(load(stored)), String(i)).toEqual(drawnByV16(stored));
    }
    expect(drawn(load(own))).toEqual(drawnByV16(own));
  });

  it("a saved theme copied from one names its Look; one with a skin of its own, or no copy, keeps that", () => {
    const hudCopy = { ...COPY, id: "hud-copy", style: { ...COPY.style, skin: "hud" } };
    const out = load(v16([], { appearancePresets: [SAVED, COPY, hudCopy] }));
    expect(out.appearancePresets?.map((p) => p.style.lookId)).toEqual(["tui", "term", "hud"]);
    expect(out.appearancePresets?.[1].style).toEqual({ ...COPY.style, lookId: "term" });
  });

  it("a level that applied a saved copy of one names its Look in its values and snapshot, as the copy does", () => {
    const { lookId: _l, ...style } = samplePreset(TERM).style;
    const applied = { ...(sampleScreen("c") as MonitorProfile), appliedTheme: { id: COPY.id, name: COPY.name, tokens: (sampleScreen("c") as MonitorProfile).appliedTheme?.tokens, radius: TERM.radius, values: style } };
    const out = load(v16([applied]));
    expect(byId(out, "c").widgetTheme?.values?.lookId).toBe("term");
    expect(byId(out, "c").appliedTheme?.values).toEqual({ ...style, lookId: "term" });
    expect(byId(out, "c").appliedTheme?.values).toEqual(out.appearancePresets?.[1].style);
  });

  it("an unknown sample id or a template theme names no sample Look", () => {
    const tpl = sampleScreen("t", PAPER, { appliedTheme: { id: "builtin:look-nope", name: "Nope", values: {} } });
    const other = sampleScreen("o", PAPER, { appliedTheme: { id: "builtin:tpl-meters", name: "Meters", values: {} } });
    const out = load(v16([tpl, other]));
    for (const id of ["t", "o"]) expect(byId(out, id).widgetTheme?.values?.lookId, id).toBeUndefined();
  });
});

describe("v17: a Look this build doesn't know", () => {
  const v17 = (lookId: unknown) =>
    ({
      version: 17, activeProfile: "auto",
      appearancePresets: [{ id: "t", name: "T", theme: "ocean", radius: 1, style: { lookId, accent: "#fff" } }],
      profiles: [{ id: "s", name: "S", width: 800, height: 480, widgetTheme: { values: { lookId } }, pages: [{ id: "a", name: "A", widgetTheme: { values: { lookId }, follow: { skin: false } }, placements: [zone("own", { lookId: lookId as string }, { skin: false })] }] }],
    }) as unknown as StoredConfig;

  it("keeps the id in storage at every level (a newer build's) and draws Classic, the Default skin", async () => {
    for (const id of ["nope", "Term"]) {
      const c = await readConfig(v17(id));
      const p = c.profiles[0];
      expect([p.widgetTheme?.values?.lookId, p.pages[0].widgetTheme?.values?.lookId, c.appearancePresets?.[0].style.lookId, p.pages[0].placements[0].settings?.lookId], id).toEqual([id, id, id, id]);
      expect(lookIdOf(appearanceOf(c, { ...p, pageId: "a", pageTheme: p.pages[0].widgetTheme })), id).toBe("classic");
      expect(drawn(c).own.skin, id).toBeUndefined();
    }
  });

  it("a value that is not text is Classic", async () => {
    const c = await readConfig(v17(5));
    expect([c.profiles[0].widgetTheme?.values?.lookId, c.appearancePresets?.[0].style.lookId]).toEqual(["classic", undefined]);
  });
});
