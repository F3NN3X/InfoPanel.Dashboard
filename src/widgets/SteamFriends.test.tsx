import { describe, expect, it } from "vitest";
import { renderModule } from "@/widgets/test-render";
import type { SensorMap } from "@/modules/types";
import { FRIEND_COLORS, friendsOf, friendStatus } from "./SteamFriends";
import { TEMPLATE_MODULES } from "./registry";

const SOCIAL = "plugins.InfoPanel.SteamAPI.SteamAPI-Social.";
const TABLE = ["Zed, Online, , 1 day ago", "anna, Snooze, Euro Truck Simulator 2, 13 hours ago", "Bo, Away, , 2 hours ago", "Cy, Online, Dead by Daylight, 4 days ago", "Di, Busy, , 5 min ago"].join("\n");
const sensors = (table = TABLE): SensorMap => ({
  [`${SOCIAL}friends-activity`]: { value: 0, unit: "", text: table },
  [`${SOCIAL}friends-online`]: { value: 5, unit: "" },
  [`${SOCIAL}friends-ingame`]: { value: 2, unit: "" },
  [`${SOCIAL}total-friends`]: { value: 26, unit: "" },
});

describe("Steam friend status", () => {
  it("puts a game ahead of away, as Steam does", () => {
    expect(friendStatus("Snooze", "Euro Truck Simulator 2")).toBe("ingame");
    expect(friendStatus("Online", "")).toBe("online");
    expect(friendStatus("Looking to Play", "")).toBe("online");
    expect(friendStatus("Away", "")).toBe("away");
    expect(friendStatus("Snooze", " ")).toBe("away");
    expect(friendStatus("Busy", "")).toBe("busy");
    expect(friendStatus("Offline", "Portal")).toBe("offline");
  });

  it("sorts by status, by name, or keeps the plugin's order", () => {
    expect(friendsOf(TABLE).map((f) => f.name)).toEqual(["anna", "Cy", "Zed", "Bo", "Di"]);
    expect(friendsOf(TABLE, "name").map((f) => f.name)).toEqual(["anna", "Bo", "Cy", "Di", "Zed"]);
    expect(friendsOf(TABLE, "plugin").map((f) => f.name)).toEqual(["Zed", "anna", "Bo", "Cy", "Di"]);
  });

  it("filters to friends in a game, and marks one idling in a game", () => {
    const playing = friendsOf(TABLE, "plugin", true);
    expect(playing.map((f) => [f.name, f.idle])).toEqual([["anna", true], ["Cy", false]]);
  });
});

describe("SteamFriends widget", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "SteamFriends")!;
  const render = (settings = {}, data = sensors()) => renderModule(mod, { layout: "standard", ...settings }, data);

  it("lists every friend in Steam's status colours", () => {
    const html = render();
    for (const name of ["anna", "Bo", "Cy", "Di", "Zed"]) expect(html).toContain(name);
    expect(html).toContain(FRIEND_COLORS.ingame);
    expect(html).toContain(FRIEND_COLORS.busy);
    expect(html).toContain("13 hours ago");
  });

  it("shows a table with one column per field", () => {
    const html = render({ view: "table" });
    for (const head of ["Friend", "Status", "Playing", "Last online"]) expect(html).toContain(`>${head}<`);
    expect(html).toContain(">In-game<");
    expect(html).toContain(">Snooze<");
  });

  it("hides the time, shows the counts, and takes a custom colour", () => {
    const html = render({ showTime: false, showCounts: true, busyColor: "#123456" });
    expect(html).not.toContain("13 hours ago");
    expect(html).toContain("5 online · 2 in-game · 26 friends");
    expect(html).toContain("#123456");
    expect(html).not.toContain(FRIEND_COLORS.busy);
  });

  it("says so when no friend is in a game", () => {
    expect(render({ ingameOnly: true }, sensors("Zed, Online, , 1 day ago"))).toContain("No friends in-game");
    expect(render({}, sensors(""))).toContain("No friends online");
  });
});
