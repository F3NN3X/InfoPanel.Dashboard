import { describe, expect, it } from "vitest";
import { renderModule } from "@/modules/port-helpers";
import { GROUP_C } from "./registry/c";

const mod = GROUP_C.find((m) => m.id === "VolumeMixer")!;
const text = (s: string, v: string) => [`plugins.volume-plugin.spk.${s}`, { text: v, unit: "" }] as const;
const SENSORS = Object.fromEntries([text("short_name", "Speakers"), text("friendly_name", "Speakers"), text("device_friendly_name", "Realtek"), text("mute", "True"), [`plugins.volume-plugin.spk.volume`, { value: 40, unit: "%" }]]);

describe("VolumeMixer (read-only)", () => {
  it("renders no button or pointer affordance", () => {
    const out = renderModule(mod, {}, SENSORS);
    expect(out).toContain("Speakers");
    expect(out).not.toContain("<button");
    expect(out).not.toContain("cursor-pointer");
  });
  it("still shows the muted state, and hides it with Show mute state off", () => {
    expect(renderModule(mod, {}, SENSORS)).toContain("lucide-volume-x");
    expect(renderModule(mod, { showMute: false }, SENSORS)).not.toContain("lucide-volume-x");
  });
  it("labels the setting as a state, not a control", () => {
    expect(mod.settings!.find((d) => d.key === "showMute")!.label).toBe("Show mute state");
  });
});
