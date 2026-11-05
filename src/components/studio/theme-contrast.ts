import { resolveT1, type Look, type LookMode } from "@/looks/look";
import { accentInk, contrastOf } from "@/looks/status";

/**
 * The live contrast readout of Theme's Accent and Colours rows: the validator's own contrast functions (`contrastOf`,
 * `accentInk`) against the theme's cards. Pure; only a `#rgb` or `#rrggbb` colour has a ratio.
 */

/** Text on a card needs this much (3 for large numbers). */
export const TEXT_MIN = 4.5;

/** The colour a theme's cards are drawn in: the Look's surface in `mode` when it is a hex, else `fallback` (the screen's card token as hex). */
export function cardColour(look: Look | undefined, mode: LookMode | undefined, fallback: string): string {
  if (!look) return fallback;
  try {
    const surface = resolveT1(look, mode ?? look.modes.supported[0]).surface;
    return contrastOf(surface, "#000000") === undefined ? fallback : surface;
  } catch {
    return fallback;
  }
}

/** Whether a card colour is light (its text goes dark). */
export const isLightCard = (card: string): boolean => (contrastOf(card, "#ffffff") ?? 21) < (contrastOf(card, "#000000") ?? 21);

export interface AccentReadout {
  ratio: number;
  /** Under the text minimum on the card. */
  low: boolean;
  /** The sentence under the swatches. */
  text: string;
}

/** "2.0:1 on Field Kit's cards, too low for text. Text in this colour uses a darker shade, 4.6:1"; undefined when either colour has no ratio. */
export function accentReadout(accent: string | undefined, card: string, themeName: string): AccentReadout | undefined {
  const ratio = accent ? contrastOf(accent, card) : undefined;
  if (accent === undefined || ratio === undefined) return undefined;
  const head = `${ratio.toFixed(1)}:1 on ${themeName}'s cards`;
  if (ratio >= TEXT_MIN) return { ratio, low: false, text: `${head}, fine for text` };
  if (!isLightCard(card)) return { ratio, low: true, text: `${head}, too low for text. Pick a lighter colour` };
  const ink = accentInk(accent, card, TEXT_MIN);
  const inkRatio = contrastOf(ink, card);
  return { ratio, low: true, text: `${head}, too low for text. Text in this colour uses a darker shade${inkRatio === undefined ? "" : `, ${inkRatio.toFixed(1)}:1`}` };
}

/** A colour's ratio on the card, one decimal ("4.6:1"); "" when it has none. */
export function ratioText(colour: string | undefined, card: string): string {
  const r = colour ? contrastOf(colour, card) : undefined;
  return r === undefined ? "" : `${r.toFixed(1)}:1`;
}

/** The lowest ratio of several colours on the card, as text ("3.5:1"). */
export function lowestRatioText(colours: readonly (string | undefined)[], card: string): string {
  const ratios = colours.flatMap((c) => (c ? (contrastOf(c, card) ?? []) : []));
  return ratios.length === 0 ? "" : `${Math.min(...ratios).toFixed(1)}:1`;
}

export interface RoleRow {
  id: "accent" | "text" | "secondary" | "status" | "series";
  label: string;
  /** The colours in the row (a series colour a level has not set is left out: each widget draws its own). */
  swatches: string[];
  /** The ratio on the card ("4.6:1"); the lowest of a status row; none for series (they are graph colours). */
  ratio: string;
  /** The setting keys a dot's Reset clears. */
  keys: readonly string[];
}

const hexOf = (v: unknown): string | undefined => (typeof v === "string" && contrastOf(v, "#000000") !== undefined ? v : undefined);

/**
 * The Colours section's role rows: each colour as the level shows it (its own value, else the theme's) with its ratio on
 * the theme's cards. `value` reads a setting of the level; `look` and `mode` give the theme's own.
 */
export function colourRoles(look: Look | undefined, mode: LookMode | undefined, value: (key: string) => unknown, card: string): RoleRow[] {
  let t1: Partial<Record<string, string>> = {};
  try {
    if (look) t1 = resolveT1(look, mode ?? look.modes.supported[0]);
  } catch {
    t1 = {};
  }
  const pick = (key: string, own: string): string | undefined => hexOf(value(key)) ?? hexOf(t1[own]);
  const accent = pick("accent", "accent");
  const text = pick("textColor", "fg");
  const secondary = pick("mutedColor", "fg-2");
  const status = (["ok", "warn", "crit"] as const).map((k) => pick(k, k));
  const series = ["s1", "s2", "s3", "s4", "s5", "s6"].flatMap((k) => hexOf(value(k)) ?? []);
  const one = (id: RoleRow["id"], label: string, colour: string | undefined, keys: string[]): RoleRow => ({ id, label, swatches: colour ? [colour] : [], ratio: ratioText(colour, card), keys });
  return [
    one("accent", "Accent", accent, ["accent"]),
    one("text", "Text", text, ["textColor"]),
    one("secondary", "Secondary text", secondary, ["mutedColor"]),
    { id: "status", label: "OK · warning · critical", swatches: status.flatMap((c) => c ?? []), ratio: lowestRatioText(status, card), keys: ["ok", "warn", "crit"] },
    { id: "series", label: "Series 1–6", swatches: series, ratio: "", keys: ["s1", "s2", "s3", "s4", "s5", "s6"] },
  ];
}
