import { describe, expect, it } from "vitest";
import type { Widget } from "@/lib/layout";
import { sensorName, widgetName } from "./widget-kinds";

const EMPTY = { sources: null, sensors: {} };
const w = (fields: Partial<Widget>): Widget => ({ id: "w", kind: "stat", visible: true, ...fields });

describe("sensorName", () => {
  it("prefers the Data API's entry name", () => {
    const names = {
      sources: {
        plugins: [
          {
            id: "p",
            name: "RTSS",
            containers: [{ id: "c", name: "rtss", entries: [{ id: "e", name: "Average FPS", type: "sensor", key: "plugins.x.avg-fps" }] }],
          },
        ],
      },
      sensors: {},
    };
    expect(sensorName("plugins.x.avg-fps", names)).toBe("Average FPS");
  });

  it("falls back to the streamed name without its location prefix", () => {
    const names = { sources: null, sensors: { "plugins.yr.wind_speed": { value: 1, unit: "m/s", name: "Brevik · Wind Speed" } } };
    expect(sensorName("plugins.yr.wind_speed", names)).toBe("Wind Speed");
  });

  it("falls back to the key's last segment", () => {
    expect(sensorName("plugins.InfoPanel.RTSS.rtss.avg-fps", EMPTY)).toBe("avg fps");
    expect(sensorName("libre.gpu_core", EMPTY)).toBe("gpu core");
    expect(sensorName("plugins.InfoPanel.RTSS.rtss.1% low fps", EMPTY)).toBe("1% low fps");
  });
});

describe("widgetName", () => {
  it("uses the label, then the sensor's name, then the text, then the kind", () => {
    expect(widgetName(w({ label: "CPU", sensor: "a.b" }), EMPTY)).toBe("CPU");
    expect(widgetName(w({ sensor: "plugins.InfoPanel.RTSS.rtss.fps" }), EMPTY)).toBe("fps");
    expect(widgetName(w({ kind: "text", text: "Hello" }), EMPTY)).toBe("Hello");
    expect(widgetName(w({ kind: "gauge" }), EMPTY)).toBe("Gauge");
  });
});
