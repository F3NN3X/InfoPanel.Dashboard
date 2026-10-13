import { describe, expect, it } from "vitest";
import type { DataPoint } from "@/lib/data-points";
import { NOTIFICATION_APPS_KEY, notificationApps } from "./alerts-rule-editor";

const point = (key: string, raw: string) => ({ key, raw }) as DataPoint;

describe("notificationApps", () => {
  it("reads the app list the Notifications plugin publishes", () => {
    const points = [point("other.apps", '["Nope"]'), point(NOTIFICATION_APPS_KEY, '["Discord","NVIDIA App"]')];
    expect(notificationApps(points)).toEqual(["Discord", "NVIDIA App"]);
  });
  it("accepts a comma list and is empty without the plugin", () => {
    expect(notificationApps([point(NOTIFICATION_APPS_KEY, "Discord, Steam")])).toEqual(["Discord", "Steam"]);
    expect(notificationApps([])).toEqual([]);
  });
});
