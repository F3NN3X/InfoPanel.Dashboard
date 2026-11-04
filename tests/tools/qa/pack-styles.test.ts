import { describe, expect, it } from "vitest";
import { PACK_IDS } from "@/looks/pack";
import { SAMPLE_THEMES, sampleStyle } from "@/looks/sample-themes";
import { PACK_STYLES } from "../../../tools/qa/pack-styles.mjs";

describe("the overflow runner's pack styles", () => {
  it("name every built-in pack, so no pack goes unchecked by the overflow runner and the visibility spec", () => {
    expect(Object.keys(PACK_STYLES).sort()).toEqual([...PACK_IDS].sort());
  });

  it.each(Object.keys(PACK_STYLES))("%s equals what its sample theme sets, plus its lookId", (id) => {
    const theme = SAMPLE_THEMES.find((t) => t.id === id)!;
    expect(PACK_STYLES[id]).toEqual({ lookId: id, ...sampleStyle(theme) });
  });
});
