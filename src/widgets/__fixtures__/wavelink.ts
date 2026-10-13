import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame } from "@/lib/audio/types";
import type { WlState } from "@/lib/wavelink";

/** A connected Wave Link: two channels (one muted, routed to both mixes), an output device and two mixes. */
export const WL_LIVE: WlState = {
  status: "up",
  appVersion: "2.0.1",
  devices: [{ id: "mic1", name: "Wave:3", deviceType: "input", inputs: [{ id: "i1", name: "Wave:3", isMuted: false, gain: { value: 0.6, min: 0, max: 1 } }] }],
  channels: [
    { id: "music", name: "Music", type: "channel", level: 0.8, isMuted: false, mixes: [{ id: "stream", level: 1, isMuted: false }, { id: "monitor", level: 1, isMuted: true }], apps: [] },
    { id: "game", name: "Game", type: "channel", level: 0.5, isMuted: true, mixes: [{ id: "monitor", level: 1, isMuted: false }], apps: [] },
  ],
  mixes: [
    { id: "stream", name: "Stream Mix", level: 0.9, isMuted: false },
    { id: "monitor", name: "Monitor Mix", level: 0.7, isMuted: false },
  ],
};

export const WL_ABSENT: WlState = { status: "absent", appVersion: "", devices: [], channels: [], mixes: [] };

/** A meter frame at −12 dB left, −6 dB right. */
export const WL_FRAME: MeterFrame = { channels: [{ peakDb: -12 }, { peakDb: -6 }] };

/** Overrides for `vi.mock("@/lib/wavelink")`: the state and a meter emitter holding `WL_FRAME`. */
export function wavelinkMock(state: WlState = WL_LIVE) {
  const emitter = createFrameEmitter<MeterFrame>();
  emitter.emit(WL_FRAME);
  return { useWavelinkState: () => state, useWavelinkMeter: () => emitter };
}
