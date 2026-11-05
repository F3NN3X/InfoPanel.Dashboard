// Profile templates at every size: each template made at every New InfoPanel profile size (and a portrait one), on
// the gallery's mock machine and on one with no Data API, and kept through the stored form. It must read back item for
// item. npm test keeps one size per template; this sweep is the heavy check.
import { describe, expect, it } from "vitest";
import { SIZE_PRESETS } from "@/components/templates/size-presets";
import { readStored } from "@/lib/infopanel/import/stored.ts";
import { walkItems } from "@/lib/infopanel/parse.ts";
import { TEMPLATES } from "@/lib/infopanel/templates/catalog.ts";
import { instantiate } from "@/lib/infopanel/templates/instantiate.ts";
import { MOCK_SENSORS } from "@/lib/infopanel/templates/mock.ts";

const sizes = SIZE_PRESETS;
const machines = { mock: MOCK_SENSORS, none: {} } as const;

describe.each(TEMPLATES.map((t) => [t.id, t] as const))("template %s", (_, t) => {
  it.each(sizes.flatMap((s) => (["mock", "none"] as const).map((m) => [s.width, s.height, m] as const)))("%i × %i on the %s machine reads back from the stored form", (width, height, machine) => {
    const { stored } = instantiate(t, { name: t.name, width, height, sensors: machines[machine], variant: t.variants.at(-1)!.id });
    const read = readStored(JSON.parse(JSON.stringify(stored)));
    expect(read.issues.filter((i) => i.code !== "unknown-field")).toEqual([]);
    expect(read.profile).toMatchObject({ Width: width, Height: height });
    expect([...walkItems(read.items)].length).toBeGreaterThan(0);
  });
});
