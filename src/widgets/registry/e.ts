// Template widgets, group E: the plain plugin cards that had no template (see docs/redesign/phase9/gaps.md).
// Each module's options are exported so its legacy id can alias the same template (`src/modules/*.tsx`).
import { findEntry } from "@/lib/sensors";
import { CARD_SETTINGS, IDLE_SETTING, STYLE_SETTINGS, SURFACE_SETTINGS } from "@/modules/standard-settings";
import type { DashboardModule, ModuleSetting } from "@/modules/types";
import { templateModule, type TemplateOptions } from "../module";
import Notifications, { meta as notificationsMeta, type NotificationsProps } from "../Notifications";
import TextFile, { meta as textFileMeta, type TextFileProps } from "../TextFile";
import WebPage, { meta as webPageMeta, type WebPageProps } from "../WebPage";

const boolOf = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const numberOf = (v: unknown): number | undefined => (v === undefined || v === "" || v === null || !Number.isFinite(Number(v)) ? undefined : Number(v));

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

export const TEXTFILE_SETTINGS: ModuleSetting[] = [{ key: "showMeta", label: "Size / lines / status header", type: "boolean", default: true, group: "Content" }];

export const textFileOptions: TemplateOptions<Pick<TextFileProps, "showMeta">> = {
  meta: textFileMeta,
  Component: TextFile,
  settings: TEXTFILE_SETTINGS,
  toProps: (s) => ({ showMeta: boolOf(s.showMeta) }),
};

export const NOTIFICATIONS_SETTINGS: ModuleSetting[] = [
  { key: "showHistory", label: "History list", type: "boolean", default: true, group: "Content" },
  { key: "maxLines", label: "Max history lines", type: "number", default: 50, min: 1, max: 200, step: 5, group: "Content" },
  IDLE_SETTING,
];

/** Idle = nothing unread. */
export const notificationsIdle: NonNullable<DashboardModule["isIdle"]> = (sensors) => !(Number(findEntry(sensors, "plugins.InfoPanel.Notifications.", "notification-count")?.sensor.value) > 0);

export const notificationsOptions: TemplateOptions<Pick<NotificationsProps, "showHistory" | "maxLines">> = {
  meta: notificationsMeta,
  Component: Notifications,
  settings: NOTIFICATIONS_SETTINGS,
  toProps: (s) => ({ showHistory: boolOf(s.showHistory), maxLines: numberOf(s.maxLines) }),
  isIdle: notificationsIdle,
};

export const GROUP_E: DashboardModule[] = [templateModule(webPageOptions), templateModule(textFileOptions), templateModule(notificationsOptions)];
