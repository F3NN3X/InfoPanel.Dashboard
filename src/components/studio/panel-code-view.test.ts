import { describe, expect, it } from "vitest";
import { parsePanelJson } from "@/lib/panel-model";
import { invalidJsonToast } from "./panel-code-view";

describe("invalidJsonToast", () => {
  it("puts the parser's message after the em dash, without a doubled prefix", () => {
    const parsed = parsePanelJson("{ nope", () => "w1");
    expect(parsed.ok).toBe(false);
    const message = invalidJsonToast(parsed.ok ? "" : parsed.error);
    expect(message.startsWith("Invalid JSON — ")).toBe(true);
    expect(message).not.toContain("Invalid JSON: ");
  });

  it("keeps a shape error whole", () => {
    expect(invalidJsonToast('"widgets" must be a list.')).toBe('Invalid JSON — "widgets" must be a list.');
  });
});
