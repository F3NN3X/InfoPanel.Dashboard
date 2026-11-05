// The File menu's Export .infopanel: it stops only where there is nothing to export, and always says why.
import { describe, expect, it } from "vitest";
import { exportState, type CheckLine } from "@/components/studio/editor/file-menu-model";

const ok: CheckLine = { path: "a", name: "Clock", status: "ok" };
const out: CheckLine = { path: "b", name: "Web page", status: "out" };

describe("exportState", () => {
  it("is blocked on a screen for Studio panels, with the fix", () => {
    expect(exportState({ canvas: false, madeFor: undefined, rows: null })).toEqual({ blocked: "This screen is made for Studio panels", fixMadeFor: true });
    expect(exportState({ canvas: false, madeFor: "studio", rows: [ok] }).fixMadeFor).toBe(true);
  });

  it("is blocked on an InfoPanel screen's empty page", () => {
    expect(exportState({ canvas: false, madeFor: "infopanel", rows: [] })).toEqual({ blocked: "There is nothing on this page to export" });
  });

  it("runs while the check loads, and a part left out names it without stopping the export", () => {
    expect(exportState({ canvas: false, madeFor: "infopanel", rows: null })).toEqual({ problem: undefined });
    expect(exportState({ canvas: false, madeFor: "infopanel", rows: [ok, out] })).toEqual({ problem: out });
  });

  it("runs on an InfoPanel page whatever the screen is made for", () => {
    expect(exportState({ canvas: true, madeFor: "studio", rows: [out] })).toEqual({ problem: out });
  });
});
