// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { getKeepBackground, setKeepBackground } from "@/components/studio/theme-keep-background";

describe("Keep my background", () => {
  beforeEach(() => localStorage.clear());

  it("is remembered per screen as a local preference, off by default", () => {
    expect(getKeepBackground("a")).toBe(false);
    setKeepBackground("a", true);
    expect(getKeepBackground("a")).toBe(true);
    expect(getKeepBackground("b")).toBe(false);
  });
});
