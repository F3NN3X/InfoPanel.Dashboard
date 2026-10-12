import { renderToString } from "react-dom/server";
import { expect } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import type { DashboardModule, ModuleSettings, SensorMap } from "./types";

/** The standard `layout` choices that force a tier xs..lg, with the variants. */
export const FORCED_LAYOUTS = ["simple", "compact", "standard", "card"] as const;
export const VARIANTS = ["default", "studio"] as const;

/** The module's settings as [key, default] pairs, to compare against a snapshot taken before a port. */
export const settingPairs = (mod: DashboardModule) => (mod.settings ?? []).map((s) => [s.key, s.default]);

export const renderModule = (mod: DashboardModule, settings: ModuleSettings = {}, sensors: SensorMap = fixtureSensors()) =>
  renderToString(<>{mod.render(sensors, settings)}</>);

/** Every forced size and both variants render something with `needle` in it. */
export function expectRendersEverywhere(mod: DashboardModule, needle: RegExp, settings: ModuleSettings = {}) {
  for (const layout of FORCED_LAYOUTS)
    for (const variant of VARIANTS) {
      const html = renderModule(mod, { ...settings, layout, variant });
      expect(html.length, `${layout}/${variant}`).toBeGreaterThan(0);
      expect(html, `${layout}/${variant}`).toMatch(needle);
    }
}
