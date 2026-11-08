// WebPage's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "WebPage",
  name: "Web Page",
  category: "Generic",
  icon: "language",
  prefixes: [],
  defaultSize: [6, 4],
  minSize: [4, 2],
  blurb: "A web page or video in a frame",
  tags: "web youtube iframe browser",
  description: "Embeds a web page or YouTube video in a frame that fills the widget.",
};
