import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ISLAND_DEFAULTS } from "@/lib/island/config";
import { defaultConfig, type DashboardConfig, type Placement } from "@/lib/layout";
import { IslandPanel } from "./island-panel";

const zone = (id: string, module: string, settings: Placement["settings"] = {}): Placement => ({
  id,
  module,
  colStart: 1,
  rowStart: 1,
  colSpan: 2,
  rowSpan: 2,
  visible: true,
  settings,
});

function render(enabled: boolean) {
  const base = defaultConfig();
  const profile = {
    ...base.profiles[0],
    name: "Strip",
    island: { ...ISLAND_DEFAULTS, enabled },
    pages: [{ id: "a", name: "Main", placements: [zone("z1", "Timer", { island: true }), zone("z2", "Clock")] }],
  };
  const config: DashboardConfig = { ...base, profiles: [profile] };
  const noop = () => {};
  return renderToString(
    <IslandPanel config={config} setConfig={noop} profile={profile} onOpenZone={noop} onOpenRule={noop} onOpenExplorer={noop} />
  );
}

describe("IslandPanel", () => {
  it("shows the island settings, the widgets that send and the alert rules for the profile", () => {
    const html = render(true);
    expect(html).toContain("Dynamic Island");
    expect(html).toContain("Strip");
    expect(html).toContain("Show Dynamic Island");
    expect(html).toContain("Dashboard notices");
    expect(html).toContain("Timer sends to the island");
    expect(html).not.toContain("Clock sends to the island");
    expect(html).toContain("Add one of these to send more:");
    expect(html).toContain("No alert rule shows here.");
  });

  it("shows only the switch while the island is off", () => {
    const html = render(false);
    expect(html).toContain("Show Dynamic Island");
    expect(html).not.toContain("Timer sends to the island");
    expect(html).not.toContain("Alert rules");
  });
});
