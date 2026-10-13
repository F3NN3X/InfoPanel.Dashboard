import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./art-tint";

describe("isSameOrigin", () => {
  const origin = "http://localhost:3922";
  it("treats root-relative, data and blob URLs as same-origin", () => {
    expect(isSameOrigin("/assets/qa/cover.svg", origin)).toBe(true);
    expect(isSameOrigin("data:image/png;base64,AA", origin)).toBe(true);
    expect(isSameOrigin("blob:http://localhost:3922/x", origin)).toBe(true);
  });
  it("compares absolute URLs by origin", () => {
    expect(isSameOrigin("http://localhost:3922/a.png", origin)).toBe(true);
    expect(isSameOrigin("http://localhost:52312/cover?v=1", origin)).toBe(false);
    expect(isSameOrigin("//cdn.example/a.png", origin)).toBe(false);
  });
  it("is false without an origin or for junk", () => {
    expect(isSameOrigin("http://x/a.png", undefined)).toBe(false);
    expect(isSameOrigin("not a url", origin)).toBe(false);
  });
});
