import { describe, expect, it } from "vitest";
import type { ActiveAlert } from "@/lib/alerts";
import { noticeFromAlert, splitIslandAlerts } from "./from-alerts";

const alert = (id: string, style: ActiveAlert["display"]["style"], seconds = 8): ActiveAlert => ({
  id,
  ruleId: "r",
  name: `Alert ${id}`,
  severity: "warning",
  text: "92 °C",
  startedAt: 0,
  acknowledged: false,
  display: { style, position: "top-right", backdrop: "none", size: "m", seconds },
});

describe("splitIslandAlerts", () => {
  const list = [alert("t", "toast"), alert("i", "island"), alert("b", "banner")];

  it("sends island alerts to the island and the rest to the layer", () => {
    const { island, layer } = splitIslandAlerts(list, true);
    expect(island.map((a) => a.id)).toEqual(["i"]);
    expect(layer.map((a) => a.id)).toEqual(["t", "b"]);
  });

  it("shows island alerts as a top toast when the profile has no island", () => {
    const { island, layer } = splitIslandAlerts(list, false);
    expect(island).toEqual([]);
    expect(layer.map((a) => a.id)).toEqual(["t", "i", "b"]);
    expect(layer[1].display).toMatchObject({ style: "toast", position: "top" });
  });

  it("shows every alert exactly once either way", () => {
    for (const on of [true, false]) {
      const { island, layer } = splitIslandAlerts(list, on);
      expect([...island, ...layer].map((a) => a.id).sort()).toEqual(["b", "i", "t"]);
    }
  });
});

describe("noticeFromAlert", () => {
  it("opens for the display seconds and acknowledges on tap", () => {
    expect(noticeFromAlert(alert("i", "island", 5))).toEqual({
      source: "alerts",
      id: "i",
      severity: "warning",
      title: "Alert i",
      body: "92 °C",
      ttl: 5000,
      onTap: "ack",
      alertId: "i",
      badge: true,
    });
    expect(noticeFromAlert(alert("i", "island", 0)).ttl).toBe(0);
  });
});
