import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { bluetoothOptions } from "@/widgets/registry/e";
import { bluetoothModernModule } from "./bluetooth-modern";
import { effectiveSettings, type ModuleSettings } from "./types";

const html = (s: ModuleSettings) => renderToString(bluetoothModernModule.render(fixtureSensors(), s) as never);

describe("bluetoothmodern", () => {
  it.each([
    [{}, { showStatus: true, showDevices: true, showBattery: true, batteryMidColor: undefined, batteryLowColor: undefined }],
    [{ showStatus: false, showDevices: false, showBattery: false }, { showStatus: false, showDevices: false, showBattery: false, batteryMidColor: undefined, batteryLowColor: undefined }],
    [{ batteryMidColor: "#111111", batteryLowColor: "#222222" }, { showStatus: true, showDevices: true, showBattery: true, batteryMidColor: "#111111", batteryLowColor: "#222222" }],
  ])("maps %j", (saved, expected) => {
    expect(bluetoothOptions.toProps(effectiveSettings(bluetoothModernModule, saved))).toEqual(expected);
  });

  it("shows the status, the device count and each device with its battery", () => {
    const out = html({ layout: "card" });
    for (const text of ["Bluetooth On", "3 devices", "Headset Pro", "Keyboard K3", "Mouse M2", "82%", "41%", "14%"]) expect(out).toContain(text);
  });

  it("colours the battery bars by level, with the user's mid and low colours", () => {
    const stock = html({ layout: "card" });
    expect(stock).toContain("#EDB232");
    expect(stock).toContain("#F2665E");
    const custom = html({ layout: "card", batteryMidColor: "#111111", batteryLowColor: "#222222" });
    expect(custom).toContain("#111111");
    expect(custom).toContain("#222222");
  });

  it("hides the parts that are switched off", () => {
    expect(html({ layout: "card", showDevices: false })).not.toContain("Headset Pro");
    expect(html({ layout: "card", showStatus: false })).not.toContain("Bluetooth On");
    expect(html({ layout: "card", showBattery: false })).not.toContain("82%");
  });

  it("keeps the view presets' bundled toggles", () => {
    const view = bluetoothModernModule.settings?.find((d) => d.key === "view");
    expect(view?.options?.find((o) => o.value === "status")?.applies).toEqual({ showDevices: false, showBattery: false });
    expect(view?.options?.find((o) => o.value === "devices")?.applies).toEqual({ showDevices: true, showBattery: true });
  });

  it("renders nothing without plugin data", () => {
    expect(bluetoothModernModule.render({}, {})).toBeNull();
  });

  it("keeps the glass surface default", () => {
    expect(effectiveSettings(bluetoothModernModule).surface).toBe("glass");
  });
});

describe("bluetoothmodern display names", () => {
  const P = "plugins.bluetooth-battery-plugin.";
  const sensors = {
    [`${P}main.s1`]: { text: "Bluetooth On", unit: "", name: "Status" },
    [`${P}d1.x1`]: { text: "Pods Max", unit: "", name: "Name" },
    [`${P}d1.x2`]: { text: "Connected", unit: "", name: "Status" },
    [`${P}d1.x3`]: { value: 73, unit: "%", name: "Battery Level" },
  };

  it("matches device fields on the sensors' display names when the keys say nothing", () => {
    const out = renderToString(bluetoothModernModule.render(sensors, { layout: "card" }) as never);
    for (const text of ["Pods Max", "Connected", "73%"]) expect(out).toContain(text);
  });
});
