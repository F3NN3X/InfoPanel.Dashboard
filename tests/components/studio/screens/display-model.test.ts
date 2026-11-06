import { describe, expect, it } from "vitest";
import type { ControlDisplay, ControlKiosk } from "@/lib/control";
import type { MonitorProfile } from "@/lib/layout";
import { connectedFor, disconnectedDisplays, displaySubtitle, displayTitle, liveDisplays, rotationButton, screenSummary, screensCountLine } from "@/components/studio/screens/display-model";

const kiosk = (over: Partial<ControlKiosk>): ControlKiosk => ({ id: "k1", profile: "a", page: "p1", address: "192.168.1.24", since: 0, ...over });
const display = (over: Partial<ControlDisplay>): ControlDisplay => ({ name: "desk", screen: "a", firstSeen: 0, lastSeen: 0, online: true, address: null, shows: "a", ...over });
const screen = (over: Partial<MonitorProfile> = {}) =>
  ({ id: "a", name: "Main", width: 1600, height: 900, pages: [{ id: "p1", name: "Page 1", placements: [{}, {}] }], ...over }) as unknown as MonitorProfile;

describe("liveDisplays", () => {
  it("is one card per kiosk, merged with its named display and its screen", () => {
    const cards = liveDisplays([kiosk({ display: "desk" }), kiosk({ id: "k2", profile: "gone" })], [display({})], [screen()]);
    expect(cards).toHaveLength(2);
    expect(cards[0].display?.name).toBe("desk");
    expect(cards[0].screen?.id).toBe("a");
    expect(cards[1].display).toBeUndefined();
    expect(cards[1].screen).toBeUndefined();
  });

  it("leaves the displays that are not connected for their own list", () => {
    expect(disconnectedDisplays([display({}), display({ name: "wall", online: false })]).map((d) => d.name)).toEqual(["wall"]);
  });
});

describe("a card's words", () => {
  it("titles by display name, else address, else Kiosk; and says nothing of size or connection type", () => {
    expect(displayTitle({ kiosk: kiosk({ display: "desk" }) })).toBe("desk");
    expect(displayTitle({ kiosk: kiosk({}) })).toBe("Kiosk · 192.168.1.24");
    expect(displayTitle({ kiosk: kiosk({ address: null }) })).toBe("Kiosk");
    expect(displaySubtitle({ kiosk: kiosk({ since: 0 }) }, 2 * 3_600_000)).toBe("connected 2 h");
    expect(displaySubtitle({ kiosk: kiosk({ display: "desk", since: 0 }) }, 30_000)).toBe("192.168.1.24 · connected just now");
  });

  it("counts how long a kiosk has been connected", () => {
    expect([0, 59_000, 5 * 60_000, 3 * 3_600_000, 2 * 86_400_000].map((ms) => connectedFor(0, ms))).toEqual(["now", "now", "5 min", "3 h", "2 d"]);
  });

  it("summarises a screen and the header's count", () => {
    expect(screenSummary(screen())).toBe("1600 × 900 · 1 page · 2 widgets");
    expect(screensCountLine(4, 2)).toBe("4 screens · 2 displays live");
    expect(screensCountLine(1, 0)).toBe("1 screen");
  });
});

describe("rotationButton", () => {
  const two = screen({ pages: [{ id: "p1", name: "A", placements: [] }, { id: "p2", name: "B", placements: [] }], rotate: { enabled: false, seconds: 30 } } as Partial<MonitorProfile>);
  it("follows the server's state, else the saved setting, and names the screen", () => {
    expect(rotationButton(two, { rotating: true })).toMatchObject({ label: "30 s", running: true, toggles: true });
    expect(rotationButton(two, undefined)).toMatchObject({ label: "Paused", running: false });
    expect(rotationButton(two, undefined).title).toContain("Main");
  });
  it("states no interval for a screen with no saved rotation, never 0 s", () => {
    const unsaved = { ...two, rotate: undefined } as typeof two;
    const button = rotationButton(unsaved, { rotating: true });
    expect(button).toMatchObject({ label: "Rotating", running: true });
    expect(button.title).not.toContain("0 s");
    expect(button.title).not.toContain("pages every");
  });
  it("cannot be toggled on a one-page screen", () => {
    expect(rotationButton(screen(), undefined)).toMatchObject({ label: "One page", toggles: false });
  });
});
