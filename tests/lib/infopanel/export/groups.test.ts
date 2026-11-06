/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { parseDisplayItemsXml } from "@/lib/infopanel/parse.ts";
import { nestedGroups } from "./kind-cases.ts";

const xml = import.meta.glob<string>("../__fixtures__/kinds/Groups-nested.xml", { query: "?raw", import: "default", eager: true });

describe("a profile with nested groups made by the editor", () => {
  it("parses from its file identically, groups, order and positions included", () => {
    const items = nestedGroups();
    // Outer { a, Inner { d, b, c } }, e: two levels deep, no child offset by its group.
    const [outer, e] = items;
    expect([outer.Name, e.Name]).toEqual(["Outer", "e"]);
    expect(outer.kind === "Group" && outer.DisplayItems.map((i) => i.Name)).toEqual(["a", "Inner"]);
    const inner = outer.kind === "Group" ? outer.DisplayItems[1] : undefined;
    expect(inner?.kind === "Group" && inner.DisplayItems.map((i) => [i.Name, i.X, i.Y])).toEqual([["d", 30, 35], ["b", 10, 15], ["c", 20, 25]]);

    const back = parseDisplayItemsXml(Object.values(xml)[0]);
    expect(back.items).toEqual(items);
    expect(back.issues.filter((i) => i.code !== "unknown-field")).toEqual([]);
  });
});
