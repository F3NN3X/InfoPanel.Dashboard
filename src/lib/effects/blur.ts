/**
 * Frosted glass, one definition for both editors: the blur radius of whatever sits behind a card.
 * Native panels and canvas cards draw it live as a CSS `backdrop-filter`. InfoPanel can't blur what
 * is behind an item, so the export bakes the backdrop (the layers under the card, blurred) under
 * the card's own image: an approximation, since live values behind it are not in the baked picture.
 * Pure.
 */

export const BLUR_MIN = 1;
export const BLUR_MAX = 64;

/** A blur radius in px, whole; 0 for anything that is not a positive number (no blur). */
export const clampBlur = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0.5 ? Math.min(BLUR_MAX, Math.max(BLUR_MIN, Math.round(v))) : 0);

