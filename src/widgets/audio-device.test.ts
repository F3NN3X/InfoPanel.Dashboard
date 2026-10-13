import { describe, expect, it } from "vitest";
import { SWITCH_MARGIN, SWITCH_MS, deviceLevels, stickyDevice, type DeviceHold } from "./audio-device";

describe("stickyDevice", () => {
  it("starts on the loudest device", () => {
    expect(stickyDevice({ a: 20, b: 60 }, null, 0)).toEqual({ device: "b" });
  });

  it("keeps the current device while another is only slightly louder", () => {
    const hold = { device: "a" };
    expect(stickyDevice({ a: 50, b: 50 + SWITCH_MARGIN - 1 }, hold, 0)).toEqual({ device: "a" });
  });

  it("switches only after a clearly louder device stays louder for SWITCH_MS", () => {
    let hold: DeviceHold = { device: "a" };
    hold = stickyDevice({ a: 30, b: 80 }, hold, 0);
    expect(hold).toEqual({ device: "a", challenger: "b", since: 0 });
    hold = stickyDevice({ a: 30, b: 80 }, hold, SWITCH_MS - 1);
    expect(hold.device).toBe("a");
    hold = stickyDevice({ a: 30, b: 80 }, hold, SWITCH_MS);
    expect(hold).toEqual({ device: "b" });
  });

  it("drops a challenger that falls back, so a later spike starts the wait again", () => {
    let hold: DeviceHold = stickyDevice({ a: 30, b: 80 }, { device: "a" }, 0);
    hold = stickyDevice({ a: 30, b: 35 }, hold, 500);
    expect(hold).toEqual({ device: "a" });
    hold = stickyDevice({ a: 30, b: 80 }, hold, SWITCH_MS + 100);
    expect(hold).toEqual({ device: "a", challenger: "b", since: SWITCH_MS + 100 });
  });

  it("leaves a silent or vanished device at once", () => {
    expect(stickyDevice({ a: 0, b: 40 }, { device: "a" }, 0)).toEqual({ device: "b" });
    expect(stickyDevice({ b: 40 }, { device: "a" }, 0)).toEqual({ device: "b" });
  });

  it("stays put when everything is silent", () => {
    expect(stickyDevice({ a: 0, b: 0 }, { device: "a" }, 0)).toEqual({ device: "a" });
  });
});

describe("deviceLevels", () => {
  it("reads each device's audio-level, or the entry the plugin names Level", () => {
    const d = {
      "plugins.audio-level-meter.a.audio-level": "42",
      "plugins.audio-level-meter.b.x9": "17",
      "plugins.audio-level-meter.a.left-channel": "90",
    };
    expect(deviceLevels(d, { "plugins.audio-level-meter.b.x9": "Level" })).toEqual({ a: 42, b: 17 });
  });
});
