/**
 * General settings — dashboard-wide preferences that aren't a look: the
 * page font, how clocks read (12 / 24 h, seconds, date locale), motion
 * and the kiosk cursor. Stored on `DashboardConfig.general` with only the
 * changed keys; `resolveGeneral` fills the defaults.
 */

import { ensureFont, FONT_CATALOG, FONT_IDS, fontById, type FontId } from "@/lib/fonts";

export type GeneralFont = FontId;
export type MotionChoice = "system" | "reduce" | "full";

export interface GeneralSettings {
  /** The page font every widget's "Theme" (auto) font inherits ("system" = the browser's). */
  font?: GeneralFont;
  /** 12-hour clocks; unset = the locale's own choice. */
  hour12?: boolean;
  /** Clocks show seconds (default on). */
  showSeconds?: boolean;
  /** BCP 47 locale for dates and times; "" / unset = the system's. */
  locale?: string;
  /** Animations: follow the OS setting, or always reduce / always run. */
  motion?: MotionChoice;
  /** Hide the mouse cursor on kiosk pages. */
  hideCursor?: boolean;
  /** Kiosk page dots and swipe between a profile's pages (default off). */
  kioskPageNav?: boolean;
}

/** GeneralSettings with every default filled (`hour12` stays optional). */
export interface ResolvedGeneral {
  font: GeneralFont;
  hour12: boolean | undefined;
  showSeconds: boolean;
  locale: string;
  motion: MotionChoice;
  hideCursor: boolean;
  kioskPageNav: boolean;
}

export const GENERAL_DEFAULTS: ResolvedGeneral = {
  font: "system",
  hour12: undefined,
  showSeconds: true,
  locale: "",
  motion: "system",
  hideCursor: false,
  kioskPageNav: false,
};

/** CSS font stacks for the font choices (also the widget style's Font option). */
export const FONT_STACKS: Record<Exclude<GeneralFont, "system">, string> = Object.fromEntries(
  FONT_CATALOG.flatMap((f) => ("stack" in f ? [[f.id, f.stack]] : []))
) as Record<Exclude<GeneralFont, "system">, string>;

const FONTS: readonly GeneralFont[] = FONT_IDS;
const MOTIONS: readonly MotionChoice[] = ["system", "reduce", "full"];

/**
 * The font-family for a choice; undefined = the page's own ("system").
 * Also makes sure a web font's stylesheet is loading (idempotent).
 */
export function fontStack(font: GeneralFont): string | undefined {
  ensureFont(font);
  return fontById(font)?.stack;
}

/** Whether the runtime can format dates in this locale ("" = the system's). */
export function isSupportedLocale(locale: string): boolean {
  if (locale === "") return true;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
  } catch {
    return false; // not a well-formed language tag
  }
}

/** The settings with defaults filled. */
export function resolveGeneral(config: { general?: GeneralSettings }): ResolvedGeneral {
  return { ...GENERAL_DEFAULTS, ...config.general };
}

/**
 * A stored `general` value, keeping only valid keys (an unknown font,
 * an unsupported locale, ... are dropped); undefined when nothing is left.
 */
export function normalizeGeneral(input: unknown): GeneralSettings | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  const v = input as Record<string, unknown>;
  const out: GeneralSettings = {};
  if (FONTS.includes(v.font as GeneralFont)) out.font = v.font as GeneralFont;
  if (typeof v.hour12 === "boolean") out.hour12 = v.hour12;
  if (typeof v.showSeconds === "boolean") out.showSeconds = v.showSeconds;
  if (typeof v.locale === "string" && isSupportedLocale(v.locale.trim())) out.locale = v.locale.trim();
  if (MOTIONS.includes(v.motion as MotionChoice)) out.motion = v.motion as MotionChoice;
  if (typeof v.hideCursor === "boolean") out.hideCursor = v.hideCursor;
  if (typeof v.kioskPageNav === "boolean") out.kioskPageNav = v.kioskPageNav;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** `general` with one key set (undefined clears it back to the default). */
export function withGeneral<K extends keyof GeneralSettings>(
  general: GeneralSettings | undefined,
  key: K,
  value: GeneralSettings[K]
): GeneralSettings | undefined {
  const rest = Object.fromEntries(Object.entries(general ?? {}).filter(([k]) => k !== key)) as GeneralSettings;
  const next: GeneralSettings = value === undefined ? rest : { ...rest, [key]: value };
  return Object.keys(next).length > 0 ? next : undefined;
}

/** The locales the General tab offers (plus "System"). */
export const COMMON_LOCALES: readonly { value: string; label: string }[] = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "de-DE", label: "Deutsch (Deutschland)" },
  { value: "de-CH", label: "Deutsch (Schweiz)" },
  { value: "fr-FR", label: "Français" },
  { value: "it-IT", label: "Italiano" },
  { value: "es-ES", label: "Español" },
  { value: "nl-NL", label: "Nederlands" },
  { value: "sv-SE", label: "Svenska" },
  { value: "nb-NO", label: "Norsk bokmål" },
  { value: "pl-PL", label: "Polski" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "ja-JP", label: "日本語" },
  { value: "zh-CN", label: "中文 (简体)" },
];

/** The clock's time and date strings for a moment, under the general settings. */
export function formatClock(now: Date, g: Pick<ResolvedGeneral, "hour12" | "showSeconds" | "locale">) {
  const locales = g.locale || undefined;
  const time = now.toLocaleTimeString(locales, {
    hour: "2-digit",
    minute: "2-digit",
    ...(g.showSeconds ? { second: "2-digit" as const } : {}),
    ...(g.hour12 !== undefined ? { hour12: g.hour12 } : {}),
  });
  const date = now.toLocaleDateString(locales, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return { time, date };
}
