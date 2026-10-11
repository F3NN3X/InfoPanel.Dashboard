import { describe, expect, it } from "vitest";
import { groupDefs } from "./settings-panel";
import type { ModuleSetting } from "@/modules/types";

const def = (key: string, group?: string): ModuleSetting => ({
  key,
  label: key,
  type: "boolean",
  default: false,
  group,
});

describe("groupDefs", () => {
  it("keeps top-level settings in order and gathers each group where it first appears", () => {
    const blocks = groupDefs([
      def("a"),
      def("b"),
      def("c1", "Colors"),
      def("d"),
      def("s1", "Size"),
      def("c2", "Colors"),
    ]);
    expect(blocks.map((b) => [b.group ?? "-", b.defs.map((d) => d.key)])).toEqual([
      ["-", ["a", "b"]],
      ["Colors", ["c1", "c2"]],
      ["-", ["d"]],
      ["Size", ["s1"]],
    ]);
  });

  it("handles no settings", () => {
    expect(groupDefs([])).toEqual([]);
  });
});
