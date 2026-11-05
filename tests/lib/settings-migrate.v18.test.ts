// Config v18 (L44): a level that names a sample Look no longer stores that Look's own card, so a page that stored the card
// alone (the v16 card-only shape v17 kept) gets the Look layer. Each case loads a v17 config through `upgradeConfig`, as
// the app does, and reads the result through the same resolution the kiosk uses.
import { beforeAll, describe, expect, it } from "vitest";
import { upgradeConfig } from "@/lib/config-upgrade";
import { CONFIG_VERSION, readConfig, type DashboardConfig, type StoredConfig } from "@/lib/layout";
import { appearanceOf, resolveWith } from "@/lib/style-resolve";
import { lookLayers } from "@/looks/sample-cards";
import { registerSampleCards } from "@/looks/sample-materials";
import { SAMPLE_LOOK_IDS } from "@/looks/ids";
import type { ModuleSettings } from "@/modules/types";

beforeAll(registerSampleCards);

const page = (id: string, values?: ModuleSettings, follow?: Record<string, boolean>, settings?: ModuleSettings) => ({
  id,
  name: id,
  ...(values ? { widgetTheme: { values, ...(follow ? { follow } : {}) } } : {}),
  placements: [{ id: `${id}-z`, module: "CpuMonitor", colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2, visible: true, ...(settings ? { settings } : {}) }],
});

const screen = (id: string, values: ModuleSettings | undefined, pages: unknown[], extra: Record<string, unknown> = {}) => ({
  id, name: id, width: 1920, height: 550, cols: 12, rows: 4, fit: "fill", ...(values ? { widgetTheme: { values } } : {}), pages, ...extra,
});

const v17 = (profiles: unknown[], extra: Record<string, unknown> = {}): StoredConfig =>
  JSON.parse(JSON.stringify({ version: 17, activeProfile: "auto", profiles, ...extra })) as StoredConfig;
const load = (c: StoredConfig): DashboardConfig => upgradeConfig(c);
const byId = (c: DashboardConfig, id: string) => c.profiles.find((p) => p.id === id)!;

/** What the first widget of a screen's page draws, resolved as the kiosk does. */
function drawn(c: DashboardConfig, screenId: string, pageId: string): ModuleSettings {
  const p = byId(c, screenId);
  const pg = p.pages.find((x) => x.id === pageId)!;
  return resolveWith(appearanceOf(c, { ...p, pageId, pageTheme: pg.widgetTheme }), pg.placements[0].settings, pg.placements[0].follow) ?? {};
}

describe("v18: the version", () => {
  it("is stamped, and a v18 config loads again identical", async () => {
    expect(CONFIG_VERSION).toBeGreaterThanOrEqual(18);
    const out = load(v17([screen("s", { lookId: "term", surface: "look-term" }, [page("a")])]));
    expect(out.version).toBe(CONFIG_VERSION);
    const again = JSON.parse(JSON.stringify(out)) as StoredConfig;
    expect(load(again)).toEqual(out);
    expect(await readConfig(again)).toEqual(out);
  });

  it("takes the step below 18 only: a v18 config keeps a card it stores", () => {
    const stored = { version: 18, activeProfile: "auto", profiles: [screen("s", { lookId: "term", surface: "look-term" }, [page("a")])] } as unknown as StoredConfig;
    expect(byId(load(stored), "s").widgetTheme?.values).toEqual({ lookId: "term", surface: "look-term" });
    for (const version of ["17", "x"]) expect(byId(load({ ...stored, version } as unknown as StoredConfig), "s").widgetTheme?.values, version).toEqual({ lookId: "term" });
  });
});

describe("v18: the stored card copies", () => {
  it("every level that stores its sample Look's own card stores it no more: screens, pages, widgets, snapshots, saved themes and styles", () => {
    const own = { lookId: "term", surface: "look-term" };
    const out = load(
      v17(
        [
          screen("s", own, [page("a", own, { skin: false }, own)], { appliedTheme: { id: "builtin:look-term", name: "Term", values: own } }),
          screen("t", undefined, [page("b", undefined, undefined, own)]),
        ],
        { appearancePresets: [{ id: "my", name: "My", description: "", theme: "ocean", radius: 1, style: own }], stylePresets: [{ id: "st", name: "St", settings: own }] },
      ),
    );
    expect(JSON.stringify(out)).not.toContain('"surface":"look-term"');
    expect(byId(out, "s").widgetTheme?.values).toEqual({ lookId: "term" });
    expect(byId(out, "s").pages[0].widgetTheme?.values).toEqual({ lookId: "term" });
    expect(byId(out, "s").pages[0].placements[0].settings).toEqual({ lookId: "term" });
    expect(byId(out, "s").appliedTheme?.values).toEqual({ lookId: "term" });
    expect(byId(out, "t").pages[0].placements[0].settings).toEqual({ lookId: "term" });
    expect(out.appearancePresets?.[0].style).toEqual({ lookId: "term" });
    expect(out.stylePresets?.[0].settings).toEqual({ lookId: "term" });
  });

  it.each(SAMPLE_LOOK_IDS)("%s: its own card goes, the same card under another Look and the user's other values stay", (id) => {
    const out = load(
      v17([
        screen("s", { lookId: id, surface: `look-${id}`, surfaceOpacity: 80, blur: 12, accent: "#123456" }, [
          page("a"),
          page("b", { lookId: id, surface: "matte-dark" }, { skin: false }),
          page("c", { lookId: "classic", surface: `look-${id}` }, { skin: false }),
          page("d", { lookId: id === "paper" ? "term" : "paper", surface: `look-${id}` }, { skin: false }),
        ]),
      ]),
    );
    const s = byId(out, "s");
    expect(s.widgetTheme?.values).toEqual({ lookId: id, surfaceOpacity: 80, blur: 12, accent: "#123456" });
    expect(s.pages[1].widgetTheme?.values).toEqual({ lookId: id, surface: "matte-dark" });
    expect(s.pages[2].widgetTheme?.values).toEqual({ lookId: "classic", surface: `look-${id}` });
    expect(s.pages[3].widgetTheme?.values?.surface).toBe(`look-${id}`);
  });

  it("an unknown Look and a Look that is a skin keep what they store", () => {
    const out = load(v17([screen("s", { lookId: "a-user-pack", surface: "look-a-user-pack" }, [page("a", { lookId: "hud", surface: "look-hud" }, { skin: false })])]));
    expect(byId(out, "s").widgetTheme?.values).toEqual({ lookId: "a-user-pack", surface: "look-a-user-pack" });
    expect(byId(out, "s").pages[0].widgetTheme?.values).toEqual({ lookId: "hud", surface: "look-hud" });
  });
});

describe("v18: what is drawn", () => {
  it("a page that stored the Look's card alone takes the Look's values, over its screen's, with its own opacity kept", () => {
    const term = lookLayers.term;
    const out = load(v17([screen("s", { accent: "#123456", font: "inter" }, [page("a", { lookId: "term", surface: "look-term", surfaceOpacity: 70 }, { skin: false, surface: false })])]));
    expect(drawn(out, "s", "a")).toMatchObject({ lookId: "term", surface: "look-term", surfaceOpacity: 70, accent: term.accent, font: term.font });
  });

  it("a level that stored every value of its Look draws what it drew before", () => {
    const copy = { lookId: "term", ...lookLayers.term };
    const stored = v17([screen("s", copy, [page("a")]), screen("u", { ...copy, accent: "#ff0000" }, [page("a")])]);
    // the same file read as a v18 one: the card stays stored, and the Look layer under it is the same either way
    const kept = upgradeConfig({ ...stored, version: 18 } as StoredConfig);
    const after = load(stored);
    expect(drawn(after, "s", "a")).toEqual(drawn(kept, "s", "a"));
    expect(drawn(after, "u", "a")).toEqual(drawn(kept, "u", "a"));
    expect(drawn(after, "u", "a").accent).toBe("#ff0000");
  });

  it("a level that stored a Look's value that differs from the Look keeps it", () => {
    const out = load(v17([screen("s", { lookId: "term", surface: "look-term", accent: "#abcdef", font: "mono" }, [page("a")])]));
    expect(drawn(out, "s", "a")).toMatchObject({ accent: "#abcdef", font: "mono", surface: "look-term" });
  });
});
