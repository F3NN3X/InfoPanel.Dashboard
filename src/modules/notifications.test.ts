import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { notificationsOptions } from "@/widgets/registry/e";
import { notificationsModule } from "./notifications";
import { effectiveSettings, type ModuleSettings, type SensorMap } from "./types";

const P = "plugins.InfoPanel.Notifications.notifications.";
const html = (s: ModuleSettings, sensors: SensorMap = fixtureSensors()) => renderToString(notificationsModule.render(sensors, s) as never);

describe("notifications", () => {
  it.each([
    [{}, { showHistory: true, maxLines: 50 }],
    [{ showHistory: false, maxLines: 5 }, { showHistory: false, maxLines: 5 }],
    [{ maxLines: 200 }, { showHistory: true, maxLines: 200 }],
  ])("maps %j", (saved, expected) => {
    expect(notificationsOptions.toProps(effectiveSettings(notificationsModule, saved))).toEqual(expected);
  });

  it("shows the last toast, the count and the history rows with their tones", () => {
    const out = html({ layout: "card" });
    expect(out).toContain("Build finished: 0 errors, 2 warnings");
    expect(out).toContain("Listening");
    expect(out).toContain("Disk space is low on D:");
    expect(out).toContain("Backup job failed");
    expect(out).toContain("#F2665E"); // Error tone
    expect(out).toContain("#EDB232"); // Warning tone
  });

  it("limits the history to maxLines and hides it with showHistory off", () => {
    const limited = html({ layout: "card", maxLines: 2 });
    expect(limited).toContain("Disk space is low on D:");
    expect(limited).not.toContain("Backup job failed");
    expect(html({ layout: "card", showHistory: false })).not.toContain("Disk space is low on D:");
  });

  it("keeps the status line at 2x1 and draws the history without a scroll container", () => {
    const xs = html({ layout: "simple" });
    expect(xs).toContain("Listening");
    expect(xs).toContain("Notifications");
    expect(html({ layout: "card" })).not.toContain("overflow-y-auto");
  });

  it("is idle while nothing is unread", () => {
    const at = (n: number): SensorMap => ({ [`${P}notification-count`]: { value: n, unit: "", name: "n" } as never });
    expect(notificationsModule.isIdle?.(at(0), {})).toBe(true);
    expect(notificationsModule.isIdle?.(at(3), {})).toBe(false);
    expect(notificationsModule.isIdle?.({}, {})).toBe(true);
  });

  it("renders nothing without plugin data", () => {
    expect(notificationsModule.render({}, {})).toBeNull();
  });

  it("keeps the Theme card surface default and the hideWhenIdle key", () => {
    const s = effectiveSettings(notificationsModule);
    expect(s.surface).toBe("theme");
    expect(s.hideWhenIdle).toBe(false);
  });
});
