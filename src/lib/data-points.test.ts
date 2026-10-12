import { describe, expect, it } from "vitest";
import type { ApiSources } from "./catalog";
import {
  buildDataModel,
  categoryOf,
  classifyValue,
  healthCounts,
  healthOf,
  kindOfUnit,
  matchesPoint,
  searchPoints,
  type DataPoint,
} from "./data-points";
import type { SensorMap } from "@/modules/types";

// Trimmed from the Data API's `/` page: a plugin, the bridge, LibreHardwareMonitor
// with a device prefix on every name, and a pushed namespace.
const sources: ApiSources = {
  plugins: [
    {
      id: "audio-level-meter",
      name: "Audio Level Meter",
      containers: [
        {
          id: "default-audio",
          name: "Audio Level Meter",
          entries: [
            { id: "peak-level", name: "Peak", type: "sensor", key: "plugins.audio-level-meter.default-audio.peak-level" },
            { id: "left-channel", name: "Left", type: "sensor", key: "plugins.audio-level-meter.default-audio.left-channel" },
          ],
        },
      ],
    },
    {
      id: "dead-plugin",
      name: "Dead Plugin",
      containers: [
        {
          id: "c",
          name: "C",
          entries: [{ id: "a", name: "A", type: "sensor", key: "plugins.dead-plugin.c.a" }],
        },
        { id: "empty", name: "Empty", entries: [] },
      ],
    },
    { id: "idle-plugin", name: "Idle Plugin", containers: [] },
  ],
};

const sensors: SensorMap = {
  "plugins.audio-level-meter.default-audio.peak-level": { value: -96, unit: "dB" },
  "plugins.audio-level-meter.default-audio.left-channel": { value: 0, unit: "%" },
  "plugins.dead-plugin.c.a": { value: 0, unit: "%" },
  "system.cpu.load": { value: 26.2, unit: "%", name: "CPU Load" },
  "system.bridge.status": { text: "running", unit: "", name: "Data API Status" },
  "libre.amd_core_1": { value: 61, unit: "°C", name: "AMD Ryzen 9 9950X3D Core #1", source: "AMD Ryzen 9 9950X3D" },
  "libre.amd_clock": { value: 4500, unit: "MHz", name: "AMD Ryzen 9 9950X3D Clock", source: "AMD Ryzen 9 9950X3D" },
  "libre.gpu_temp": { value: 40, unit: "°C", name: "NVIDIA GeForce RTX 5090 GPU Core", source: "NVIDIA GeForce RTX 5090" },
  "spotify.album": { text: "-", unit: "", name: "spotify.album" },
  "spotify.art": { text: "https://i.scdn.co/image/abc", unit: "" },
};

describe("classifyValue", () => {
  it("types empty, url, list, bool, number and text", () => {
    expect(classifyValue("").type).toBe("empty");
    expect(classifyValue("-").type).toBe("empty");
    expect(classifyValue("—").type).toBe("empty");
    expect(classifyValue("https://x.test/a.png").type).toBe("url");
    expect(classifyValue("a\nb").type).toBe("list");
    expect(classifyValue('{"a":1}').type).toBe("list");
    expect(classifyValue("[1,2]").type).toBe("list");
    expect(classifyValue("True").type).toBe("bool");
    expect(classifyValue("running").type).toBe("text");
    expect(classifyValue("13:46:55").type).toBe("text");
  });

  it("splits a number from its unit", () => {
    expect(classifyValue("26.2 %")).toEqual({ type: "number", num: 26.2, unit: "%" });
    expect(classifyValue("-863.1 dB")).toEqual({ type: "number", num: -863.1, unit: "dB" });
    expect(classifyValue("0 KB/s")).toEqual({ type: "number", num: 0, unit: "KB/s" });
    expect(classifyValue("42")).toEqual({ type: "number", num: 42, unit: "" });
  });
});

describe("kindOfUnit", () => {
  it("maps units to kinds", () => {
    expect(kindOfUnit("°C")).toBe("Temp");
    expect(kindOfUnit("MHz")).toBe("Clock");
    expect(kindOfUnit("RPM")).toBe("Fan");
    expect(kindOfUnit("W")).toBe("Power");
    expect(kindOfUnit("B/s")).toBe("Throughput");
    expect(kindOfUnit("furlongs")).toBe("");
  });
});

describe("categoryOf", () => {
  it("follows the source id", () => {
    expect(categoryOf("system", false)).toBe("Built-in");
    expect(categoryOf("libre", false)).toBe("Hardware monitors");
    expect(categoryOf("hwinfo", false)).toBe("Hardware monitors");
    expect(categoryOf("spotify", false)).toBe("Pushed via API");
    expect(categoryOf("system", true)).toBe("Plugins");
  });
});

describe("healthOf", () => {
  const point = (over: Partial<DataPoint>): DataPoint => ({
    key: "k", name: "n", sourceId: "s", sourceName: "S", containerId: "s/c", containerRawId: "c",
    containerTitle: "C", raw: "1", type: "number", num: 1, unit: "", kind: "", ...over,
  });

  it("is off with no points, warn when all are empty or zero, else ok", () => {
    expect(healthOf([])).toBe("off");
    expect(healthOf([point({ type: "empty", num: null, raw: "" }), point({ num: 0 })])).toBe("warn");
    expect(healthOf([point({ num: 0 }), point({ num: 3 })])).toBe("ok");
    expect(healthOf([point({ type: "text", num: null, raw: "running" })])).toBe("ok");
  });
});

describe("buildDataModel", () => {
  const model = buildDataModel(sources, sensors);
  const source = (id: string) => model.sources.find((s) => s.id === id)!;

  it("orders sources by category then name", () => {
    expect(model.sources.map((s) => s.id)).toEqual([
      "system",
      "audio-level-meter",
      "dead-plugin",
      "idle-plugin",
      "libre",
      "spotify",
    ]);
    expect(source("system").category).toBe("Built-in");
    expect(source("audio-level-meter").category).toBe("Plugins");
    expect(source("libre").category).toBe("Hardware monitors");
    expect(source("spotify").category).toBe("Pushed via API");
  });

  it("types points and derives unit and kind", () => {
    const peak = model.byKey.get("plugins.audio-level-meter.default-audio.peak-level")!;
    expect(peak).toMatchObject({ type: "number", num: -96, unit: "dB", kind: "Level", raw: "-96 dB", name: "Peak" });
    expect(model.byKey.get("system.bridge.status")).toMatchObject({ type: "text", raw: "running" });
    expect(model.byKey.get("spotify.album")?.type).toBe("empty");
    expect(model.byKey.get("spotify.art")?.type).toBe("url");
  });

  it("groups LibreHardwareMonitor by device and strips the device prefix", () => {
    const libre = source("libre");
    expect(libre.containers.map((c) => c.title)).toEqual([
      "AMD Ryzen 9 9950X3D",
      "NVIDIA GeForce RTX 5090",
    ]);
    expect(model.byKey.get("libre.amd_core_1")?.name).toBe("Core #1");
    expect(model.byKey.get("libre.amd_clock")?.name).toBe("Clock");
    expect(model.byKey.get("libre.gpu_temp")?.name).toBe("GPU Core");
    expect(model.byKey.get("libre.gpu_temp")?.containerTitle).toBe("NVIDIA GeForce RTX 5090");
  });

  it("keeps plugin names untouched", () => {
    expect(model.byKey.get("plugins.dead-plugin.c.a")?.name).toBe("A");
  });

  it("derives health per container and source", () => {
    expect(source("audio-level-meter").status).toBe("ok");
    expect(source("dead-plugin").status).toBe("warn");
    expect(source("idle-plugin").status).toBe("off");
    expect(source("dead-plugin").containers.map((c) => c.status)).toEqual(["warn", "off"]);
    expect(source("libre").count).toBe(3);
    expect(healthCounts(model.sources)).toEqual({ ok: 4, warn: 1, off: 1 });
  });

  it("copes with no catalog yet", () => {
    expect(buildDataModel(null, {}).points).toEqual([]);
  });
});

describe("search", () => {
  const model = buildDataModel(sources, sensors);

  it("ANDs every word over name, key, source, container and kind", () => {
    const hit = (q: string) => searchPoints(model.points, q).map((p) => p.key);
    expect(hit("gpu temp")).toEqual(["libre.gpu_temp"]);
    expect(hit("temp amd")).toEqual(["libre.amd_core_1"]);
    expect(hit("audio peak")).toEqual(["plugins.audio-level-meter.default-audio.peak-level"]);
    expect(hit("spotify art")).toEqual(["spotify.art"]);
    expect(hit("nothing here")).toEqual([]);
  });

  it("returns everything for a blank query", () => {
    expect(searchPoints(model.points, "  ")).toHaveLength(model.points.length);
  });

  it("folds case and diacritics", () => {
    const p = { ...model.points[0], name: "Écran Température" };
    expect(matchesPoint(p, "ECRAN temperature")).toBe(true);
    expect(matchesPoint(p, "ecran gpu")).toBe(false);
  });
});
