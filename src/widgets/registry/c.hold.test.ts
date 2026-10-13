import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import { fixtureSensors } from "../__fixtures__";
import type { MeterBridgeProps } from "../MeterBridge";
import { BALLISTICS } from "@/lib/audio/ballistics";
import { GROUP_C } from "./c";

const seen = vi.hoisted(() => [] as MeterBridgeProps[]);
vi.mock("../MeterBridge", async (orig) => ({
  ...(await orig<typeof import("../MeterBridge")>()),
  default: (p: MeterBridgeProps) => {
    seen.push(p);
    return null;
  },
}));

const SENSORS = fixtureSensors() as SensorMap;
const bridge = GROUP_C.find((m) => m.id === "MeterBridge")!;
const holdFor = (saved: ModuleSettings) => {
  seen.length = 0;
  renderToString(bridge.render(SENSORS, saved));
  return seen.at(-1)!.holdMs;
};

describe("MeterBridge peak hold", () => {
  it("leaves the preset's own hold alone until a hold is stored", () => {
    expect(holdFor({})).toBeUndefined();
    expect(holdFor({ holdMs: "" })).toBeUndefined();
  });
  it("passes a stored hold on, numbers and old strings alike", () => {
    expect(holdFor({ holdMs: 800 })).toBe(800);
    expect(holdFor({ holdMs: "2000" })).toBe(2000);
  });
  it("ignores a stored hold for the responses that keep none", () => {
    expect(holdFor({ holdMs: 800, meterBallistics: "vu" })).toBeUndefined();
    expect(holdFor({ holdMs: 800, meterBallistics: "instant" })).toBeUndefined();
  });
});

describe("MeterBridge peak hold setting", () => {
  it("shows the hold the Peak preset applies", () => {
    const def = bridge.settings!.find((d) => d.key === "holdMs")!;
    expect(def.default).toBe(BALLISTICS.peak.peakHoldMs);
  });
});
