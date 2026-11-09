// Session Stats' catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const MAX_SENSORS = 6;
/** The lanes view's sensors (the Threshold Timeline widget's until config v19). */
export const MAX_LANES = 6;

export const meta: WidgetMeta = {
  id: "SessionStats",
  name: "Session Stats",
  category: "Generic",
  icon: "query_stats",
  prefixes: [],
  defaultSize: [4, 3],
  minSize: [2, 1],
  blurb: "Min, max, average and time above a level",
  tags: "session min max average peak history statistics time above",
  description: "Min, max, average and the time above a level for up to six sensors, counted since the page loaded. Nothing is stored: a reload starts again, and Reset in the studio starts over.",
  views: [
    { id: "stats", name: "Stats" },
    // The Threshold Timeline widget until config v19: added at its size and found by its words.
    {
      id: "lanes",
      name: "Threshold timeline",
      blurb: "Green, amber and red lanes over minutes",
      tags: "timeline history lanes threshold heat strip status minutes",
      defaultSize: [4, 2],
    },
  ],
};
