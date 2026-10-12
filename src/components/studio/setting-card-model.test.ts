import { describe, expect, it } from "vitest";
import type { ModuleSetting } from "@/modules/types";
import { categorize } from "./inspector-categories";
import { changedDefs, navSections, pairRows, resetKeysOf } from "./setting-card-model";

const def = (key: string, over: Partial<ModuleSetting> = {}): ModuleSetting => ({
  key,
  label: key,
  type: "boolean",
  default: false,
  ...over,
});

describe("changedDefs / resetKeysOf", () => {
  const defs = [def("a"), def("b"), def("c"), def("align", { type: "align", keyY: "alignY", default: "auto" })];

  it("counts settings set on the widget, not defaults or inherited ones", () => {
    const own = { a: true, b: false, align: "start" };
    const inherited = { c: true };
    expect(changedDefs(defs, own, inherited).map((d) => d.key)).toEqual(["a", "align"]);
  });

  it("counts an override of an inherited value", () => {
    expect(changedDefs([def("a")], { a: false }, { a: true }).map((d) => d.key)).toEqual(["a"]);
  });

  it("skips locked settings", () => {
    expect(changedDefs(defs, { a: true }, undefined, undefined, (d) => d.key === "a")).toEqual([]);
  });

  it("lists every stored key of the changed settings", () => {
    expect(resetKeysOf(defs, { a: true, alignY: "end", align: "start" }, undefined)).toEqual([
      "a",
      "align",
      "alignY",
    ]);
  });

  it("is empty when nothing is changed", () => {
    expect(resetKeysOf(defs, undefined, undefined)).toEqual([]);
  });
});

describe("pairRows", () => {
  it("pairs neighbouring short toggles and leaves the rest alone", () => {
    const rows = pairRows([
      def("a"),
      def("b"),
      def("c"),
      def("n", { type: "number" }),
      def("d"),
      def("e", { label: "A rather long toggle label" }),
      def("f"),
    ]);
    expect(rows.map((r) => r.map((d) => d.key))).toEqual([["a", "b"], ["c"], ["n"], ["d"], ["e"], ["f"]]);
  });

  it("handles no rows", () => {
    expect(pairRows([])).toEqual([]);
  });
});

describe("navSections", () => {
  const cats = categorize([
    def("label"),
    def("customCss"),
    def("tempWarn", { group: "Thresholds" }),
    def("cpu", { group: "CPU" }),
  ]);

  it("lists General, then the widget's categories, with counts", () => {
    const nav = navSections(cats, { widget: 2, "module:cpu": 1 }, "System");
    expect(nav.map((s) => [s.title, s.items.map((i) => [i.title, i.changed])])).toEqual([
      ["General", [["Widget", 2], ["Advanced", 0]]],
      ["System", [["Thresholds", 0], ["CPU", 1]]],
    ]);
  });

  it("omits a header without categories", () => {
    const nav = navSections(categorize([def("label")]), {}, "Blank");
    expect(nav.map((s) => s.id)).toEqual(["general"]);
  });
});
