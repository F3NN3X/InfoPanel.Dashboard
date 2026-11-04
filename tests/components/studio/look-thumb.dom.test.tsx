// @vitest-environment happy-dom
// The look card's thumbnail is rebuilt each editor render (each corner slider step): an equal preset keeps its object,
// so the thumbnail's widgets don't render again.
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStablePreset } from "@/components/studio/look-thumb";
import type { AppearancePreset } from "@/lib/appearance-presets";

const preset = (accent: string): AppearancePreset => ({ id: "current", name: "Desk", description: "", theme: "zinc", radius: 0.5, style: { lookId: "term", accent } });

describe("useStablePreset", () => {
  it("keeps the same object while the preset is equal, a new one once it changes", () => {
    const { result, rerender } = renderHook(({ p }) => useStablePreset(p), { initialProps: { p: preset("#ff0000") } });
    const first = result.current;
    rerender({ p: preset("#ff0000") });
    expect(result.current).toBe(first);
    rerender({ p: preset("#00ff00") });
    expect(result.current).not.toBe(first);
    expect(result.current.style.accent).toBe("#00ff00");
  });
});
