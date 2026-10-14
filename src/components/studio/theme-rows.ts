import { THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { matchesQuery } from "./settings-model";

export type TokenRow = [keyof ThemeTokens, string];

/** Tokens with an editor row; the first six are always shown (DECISIONS.md #8), the rest are Advanced. */
export const VISIBLE_TOKENS: TokenRow[] = [
  ["primary", "Primary"],
  ["accent", "Accent"],
  ["background", "Background"],
  ["foreground", "Foreground"],
  ["card", "Card"],
  ["card-foreground", "Card text"],
];

export const ADVANCED_TOKENS: TokenRow[] = [
  ["primary-foreground", "Primary text"],
  ["secondary", "Secondary"],
  ["muted", "Muted"],
  ["muted-foreground", "Muted text"],
  ["destructive", "Destructive"],
  ["border", "Border"],
  ["ring", "Ring"],
];

export interface ThemeRows {
  /** A search names at least one row: list just those (advanced ones included). */
  filtering: boolean;
  preset: boolean;
  visible: TokenRow[];
  advanced: TokenRow[];
}

/**
 * The theme rows to list for an inspector search. A search that names a row lists just
 * those rows; one that names none (or only the section) lists every row.
 */
export function themeRows(query: string): ThemeRows {
  const matched = {
    preset: matchesQuery(["Theme", ...THEME_PRESETS.map((p) => p.label)], query),
    visible: VISIBLE_TOKENS.filter(([, label]) => matchesQuery([label], query)),
    advanced: ADVANCED_TOKENS.filter(([, label]) => matchesQuery([label], query)),
  };
  const filtering =
    query.trim() !== "" &&
    (matched.preset || matched.visible.length + matched.advanced.length > 0);
  return filtering
    ? { filtering, ...matched }
    : { filtering, preset: true, visible: VISIBLE_TOKENS, advanced: ADVANCED_TOKENS };
}
