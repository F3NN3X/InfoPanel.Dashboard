import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WL_LIVE } from "./__fixtures__/wavelink";
import { WaveLinkLayout, type Opts } from "./WaveLink";

vi.mock("@/lib/wavelink", async (orig) => ({ ...(await orig<typeof import("@/lib/wavelink")>()), ...(await import("./__fixtures__/wavelink")).wavelinkMock() }));

const o: Opts = { readout: true, fader: true, mixes: false, variant: "solid", preset: "peak" };
const layout = (w: number, channels = WL_LIVE.channels) =>
  renderToString(<WaveLinkLayout size="xs" w={w} h={228} up state={WL_LIVE} channels={channels} devices={[]} o={o} vertical />);

describe("WaveLink in a tile", () => {
  it("drops the readout column and narrows the name column below 150px", () => {
    expect(layout(82, WL_LIVE.channels.slice(0, 1))).toContain("grid-template-columns:40px minmax(0,1fr)");
    expect(layout(82, WL_LIVE.channels.slice(0, 1))).not.toMatch(/grid-template-columns:40px minmax\(0,1fr\) \d+px/);
  });

  it("keeps the 64px name and the readout at tile-and-a-half widths and up", () => {
    expect(layout(200, WL_LIVE.channels.slice(0, 1))).toMatch(/grid-template-columns:64px minmax\(0,1fr\) 40px/);
  });
});

describe("scaleTicks", () => {
  it("keeps every dB label on a tall meter and drops the crowded ones on a short one", async () => {
    const { scaleTicks } = await import("./WaveLink");
    expect(scaleTicks(300)).toEqual([0, -12, -24, -48]);
    const short = scaleTicks(60);
    expect(short[0]).toBe(0);
    expect(short.length).toBeLessThan(4);
    expect(scaleTicks(0)).toEqual([0]);
  });
});
