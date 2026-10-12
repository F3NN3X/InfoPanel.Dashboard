import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import { panelTitle, placementTitle } from "./studio-modules";

const panel = (title: string, label?: string) =>
  ({
    id: "p",
    module: "panel",
    panel: { title, widgets: [] },
    settings: label === undefined ? undefined : { label },
  }) as unknown as Placement;

describe("panelTitle", () => {
  it("prefers the Widget card's title over the panel's own", () => {
    expect(panelTitle(panel("Old", "New"))).toBe("New");
    expect(placementTitle(panel("Old", "New"))).toBe("New");
  });

  it("falls back to the panel's title when the label is empty or unset", () => {
    expect(panelTitle(panel("Old", ""))).toBe("Old");
    expect(panelTitle(panel("Old"))).toBe("Old");
  });
});
