// Template widgets, group E: the plain plugin cards that had no template (see docs/redesign/phase9/gaps.md).
// Each module's options are exported so its legacy id can alias the same template (`src/modules/*.tsx`).
import { CARD_SETTINGS, STYLE_SETTINGS, SURFACE_SETTINGS } from "@/modules/standard-settings";
import type { DashboardModule, ModuleSetting } from "@/modules/types";
import { templateModule, type TemplateOptions } from "../module";
import WebPage, { meta as webPageMeta, type WebPageProps } from "../WebPage";

/** The frame's edge: border and glow only (the page covers any surface). */
const EDGE_KEYS: ReadonlySet<string> = new Set(["borderWidth", "borderColor", "glow", "glowColor"]);

/**
 * A web page has no layout of its own: a URL, its size and corners, an accent and the frame's edge
 * (no auto-scale, which would zoom the embedded page itself).
 */
export const WEBPAGE_SETTINGS: ModuleSetting[] = [
  { key: "url", label: "URL", type: "text", default: "", group: "Page" },
  ...STYLE_SETTINGS.filter((d) => d.key === "scale" || d.key === "radius"),
  ...CARD_SETTINGS.filter((d) => d.key === "accent"),
  ...SURFACE_SETTINGS.filter((d) => EDGE_KEYS.has(d.key)),
];

export const webPageOptions: TemplateOptions<Pick<WebPageProps, "url">> = {
  meta: webPageMeta,
  Component: WebPage,
  base: [],
  settings: WEBPAGE_SETTINGS,
  toProps: (s) => ({ url: String(s.url ?? "") }),
};

export const GROUP_E: DashboardModule[] = [templateModule(webPageOptions)];
