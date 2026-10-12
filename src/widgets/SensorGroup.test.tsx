import { describe, expect, it } from "vitest";
import { renderModule } from "@/modules/port-helpers";
import type { SensorMap } from "@/modules/types";
import { TEMPLATE_MODULES } from "./registry";

describe("SensorGroup labels", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "SensorGroup")!;
  const sensors = (name?: string): SensorMap => ({ "hwinfo.ssd_temp": { value: 71, unit: "°C", name } });
  const html = (name?: string) => renderModule(mod, { sensors: "hwinfo.ssd_temp", groupLayout: "rows" }, sensors(name));

  it("labels an item with the sensor's display name", () => {
    expect(html("Samsung 990 Temperature")).toContain("Samsung 990 Temperature");
  });

  it("falls back to the key's last segment without a name", () => {
    expect(html()).toContain("ssd temp");
  });
});
