import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_SETTING, STANDARD_SETTINGS } from "@/modules/standard-settings";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import { fixtureSensors } from "../__fixtures__";
import { GROUP_C } from "./c";

vi.mock("@/lib/wavelink", async (orig) => ({ ...(await orig<typeof import("@/lib/wavelink")>()), ...(await import("../__fixtures__/wavelink")).wavelinkMock() }));

const SPECS = import.meta.glob("/docs/redesign/widgets/docs/widgets/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

/** The prop names of a spec's "Widget-specific" block (quotes and parenthesised notes stripped, then the first word of each comma item). */
function specProps(id: string): string[] {
  const md = Object.entries(SPECS).find(([path]) => path.endsWith(`/${id}.md`))?.[1] ?? "";
  const block = /Widget-specific:\s*```\n([\s\S]*?)```/.exec(md)?.[1] ?? "";
  const plain = block.replace(/'[^']*'|"[^"]*"/g, "").replace(/\([^)]*\)/g, "");
  return plain.split(",").flatMap((item) => /^\s*([a-z][A-Za-z]*)/.exec(item)?.slice(1) ?? []);
}

// Per template: the stored setting key behind each spec prop, or null for a shell-level callback.
const MANIFEST: Record<string, Record<string, string | null>> = {
  NowPlaying: { source: "source", showArt: "showArt", layout: "playerLayout", progress: "progress", vizMode: "waveformVariant", vizDevice: "liveSource", vizRamp: "vizRamp", showTimeline: "showTimeline" },
  AudioMeter: { device: "device", mode: "mode", segments: "segments", meterStyle: "meterStyle" },
  VolumeMixer: { onSetVolume: null, onToggleMute: null },
  MeterBridge: { channels: "channels", orientation: "orientation", floor: "floor", segments: "segments", holdMs: "holdMs", warnDb: "warnDb", clipDb: "clipDb", showScale: "showScale", showVolume: "showVolume", ladder: "ladder" },
  Visualizer: { mode: "mode", device: "device", bands: "bands", ramp: "ramp", sensitivity: "sensitivity", peaks: "peaks" },
  WaveLink: {},
};

const STANDARD_KEYS = new Set(STANDARD_SETTINGS.map((d) => d.key));
const SENSORS = fixtureSensors() as SensorMap;

describe.each(Object.entries(MANIFEST))("%s schema", (id, props) => {
  const mod = GROUP_C.find((m) => m.id === id)!;
  const settings = mod.settings ?? [];

  it("lists exactly the spec's widget-specific props", () => {
    expect(specProps(id).sort()).toEqual(Object.keys(props).sort());
  });

  it("reaches every spec prop through exactly one setting", () => {
    for (const key of Object.values(props)) if (key) expect(settings.filter((d) => d.key === key)).toHaveLength(1);
  });

  it("has unique keys; own keys do not collide with a standard key", () => {
    const keys = settings.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of Object.values(props)) if (key) expect(STANDARD_KEYS.has(key)).toBe(false);
    expect(STANDARD_KEYS.has(IDLE_SETTING.key)).toBe(false);
  });

  it("keeps every enum default inside its options", () => {
    for (const d of settings.filter((x) => x.type === "select" && x.options)) expect(d.options!.map((o) => o.value)).toContain(d.default);
  });

  it("renders from its defaults", () => {
    const defaults: ModuleSettings = Object.fromEntries(settings.map((d) => [d.key, d.default]));
    const html = renderToString(mod.render(SENSORS, defaults) ?? createElement("i"));
    expect(html.length).toBeGreaterThan(0);
  });
});
