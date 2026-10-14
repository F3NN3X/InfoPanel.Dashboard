import { describe, expect, it } from "vitest";
import { renderModule } from "@/widgets/test-render";
import type { SensorMap } from "@/modules/types";
import { TEMPLATE_MODULES } from "./registry";

describe("Thermals discovery", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "Thermals")!;
  const sensors = (name?: string): SensorMap => ({ "hwinfo.ssd_temp": { value: 71, unit: "°C", name } });
  const html = (name?: string) => renderModule(mod, { discover: true, layout: "card" }, sensors(name));

  it("labels the discovered temperatures with the sensors' display names", () => {
    expect(html("Samsung 990 Temperature")).toContain("Samsung 990 Temperature");
  });

  it("falls back to the key-derived label without a name", () => {
    expect(html()).toContain("SSD Temp");
  });
});
