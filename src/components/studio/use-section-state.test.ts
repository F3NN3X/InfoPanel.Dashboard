import { describe, expect, it } from "vitest";
import { parseSections } from "./use-section-state";

describe("parseSections", () => {
  it("reads a stored map of booleans", () => {
    expect(parseSections('{"style:Colors & type":true,"frame":false}')).toEqual({
      "style:Colors & type": true,
      frame: false,
    });
  });

  it("drops non-boolean entries", () => {
    expect(parseSections('{"a":true,"b":"yes","c":1}')).toEqual({ a: true });
  });

  it("reads missing or malformed storage as empty", () => {
    expect(parseSections(null)).toEqual({});
    expect(parseSections("")).toEqual({});
    expect(parseSections("not json")).toEqual({});
    expect(parseSections("[true]")).toEqual({});
    expect(parseSections("null")).toEqual({});
  });
});
