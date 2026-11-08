// PlaytimeShare's catalog entry, apart from its component so the registry can list it without loading the widget.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "PlaytimeShare",
  name: "Playtime Share",
  category: "Gaming",
  icon: "stacked_bar_chart",
  prefixes: [],
  defaultSize: [3, 2],
  minSize: [1, 1],
  blurb: "Two weeks of play, split by game",
  tags: "steam hours",
  description: "How the last two weeks of play split between games — one bar, segments sized by share — with sessions and library totals.",
};
