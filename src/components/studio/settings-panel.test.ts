import { describe, expect, it } from "vitest";
import type { ModuleSetting } from "@/modules/types";
import { clearsOwn } from "./settings-panel";

const def = (over: Partial<ModuleSetting>): ModuleSetting => ({ key: "k", label: "K", type: "select", default: "auto", ...over }) as ModuleSetting;

describe("clearsOwn", () => {
  it("drops an own value set back to the default", () => {
    expect(clearsOwn(def({}), "auto", { own: { k: "card" } })).toBe(true);
    expect(clearsOwn(def({}), "card", { own: { k: "auto" } })).toBe(false);
  });

  it("compares with the inherited global style before the default", () => {
    const values = { own: { k: "card" }, inherited: { k: "compact" } };
    expect(clearsOwn(def({}), "compact", values)).toBe(true);
    // The default would no longer be what the widget shows without its own value.
    expect(clearsOwn(def({}), "auto", values)).toBe(false);
  });

  it("does nothing without an own value", () => {
    expect(clearsOwn(def({}), "auto", { own: {} })).toBe(false);
  });

  it("keeps composite and multi-value settings", () => {
    expect(clearsOwn(def({ type: "align", keyY: "alignY" }), "auto", { own: { k: "x" } })).toBe(false);
    expect(clearsOwn(def({ multiple: true }), "auto", { own: { k: "a,b" } })).toBe(false);
    expect(clearsOwn(def({ type: "sensor" }), "auto", { own: { k: "x" } })).toBe(false);
  });

  it("treats an empty colour or text as the empty default", () => {
    expect(clearsOwn(def({ type: "color", default: "" }), "", { own: { k: "#fff" } })).toBe(true);
    expect(clearsOwn(def({ type: "text", default: undefined }), "", { own: { k: "x" } })).toBe(true);
  });
});
