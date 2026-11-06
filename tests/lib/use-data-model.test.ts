import { describe, expect, it } from "vitest";
import type { ApiSources } from "@/lib/catalog";
import { modelOf } from "@/lib/use-data-model";
import type { SensorMap } from "@/modules/types";

const sources: ApiSources = { plugins: [] };
const sensors: SensorMap = { "system.cpu.load": { value: 12, unit: "%" } };

describe("modelOf", () => {
  it("hands every caller the same model while the catalog is the same, so every count agrees", () => {
    const a = modelOf(sources, sensors);
    expect(modelOf(sources, sensors)).toBe(a);
    expect(a.points).toHaveLength(1);
  });

  it("builds a new one when the catalog changes", () => {
    const next = { ...sensors, "system.ram.load": { value: 40, unit: "%" } };
    expect(modelOf(sources, next).points).toHaveLength(2);
  });
});
