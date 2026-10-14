import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STANDARD_DEFAULTS } from "@/modules/standard-settings";
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { fixtureSensors } from "../__fixtures__";
import { TEMPLATE_MODULES } from "../registry";

// The standard "Show title" switch: off, a widget's title appears nowhere, in any layout or variant.
// A custom title is the marker, since templates fall back to their own name without one.
const MARK = "Zq Title Mark";
const TIERS = ["simple", "compact", "standard", "card"] as const;
const VARIANTS = ["default", "studio"] as const;
const OFFERING = TEMPLATE_MODULES.filter((m) => (m.settings ?? []).some((d) => d.key === "showTitle"));
const SENSORS = fixtureSensors();
const defaults = (m: DashboardModule): ModuleSettings => ({ ...STANDARD_DEFAULTS, ...Object.fromEntries((m.settings ?? []).map((d) => [d.key, d.default])) });
const markup = (m: DashboardModule, over: ModuleSettings): string => renderToStaticMarkup(m.render(SENSORS, { ...defaults(m), label: MARK, ...over }) as never);

// Studio cards and compact tiles carry the title as their label: off hides it there too.
describe("Show title", () => {
  it("is offered by every template with the standard block", () => {
    expect(OFFERING.map((m) => m.id)).toEqual(TEMPLATE_MODULES.filter((m) => (m.settings ?? []).some((d) => d.key === "label")).map((m) => m.id));
  });

  it.each(OFFERING.map((m) => [m.id, m] as const))("%s: off hides the title in every layout and variant", (_, m) => {
    const leaks = VARIANTS.flatMap((variant) => TIERS.filter((layout) => markup(m, { showTitle: false, layout, variant }).includes(MARK)).map((layout) => `${variant} / ${layout}`));
    expect(leaks).toEqual([]);
  });

  it("on (the default) still shows a header title", () => {
    const shown = OFFERING.filter((m) => markup(m, { layout: "card" }).includes(MARK));
    expect(shown.length).toBeGreaterThan(OFFERING.length / 2);
  });
});
