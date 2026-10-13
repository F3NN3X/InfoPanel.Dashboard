import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SensorItemsField } from "@/components/studio/widget-editor/sensor-items-field";
import { renderModule } from "@/modules/port-helpers";
import { effectiveSettings } from "@/modules/types";
import { GROUP_B } from "./b";
import { clearItem, itemsOf, setItemField } from "./settings-kit";

vi.mock("@/hooks/useSensors", () => ({ useSensors: () => ({ "x.fan": { value: 600, unit: "RPM" } }) }));
vi.mock("@/lib/catalog", async (orig) => ({ ...(await orig<typeof import("@/lib/catalog")>()), useSensorCatalog: () => ({ sources: null, sensors: {}, status: "ready", fetchedAt: 0 }) }));

const mod = GROUP_B.find((m) => m.id === "SensorGroup")!;
const one = (s: object, value = 600, unit = "RPM") => renderModule(mod, { sensors: "x.fan", groupLayout: "rows", ...s }, { "x.fan": { value, unit } });

describe("per-sensor overrides (items)", () => {
  it("drops bad shapes and keeps good fields", () => {
    expect(itemsOf("")).toEqual({});
    expect(itemsOf("{nope")).toEqual({});
    expect(itemsOf("[1]")).toEqual({});
    expect(itemsOf(JSON.stringify({ a: 3, b: { label: " ", max: -1, decimals: 9 }, c: { label: "Fan", max: 1200, warn: "x", crit: 90, decimals: 1 } }))).toEqual({ c: { label: "Fan", max: 1200, crit: 90, decimals: 1 } });
  });
  it("sets, clears and prunes fields, keeping unbound sensors", () => {
    const a = setItemField("", "k", "label", "Fan");
    expect(itemsOf(a)).toEqual({ k: { label: "Fan" } });
    expect(setItemField(a, "k", "label", undefined)).toBe("");
    expect(itemsOf(setItemField(a, "other", "max", 5))).toEqual({ k: { label: "Fan" }, other: { max: 5 } });
    expect(clearItem(setItemField(a, "other", "max", 5), "k")).toBe(JSON.stringify({ other: { max: 5 } }));
  });
  it("renders an old config with no items as before", () => {
    expect(one({})).toBe(one({ items: "" }));
    expect(one({}, 600)).not.toContain("width:");
  });
  it("lets an override beat the shared value, which beats the automatic one", () => {
    expect(one({ groupMax: "1200" })).toContain("width:50%");
    expect(one({ groupMax: "1200", items: JSON.stringify({ "x.fan": { max: 2400 } }) })).toContain("width:25%");
    expect(one({ items: JSON.stringify({ "x.fan": { label: "Radiator", max: 1200 } }) })).toContain("Radiator");
    expect(one({ groupDecimals: "0", items: JSON.stringify({ "x.fan": { decimals: 2 } }) }, 0.85, "V")).toContain("0.85");
  });
  it("ignores an override of a sensor that is not bound", () => {
    expect(one({ items: JSON.stringify({ "x.other": { label: "Nope" } }) })).not.toContain("Nope");
  });
  it("registers the control after the sensor list and hides it in Auto-discover", () => {
    const def = mod.settings!.find((d) => d.key === "items")!;
    expect(def).toMatchObject({ type: "sensorItems", of: "sensors", default: "" });
    expect(def.visibleIf!(effectiveSettings(mod, {}))).toBe(true);
    expect(def.visibleIf!(effectiveSettings(mod, { auto: true }))).toBe(false);
  });
});

describe("SensorItemsField", () => {
  const html = (keys: string, value = "") => renderToString(createElement(SensorItemsField, { label: "Per-sensor", keys, value, onChange: () => {} }));
  it("renders one row per bound sensor with its inputs", () => {
    const out = html("x.fan,x.pump", JSON.stringify({ "x.fan": { label: "Radiator", max: 1200 } }));
    expect(out.match(/<li /g)).toHaveLength(2);
    expect(out).toContain('value="Radiator"');
    expect(out).toContain('value="1200"');
    expect(out).toContain("Reset");
    expect(out).toContain("Auto");
  });
  it("asks for sensors when none are bound", () => {
    expect(html("")).toContain("Bind sensors first");
  });
});
