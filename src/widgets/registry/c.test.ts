import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SensorMap } from "@/modules/types";
import snapshot from "../__fixtures__/snapshot.json";
import { toFlat } from "../data-adapter";
import type { Tier } from "../core/types";
import AudioMeter, { meta as audioMeter } from "../AudioMeter";
import MeterBridge, { meta as meterBridge } from "../MeterBridge";
import NowPlaying, { meta as nowPlaying } from "../NowPlaying";
import Visualizer, { meta as visualizer } from "../Visualizer";
import VolumeMixer, { meta as volumeMixer } from "../VolumeMixer";
import WaveLink, { meta as waveLink } from "../WaveLink";
import { GROUP_C } from "./c";

// WaveLink reads the shared Wave Link client, not sensor keys: give it a connected one.
vi.mock("@/lib/wavelink", async (orig) => ({ ...(await orig<typeof import("@/lib/wavelink")>()), ...(await import("../__fixtures__/wavelink")).wavelinkMock() }));

const data = toFlat(snapshot.sensors as SensorMap);
const WIDGETS = [
  { meta: nowPlaying, Component: NowPlaying },
  { meta: audioMeter, Component: AudioMeter },
  { meta: volumeMixer, Component: VolumeMixer },
  { meta: meterBridge, Component: MeterBridge },
  { meta: visualizer, Component: Visualizer },
  { meta: waveLink, Component: WaveLink },
];
const SIZES: Tier[] = ["xs", "sm", "md", "lg"];
const VARIANTS = ["default", "studio"] as const;
const SKINS = ["default", "instrument", "tui"];

describe("group C templates", () => {
  it("registers the six widgets with their meta size", () => {
    expect(GROUP_C.map((m) => m.id)).toEqual(WIDGETS.map((w) => w.meta.id));
    for (const { meta } of WIDGETS) {
      const mod = GROUP_C.find((m) => m.id === meta.id);
      expect(mod?.minCols).toBe(meta.minSize[0]);
      expect(mod?.minRows).toBe(meta.minSize[1]);
    }
  });

  for (const { meta, Component } of WIDGETS) {
    describe(meta.id, () => {
      for (const size of SIZES)
        for (const variant of VARIANTS)
          for (const skin of SKINS)
            it(`renders ${size} / ${variant} / ${skin}`, () => {
              const html = renderToString(createElement(Component, { data, size, variant, skin }));
              expect(html.length).toBeGreaterThan(0);
            });

      it("renders the empty state", () => {
        expect(renderToString(createElement(Component, { data: {} })).length).toBeGreaterThan(0);
      });

      it("renders a live value at md", () => {
        const text = renderToString(createElement(Component, { data, size: "md" })).replace(/<[^>]*>/g, "");
        expect(text).toMatch(/\d/);
      });
    });
  }
});
