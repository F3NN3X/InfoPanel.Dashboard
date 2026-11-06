import { describe, expect, it } from "vitest";
import { browseCounts, browseGroups, browseItems } from "@/components/studio/theme-browse-model";
import { lookPreset } from "@/components/studio/look-gallery-model";
import type { AppearancePreset } from "@/lib/appearance-presets";

const look = (id: string, tags: string[]) => ({ id, name: id, description: `${id} theme`, tags, preset: lookPreset({ id, name: id, description: "" }) });
const saved = { id: "mine", name: "Desk night", description: "Saved from Classic", theme: {}, radius: 0.5, style: { lookId: "classic" } } as unknown as AppearancePreset;

const items = browseItems([look("field-kit", ["technical"]), look("classic", ["minimal"])], [saved], [{ id: "harbour", name: "Harbour" }], (p) => lookPreset({ ...p, description: "" }));

describe("Browse themes", () => {
  it("groups a theme pack, a plain theme, and what is the user's (saved themes and imported packs)", () => {
    const g = browseGroups(items, "all", undefined, "");
    expect(g.packs.map((i) => i.id)).toEqual(["field-kit"]);
    expect(g.plain.map((i) => i.id)).toEqual(["classic"]);
    expect(g.yours.map((i) => i.id)).toEqual(["mine", "harbour"]);
    expect(browseCounts(items)).toEqual({ all: 4, packs: 1, plain: 1, yours: 2 });
  });

  it("filters by kind, tag and search together", () => {
    expect(browseGroups(items, "packs", undefined, "").yours).toEqual([]);
    expect(browseGroups(items, "all", "technical", "").packs).toHaveLength(1);
    expect(browseGroups(items, "all", "technical", "").plain).toHaveLength(0);
    expect(browseGroups(items, "all", undefined, "night").yours.map((i) => i.id)).toEqual(["mine"]);
  });
});
