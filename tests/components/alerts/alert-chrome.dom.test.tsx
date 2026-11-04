// @vitest-environment happy-dom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AlertLayer } from "@/components/alerts/alert-layer";
import type { ActiveAlert } from "@/lib/alerts";

// L25: the alert cards wear the screen's pack colours through the layer's vars (index.css draws them); Classic's layer has none.
const alert: ActiveAlert = {
  id: "a",
  ruleId: "r",
  name: "Alert a",
  severity: "warning",
  text: "body",
  startedAt: 1000,
  acknowledged: false,
  display: { style: "toast", position: "top-right", backdrop: "none", size: "m", seconds: 10 },
};

afterEach(cleanup);

describe("the alert layer's chrome", () => {
  it("carries the worn pack's surface, text and edge once the pack has loaded", async () => {
    render(<AlertLayer alerts={[alert]} onAck={() => {}} lookId="paper" />);
    const layer = document.querySelector<HTMLElement>("[data-alert-layer]")!;
    expect(layer.hasAttribute("data-pack-chrome")).toBe(false);
    await waitFor(() => expect(layer.hasAttribute("data-pack-chrome")).toBe(true));
    for (const name of ["--pack-chrome-fill", "--pack-chrome-ink", "--pack-chrome-edge"]) expect(layer.style.getPropertyValue(name)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("carries nothing for Classic or a Look that is not a pack", async () => {
    for (const lookId of [undefined, "classic", "nope"]) {
      render(<AlertLayer alerts={[alert]} onAck={() => {}} lookId={lookId} />);
      await new Promise((r) => setTimeout(r, 20));
      const layer = document.querySelector<HTMLElement>("[data-alert-layer]")!;
      expect(layer.hasAttribute("data-pack-chrome")).toBe(false);
      expect(layer.style.getPropertyValue("--pack-chrome-fill")).toBe("");
      cleanup();
    }
  });
});
