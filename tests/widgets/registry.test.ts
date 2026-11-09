import { describe, expect, it } from "vitest";
import { modules } from "@/modules";
import { renderModule } from "@/widgets/test-render";

// The test-only plugin in vite.config.ts loads every lazy widget before the registry exports (`loadAll`). A widget it
// misses renders through its empty stand-in, so "renders without throwing" would pass on empty markup: these must draw
// their fixture data. They are the folder widgets (`src/widgets/<kebab-id>/`), which no registry group loads.
const DRAWS: Record<string, string> = {
  NowPlaying: "Sample Track",
  StatusBar: "°C",
};

describe("the registry's widgets in Vitest", () => {
  // The GPU Rings widget's check, kept for the view it became (config v19).
  it("GpuMonitor's rings view draws its fixture data", () => {
    expect(renderModule(modules.find((m) => m.id === "GpuMonitor")!, { view: "rings" })).toContain("RTX 5090");
  });

  it.each(Object.entries(DRAWS))("%s draws its fixture data", (id, shows) => {
    const mod = modules.find((m) => m.id === id);
    expect(mod, id).toBeDefined();
    expect(renderModule(mod!)).toContain(shows);
  });
});
