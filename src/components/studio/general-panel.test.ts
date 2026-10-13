import { describe, expect, it } from "vitest";
import { generalCards } from "./general-panel";

describe("generalCards", () => {
  const display = (general?: Parameters<typeof generalCards>[0]) =>
    generalCards(general, () => {}).find((c) => c.id === "doc:display")!;

  it("lists Page dots and swipe in the Display card", () => {
    expect(display().terms).toContain("Page dots");
  });

  it("counts the key as changed once it is set, and resets it", () => {
    expect(display().changed).toBe(0);
    expect(display({ kioskPageNav: true }).changed).toBe(1);
    const reset: string[] = [];
    generalCards({ kioskPageNav: true }, (key) => reset.push(key)).find((c) => c.id === "doc:display")!.onReset?.();
    expect(reset).toContain("kioskPageNav");
  });
});
