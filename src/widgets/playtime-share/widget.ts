// Playtime Share: two weeks of play, split by game. What the registry needs; the component is its own chunk.
import type { ModuleSettings, PaletteRole } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { colorSetting, listOf, type ColorEntry } from "../shared/settings-kit";
import type { PlaytimeShareProps } from "./PlaytimeShare";
import { meta } from "./meta";
import { PALETTE } from "./palette";

/** The slices follow the theme's Series 1 to 6. */
const PLAYTIME_ROLES = ["s1", "s2", "s3", "s4", "s5", "s6"] as const satisfies readonly PaletteRole[];
const PLAYTIME_COLORS: ColorEntry[] = PALETTE.map((_, i) => ({ entry: String(i), key: `color${i + 1}`, label: `Slice ${i + 1}` }));
/** The slice colours: a stored `colors` list, else the per-slice colours (an unset slice keeps its default). */
function playtimeColors(s: ModuleSettings): string[] | undefined {
  const list = listOf(s.colors, (x) => (typeof x === "string" && x ? x : undefined));
  if (list?.length) return list;
  const set = PLAYTIME_COLORS.map((c) => String(s[c.key] ?? "").trim());
  return set.some(Boolean) ? set.map((c, i) => c || PALETTE[i]) : undefined;
}

export default defineWidget({
  meta,
  inspector: { header: "yes", compact: BOTH },
  settings: PLAYTIME_COLORS.map((c, i) => colorSetting(c.key, c.label, { role: PLAYTIME_ROLES[i], more: false })),
  render: {
    load: () => import("./PlaytimeShare"),
    toProps: (s: ModuleSettings): Partial<PlaytimeShareProps> => ({ colors: playtimeColors(s) }),
  },
});
