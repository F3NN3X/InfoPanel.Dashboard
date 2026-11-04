// The colours a worn pack gives the page's chrome, the island's pill and the alerts' cards (L25): the pack's own surface, text and edge,
// so a light pack does not carry a black pill. No blur: the page's 8 backdrop layers reserve one each for the island and an alert layer.
import type { CSSProperties } from "react";
import type { PanelDef } from "@/lib/panel-model";
import { hexToHsl } from "@/lib/theme";
import { contrastOf } from "@/looks/status";
import { resolveT1, type Look } from "./look";

/** A stack or grid panel on a pack Look (L67): the card's theme tokens and the check on an item's own colour. Built here so the entry carries none of it. */
export interface PackPanel {
  /** The theme tokens the card and its widgets read, re-scoped to the pack's surface, text, muted text and edge. */
  vars: CSSProperties;
  /** The overlay layout's title badge (the black tint without a pack). */
  badge: CSSProperties;
  /** The panel without the item colours that vanish on the pack's card (a white item on Paper). */
  legible: (panel: PanelDef) => PanelDef;
}

export interface PackChrome {
  fill: string;
  ink: string;
  edge: string;
  /** The Look's muted text (the panels' secondary text, L67). */
  muted: string;
  /** The Look's accent: the colour of the stage's glow (L81). */
  accent: string;
  panel: PackPanel;
}

const HEX6 = /^#[0-9a-f]{6}$/i;
/** The smallest contrast an item's own colour keeps against the pack's card before the pack's text replaces it. */
const OWN_COLOR_MIN = 3;

/** The panel's tokens are HSL triplets, so only the colours that are `#rrggbb` are taken; the overlay layout keeps the theme's (its text sits on a dark scrim). */
function panelOf(fill: string, ink: string, edge: string, muted: string): PackPanel {
  const tokens: [string, string][] = [["--card", fill], ["--foreground", ink], ["--card-foreground", ink], ["--muted-foreground", muted], ["--border", edge]];
  const lost = (color: string | undefined) => !!color && (contrastOf(color, fill) ?? OWN_COLOR_MIN) < OWN_COLOR_MIN;
  return {
    badge: { backgroundColor: fill, color: ink },
    vars: Object.fromEntries(tokens.filter(([, hex]) => HEX6.test(hex)).map(([name, hex]) => [name, hexToHsl(hex)])) as CSSProperties,
    legible: (panel) => (panel.widgets.some((w) => lost(w.color)) ? { ...panel, widgets: panel.widgets.map((w) => (lost(w.color) ? { ...w, color: undefined } : w)) } : panel),
  };
}

/** A pack's chrome from its Look's first supported mode. The loader sets it (`Pack.chrome`), so the kiosk entry never loads `resolveT1` for it; without a pack (Classic, a skin or a sample) the app keeps its own. */
export function chromeOf(look: Look): PackChrome {
  const t1 = resolveT1(look, look.modes.supported[0]);
  return { fill: t1.surface, ink: t1.fg, edge: t1.border, muted: t1.muted, accent: t1.accent, panel: panelOf(t1.surface, t1.fg, t1.border, t1.muted) };
}
