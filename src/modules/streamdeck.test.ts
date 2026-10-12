import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { streamDeckOptions } from "@/widgets/registry/e";
import { streamdeckModule } from "./streamdeck";
import { effectiveSettings, type ModuleSettings } from "./types";

const html = (s: ModuleSettings) => renderToString(streamdeckModule.render(fixtureSensors(), s) as never);

describe("streamdeck", () => {
  it.each([
    [{}, { showProfile: true, showLabels: true }],
    [{ showProfile: false }, { showProfile: false, showLabels: true }],
    [{ showLabels: false }, { showProfile: true, showLabels: false }],
  ])("maps %j", (saved, expected) => {
    expect(streamDeckOptions.toProps(effectiveSettings(streamdeckModule, saved))).toEqual(expected);
  });

  it("shows the device, its profile and every key as an icon with its label", () => {
    const out = html({ layout: "card" });
    expect(out).toContain("Stream Deck MK.2");
    expect(out).toContain("Streaming");
    for (const label of ["Scene 1", "Mute", "Live", "Chat", "Game"]) expect(out).toContain(`>${label}<`);
    expect(out.match(/src="\/assets\/qa\/deck\.svg"/g)?.length).toBeGreaterThanOrEqual(15);
    expect(out).toContain("repeat(5, minmax(0, 1fr))");
  });

  it("drops the profile and the labels when switched off", () => {
    const out = html({ layout: "card", showProfile: false, showLabels: false });
    expect(out).not.toContain("Streaming");
    expect(out).not.toContain(">Scene 1<");
    // the tooltip still names the key
    expect(out).toContain('title="Scene 1"');
  });

  it("renders nothing without plugin data", () => {
    expect(streamdeckModule.render({}, {})).toBeNull();
  });

  it("keeps the Theme card surface default", () => {
    expect(effectiveSettings(streamdeckModule).surface).toBe("theme");
  });
});
