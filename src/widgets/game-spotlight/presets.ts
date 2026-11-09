// Game Spotlight's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "hero", name: "Hero", view: "hero", settings: {}, size: [4, 2], default: true },
  { id: "poster", name: "Poster", view: "poster", blurb: "Game poster art beside its stats", tags: "cover grid art", settings: {}, size: [4, 2] },
  { id: "logo", name: "Logo", view: "logo", blurb: "The game’s logo over its banner", tags: "title art", settings: {}, size: [4, 2] },
  { id: "ticker", name: "Ticker", view: "ticker", blurb: "One row: icon, logo and session pills", tags: "strip bar row", settings: {}, size: [4, 1] },
  { id: "combo", name: "Combo (with music)", view: "combo", blurb: "Game banner with a music card", tags: "spotify media music", settings: {}, size: [4, 2] },
  { id: "composite", name: "Composite (profile, stats, news)", view: "composite", blurb: "Game, profile, stats and news in one", tags: "profile news stats dashboard", settings: {}, size: [4, 2] },
];

export default presets;
