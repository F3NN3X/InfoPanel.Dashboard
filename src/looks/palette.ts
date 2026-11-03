// Base colours more than one place needs: the default accent and the dark surfaces' text.
export const DEFAULT_ACCENT = "#34d399";
/** DEFAULT_ACCENT as r, g, b (tests/looks/palette.test.ts keeps the two equal). */
export const DEFAULT_ACCENT_RGB: [number, number, number] = [52, 211, 153];

/** Text on a dark surface: the widgets' --w-fg and --w-muted. */
export const DARK_TEXT = { fg: "#f4f4f5", muted: "#a1a1aa" } as const;
