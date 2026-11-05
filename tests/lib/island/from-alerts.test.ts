import { describe, expect, it } from "vitest";
import type { ActiveAlert, AlertDisplayFull } from "@/lib/alerts";
import { alertTitle, noticeFromAlert, splitIslandAlerts } from "@/lib/island/from-alerts";

const alert = (id: string, style: AlertDisplayFull["style"], over: Partial<ActiveAlert> = {}): ActiveAlert => ({
  id,
  ruleId: id,
  name: id,
  severity: "warning",
  text: "",
  startedAt: 1,
  acknowledged: false,
  display: { style, position: "top-right", backdrop: "none", size: "m", seconds: 8 },
  ...over,
});
const ids = (list: readonly ActiveAlert[]) => list.map((a) => a.id);

describe("splitIslandAlerts", () => {
  it("sends Auto and Island to a screen's island and leaves a lone toast in the layer", () => {
    const island = splitIslandAlerts([alert("a", "auto")], true);
    expect([ids(island.island), ids(island.layer)]).toEqual([["a"], []]);
    const toast = splitIslandAlerts([alert("t", "toast")], true);
    expect([ids(toast.island), ids(toast.layer)]).toEqual([[], ["t"]]);
  });

  it("queues everything but overlays in the island when two would show at once", () => {
    const { island, layer } = splitIslandAlerts([alert("t", "toast"), alert("i", "island", { severity: "critical" }), alert("o", "overlay")], true);
    expect(ids(island)).toEqual(["i", "t"]);
    expect(ids(layer)).toEqual(["o"]);
  });

  it("without an island the strongest leads and the rest wait in its slot", () => {
    const { island, layer } = splitIslandAlerts(
      [alert("b", "banner"), alert("i", "island", { severity: "critical" }), alert("o", "overlay")],
      false
    );
    expect(island).toEqual([]);
    expect(ids(layer)).toEqual(["o", "i", "b"]);
    expect(layer[1].display).toMatchObject({ style: "toast", position: "top" });
    expect(layer[2].display).toEqual(layer[1].display);
  });

  it("shows Auto as a toast in its own corner without an island", () => {
    const { layer } = splitIslandAlerts([alert("a", "auto")], false);
    expect(layer[0].display).toMatchObject({ style: "auto", position: "top-right" });
  });
});

describe("a test alert", () => {
  it("says so on the card and in the island", () => {
    const test = alert("a", "island", { test: true, title: "GPU temp" });
    expect(alertTitle(test)).toBe("Test · GPU temp");
    expect(noticeFromAlert(test).title).toBe("Test · GPU temp");
    expect(alertTitle(alert("b", "toast"))).toBe("b");
  });
});
