// Game Spotlight: Steam art for the game you're playing. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolSetting, enumSetting, numberOf, numberSetting, oneOf, viewOnly, viewsExcept } from "../shared/settings-kit";
import type { GameSpotlightProps } from "./GameSpotlight";
import { meta } from "./meta";
import { SPOTLIGHT_COMPOSITE_SETTINGS, SPOTLIGHT_LAYOUT_SETTING, compositeProps } from "./settings";

/** Layouts that draw their own fixed gradient instead of the scrim. */
const FIXED_SCRIM = ["ticker", "poster"];
const layoutIs = (...layouts: string[]) => viewOnly(meta, ...layouts);

export default defineWidget({
  meta,
  // No header; a summary card and a dense view of its own.
  inspector: { header: "none", compact: BOTH },
  settings: [
    SPOTLIGHT_LAYOUT_SETTING,
    ...SPOTLIGHT_COMPOSITE_SETTINGS.map(layoutIs("composite")),
    layoutIs("combo")(enumSetting("music", "Music source", "media", [{ value: "media", label: "Media" }, { value: "spotify", label: "Spotify" }], { group: "Music card" })),
    layoutIs("combo")(enumSetting("progress", "Music progress", "wave", [{ value: "wave", label: "Wave" }, { value: "visualizer", label: "Visualizer" }], { group: "Music card" })),
    layoutIs("combo")(enumSetting("vizMode", "Visualizer mode", "bars", ["bars", "mirror", "wave", "dots", "line"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), { group: "Music card", visibleIf: (v) => v.progress === "visualizer" })),
    layoutIs(...viewsExcept(meta, ...FIXED_SCRIM))(numberSetting("scrim", "Scrim darkness", 0.6, { min: 0, max: 1, step: 0.05, group: "Layout" })),
    layoutIs(...viewsExcept(meta, "poster"))(boolSetting("motion", "Ken Burns motion", true, { group: "Dynamics", tab: "behaviour" })),
  ],
  render: {
    load: () => import("./GameSpotlight"),
    toProps: (s: ModuleSettings): Partial<GameSpotlightProps> => ({
      // The standard `layout` keeps its meaning; the template's own layout is stored as `spotlightLayout`.
      layout: oneOf(s.spotlightLayout, ["hero", "poster", "logo", "ticker", "combo", "composite"]),
      ...compositeProps(s),
      motion: typeof s.motion === "boolean" ? s.motion : undefined,
      scrim: numberOf(s.scrim),
      music: oneOf(s.music, ["media", "spotify"]),
      progress: oneOf(s.progress, ["wave", "visualizer"]),
      vizMode: oneOf(s.vizMode, ["bars", "mirror", "wave", "dots", "line"]),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
