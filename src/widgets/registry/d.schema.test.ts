import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STANDARD_SETTINGS } from "@/modules/standard-settings";
import { effectiveSettings, type SensorMap } from "@/modules/types";
import snapshot from "../__fixtures__/snapshot.json";
import { GROUP_D } from "./d";

const SPECS = import.meta.glob("../../../docs/redesign/widgets/docs/widgets/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const specBlock = (id: string): string => {
  const raw = Object.entries(SPECS).find(([p]) => p.endsWith(`/${id}.md`))?.[1] ?? "";
  return /Widget-specific:\s*```\r?\n([\s\S]*?)```/.exec(raw)?.[1] ?? "";
};

// Each spec prop and the settings that reach it (a flattened object prop is reached by its entries).
const MANIFEST: Record<string, Record<string, string[]>> = {
  FpsMonitor: { target: ["target"] },
  GameSpotlight: { layout: ["spotlightLayout"], motion: ["motion"], scrim: ["scrim"], music: ["music"], progress: ["progress"], vizMode: ["vizMode"] },
  OsdStrip: { cells: ["cells"], target: ["target"] },
  FramePacing: { budgets: ["budgets"], window: ["window"] },
  PlaytimeShare: { colors: ["color1", "color2", "color3", "color4", "color5", "color6"] },
  SteamProfile: {},
  SteamGame: { art: ["art"], scrim: ["scrim"] },
  Achievements: {},
  SteamLibrary: { showNews: ["showNews"] },
  SteamNews: { lines: ["lines"] },
};
// Props the template has that its spec block does not list.
const BEYOND_SPEC: Record<string, Record<string, string[]>> = {
  FpsMonitor: { view: ["view"], showMetrics: ["showMetrics"], sparkline: ["sparkline"], ringColor: ["ringColor"], sparkColor: ["sparkColor"] },
  GameSpotlight: { showStats: ["showStats"], showNews: ["showNews"] },
  Achievements: { display: ["display"] },
};

const SENSORS = (snapshot as unknown as { sensors: SensorMap }).sensors;
const STANDARD_KEYS = new Set(STANDARD_SETTINGS.map((s) => s.key));
const OWN_KEYS = (id: string): string[] => (GROUP_D.find((m) => m.id === id)!.settings ?? []).filter((s) => !STANDARD_SETTINGS.includes(s)).map((s) => s.key);

describe("group D inspector schema", () => {
  for (const [id, props] of Object.entries(MANIFEST)) {
    describe(id, () => {
      const mod = GROUP_D.find((m) => m.id === id)!;
      const all = { ...props, ...BEYOND_SPEC[id] };

      it("is registered", () => expect(mod).toBeDefined());

      it("lists every spec prop in the manifest", () => {
        const block = specBlock(id);
        for (const p of Object.keys(props)) expect(block, p).toMatch(new RegExp(`\\b${p}\\b`));
      });

      it("reaches every prop through exactly one setting each", () => {
        const own = OWN_KEYS(id);
        for (const [prop, via] of Object.entries(all)) for (const k of via) expect(own.filter((x) => x === k), `${prop} via ${k}`).toHaveLength(1);
        expect(own.sort()).toEqual(Object.values(all).flat().sort());
      });

      it("keeps its keys off the standard keys", () => {
        expect(OWN_KEYS(id).filter((k) => STANDARD_KEYS.has(k))).toEqual([]);
      });

      it("has every enum default inside its options", () => {
        for (const s of mod.settings ?? []) {
          if (s.type !== "select" || !s.options || s.multiple) continue;
          expect(s.options.map((o) => o.value), s.key).toContain(String(s.default));
        }
      });

      it("renders from its default settings", () => {
        expect(renderToString(mod.render(SENSORS, effectiveSettings(mod, {})) as never).length).toBeGreaterThan(0);
      });
    });
  }
});
