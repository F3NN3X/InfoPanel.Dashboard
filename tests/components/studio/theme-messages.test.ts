import { describe, expect, it } from "vitest";
import { appliedToast, paletteUsedBy, lookToast, resetToast, type AppliedOutcome } from "@/components/studio/theme-messages";

describe("the toast row", () => {
  const outcome = (o: Partial<AppliedOutcome>): AppliedOutcome => ({ replaced: false, background: false, kept: 0, widgets: 0, ...o });

  it("says what changed, the background, and the fine-tune kept; a page names where its parts come from", () => {
    expect(appliedToast("Desk", "screen", outcome({}), "MyDefault")).toEqual({ title: "Applied Desk.", sub: "Colors, widget style and corners changed. Background kept." });
    expect(appliedToast("Desk", "screen", outcome({ background: true, kept: 2 }), "MyDefault")).toEqual({
      title: "Applied Desk.",
      sub: "Colors, widget style, corners and background changed. 2 fine-tune changes kept.",
    });
    expect(appliedToast("Desk", "page", outcome({ kept: 1 }), "MyDefault")).toEqual({
      title: "Applied Desk.",
      sub: "Widget style changed. Colors, corners and background come from MyDefault. 1 fine-tune change kept.",
    });
  });

  it("says a first pick replaced the theme, and the widgets that keep their own", () => {
    expect(appliedToast("Paper", "screen", outcome({ replaced: true, background: true, widgets: 3 }), "MyDefault").sub).toBe(
      "Replaced this screen's theme, background included. 3 widgets keep their own style."
    );
    expect(appliedToast("Paper", "screen", outcome({ replaced: true }), "MyDefault").sub).toBe("Replaced this screen's theme. Background kept.");
    expect(appliedToast("Paper", "page", outcome({ replaced: true, widgets: 1 }), "MyDefault").sub).toBe(
      "Replaced this page's theme. Colors, corners and background come from MyDefault. 1 widget keeps its own style."
    );
  });

  it("a picked Look and reset name where a page's palette, corners and background come from", () => {
    expect(lookToast("TUI", "screen", false, "MyDefault")).toEqual({ title: "Theme changed to TUI.", sub: "Your colors, corners and fine-tune changes kept." });
    expect(lookToast("TUI", "screen", true, "MyDefault").sub).toBe("Your colors, corners and fine-tune changes kept. Background changed.");
    expect(lookToast("TUI", "page", false, "MyDefault").sub).toBe("Your fine-tune changes kept. Colors, corners and background come from MyDefault.");
    expect(resetToast("Desk", "screen", "MyDefault", "MyDefault")).toEqual({
      title: "Reset to Desk.",
      sub: "Everything on MyDefault now matches the theme, including its background.",
    });
    expect(resetToast("Desk", "page", "Gaming", "MyDefault").sub).toBe("Everything on Gaming now matches the theme. Colors, corners and background come from MyDefault.");
  });

  it("a saved palette's line names who uses it", () => {
    expect(paletteUsedBy(["Desk look", "All screens"])).toBe("Used by Desk look and All screens");
    expect(paletteUsedBy([])).toBe("Not in use");
  });
});
