// The sample themes' colours (T1 tokens, accent, text and status colours) and what each leaves out of its mockup
// (docs/look-system/mockups/). The cards are in `sample-materials.ts`; this file is studio-only data (the Theme editor
// loads it on demand), the kiosk reads the values the applied theme saved into the config. Names are working titles (G5).
import type { PageBackground } from "@/lib/appearance";
import type { Colours } from "@/lib/screen-templates/designs/ports";

export interface SampleTheme {
  /** The id; the card is `look-<id>` (`sample-materials.ts`) and the built-in preset `builtin:look-<id>`. */
  id: string;
  name: string;
  blurb: string;
  /** The card's palette: its face, text, secondary text, tracks and hairlines (`bg` is the card's face too, the page is `page`). */
  colours: Colours;
  accent: string;
  /** Status colours the mockup sets; the rest are the mode's own (`STATUS_MODE`, L33). A Look carries them as the palette roles `ok`, `warn`, `crit`. */
  status?: { ok?: string; warn?: string; crit?: string; info?: string };
  /** Text colours on the card, when they are not `colours`' own. */
  text?: string;
  muted?: string;
  /** An id of the font catalog (`lib/fonts.ts`). */
  font: string;
  radius: number;
  page: PageBackground;
  /** Other look keys the theme sets (the number glow). */
  extra?: Record<string, string | number | boolean>;
  /** The mockup this follows; what it shows that level 1 cannot (the owner phase is in the progress ledger). */
  mockup: string;
  missing: string;
}

const gradient = (from: string, to: string, angle: number): PageBackground => ({ type: "gradient", gradient: { from, to, angle } });
const color = (c: string): PageBackground => ({ type: "color", color: c });

export const SAMPLE_THEMES: readonly SampleTheme[] = [
  {
    id: "field-kit", name: "Field Kit", blurb: "Cream paper cards on a dark scene, ink text, amber accent",
    colours: { bg: "#EFE8D8", fg: "#1A1C21", card: "#EFE8D8", sub: "#5E5A52", line: "#D3C9B3" },
    accent: "#946400", font: "oswald", radius: 0.375,
    status: { warn: "#8A5A00", crit: "#A8340F" },
    page: gradient("#22252B", "#0B0C0E", 160),
    mockup: "FieldKit.html", missing: "dark tab-label header, segmented rings and bars, corner rarity tint, contour and hazard-strip page layers, vignette, condensed caps type",
  },
  {
    id: "tape-86", name: "Tape '86", blurb: "Warm paper with a dotted grain, a hard ink edge, stripe-band orange",
    colours: { bg: "#F3EDDD", fg: "#2A2523", card: "#F3EDDD", sub: "#5C5248", line: "#DDD3BC" },
    accent: "#C2410C", font: "archivo", radius: 0.25,
    status: { warn: "#8A5A00" },
    page: color("#E4DCC6"),
    mockup: "Tape86.html", missing: "stamped frame with the hard offset shadow, top-band ornament, label-bar header, rainbow stripe page layers, grain overlay, chunky display numbers",
  },
  {
    id: "neon-stripe", name: "Neon Stripe", blurb: "Near-black translucent cards, yellow numbers, teal labels, green sparklines",
    colours: { bg: "#0D0B14", fg: "#F2F0FA", card: "#0D0B14", sub: "#7FD9D4", line: "#1C1928" },
    text: "#F7C51E", muted: "#7FD9D4",
    accent: "#2BD46F", font: "chakra-petch", radius: 0,
    page: color("#0D0B14"),
    mockup: "NeonStripe.html", missing: "red bracket-line header, tick rings, glowing neon stripe page layers, mono type for labels, light-weight numbers",
  },
  {
    id: "overdrive", name: "Overdrive", blurb: "Black cards with a yellow edge, cyan numbers, red status",
    colours: { bg: "#110F14", fg: "#EDEBF2", card: "#110F14", sub: "#C9C27A", line: "#24222A" },
    text: "#2DE2E6", muted: "#C9C27A",
    accent: "#F3E600", font: "rajdhani", radius: 0,
    page: color("#0A0A0C"),
    mockup: "Overdrive.html", missing: "chamfer frame and angled label-bar header, chromatic number effect, segmented rings and bars, red grid, skewed yellow block and barcode page layers",
  },
  {
    id: "swiss-mono", name: "Swiss Mono", blurb: "Charcoal, one hairline per card, light type, a single orange accent",
    colours: { bg: "#141414", fg: "#F2F0EB", card: "#141414", sub: "#9A968D", line: "#2E2D2A" },
    accent: "#FF4D2E", font: "inter", radius: 0,
    page: color("#141414"),
    mockup: "Swiss.html", missing: "index headers (01 -), huge light-weight numbers, 2 px bars, the accent circle page layer, the hero band layout (a page template)",
  },
  {
    id: "term", name: "Term", blurb: "Phosphor green on black, scanlines, a green hairline, glowing text",
    colours: { bg: "#0A0D0A", fg: "#C6FFBA", card: "#0A0D0A", sub: "#6FA463", line: "#1C3A17" },
    text: "#8BE37A", muted: "#6FA463",
    accent: "#8BE37A", font: "ibm-plex-mono", radius: 0.125,
    page: color("#0A0D0A"), extra: { numGlow: "soft" },
    mockup: "Term.html", missing: "box-legend frame with the title set into the border, blocks bars, pixel display numbers, page scanlines and vignette, the bottom status bar",
  },
  {
    id: "holo", name: "Holo", blurb: "Deep blue HUD panels with corner brackets, ice-blue type, amber warnings",
    colours: { bg: "#061621", fg: "#EAF9FF", card: "#061621", sub: "#7FA6B8", line: "#0B2A3E" },
    accent: "#4FD8FF", font: "orbitron", radius: 0.125,
    page: gradient("#0B2A3E", "#020810", 180),
    mockup: "Holo.html", missing: "concentric glowing rings, elbow connectors, range-ring page layer, the radial cluster layout (a page template)",
  },
  {
    id: "night-glow", name: "Night Glow", blurb: "Blurred navy glass with a cyan edge glow and violet bloom",
    colours: { bg: "#0E1230", fg: "#F2F4FF", card: "#0E1230", sub: "#9AA3D6", line: "#232A5C" },
    accent: "#3EE6FF", font: "outfit", radius: 1,
    page: gradient("#1B2A7A", "#070920", 160),
    mockup: "NightGlow.html", missing: "the gradient border (cyan to violet to pink), gradient hero number and ring, segmented ring, 18 px corners on every widget",
  },
  {
    id: "paper", name: "Paper", blurb: "White cards with a warm hairline on an off-white page, purple accent",
    colours: { bg: "#FFFFFF", fg: "#1F1B2E", card: "#FFFFFF", sub: "#6B6578", line: "#ECE7F7" },
    accent: "#5B3FD4", font: "inter", radius: 0.875,
    status: { warn: "#A14A00", info: "#2F6FE0" },
    page: color("#F4F1EC"),
    mockup: "Paper.html", missing: "the hex pattern page layer, gradient hero number, mono labels, the accent outline on the focused card",
  },
  {
    id: "classy-black", name: "Classy Black", blurb: "Solid black cards with a hairline edge and light type",
    colours: { bg: "#050505", fg: "#F5F5F4", card: "#050505", sub: "#A3A3A3", line: "#1F1F1F" },
    accent: "#D4D4D8", font: "geist", radius: 0.25,
    page: color("#000000"),
    mockup: "(no board: the Hyprtile reference in 03-theme-packs-spec.md)", missing: "thin-weight numbers (a Value weight the theme does not set yet)",
  },
  {
    id: "liquid-glass", name: "Liquid Glass", blurb: "Frosted rose-violet glass at the full 24 px blur over an ambient page",
    colours: { bg: "#1F1C2A", fg: "#F8F4FF", card: "#1F1C2A", sub: "#BDB4D4", line: "#3A3350" },
    accent: "#F5A3C7", font: "manrope", radius: 1,
    page: gradient("#3B2350", "#0F1B2D", 150),
    mockup: "(no board: the Hyprtile reference in 03-theme-packs-spec.md)", missing: "the tinted, blurred ambient background image behind the glass (a page background image)",
  },
  {
    id: "black-and-gold", name: "Black and Gold", blurb: "Warm black cards with a gold edge and glow, gold accent",
    colours: { bg: "#12100A", fg: "#F4EBD0", card: "#12100A", sub: "#B7A97C", line: "#2B2410" },
    accent: "#D4AF37", font: "manrope", radius: 0.5,
    page: color("#060503"),
    mockup: "(no board: the Hyprtile reference in 03-theme-packs-spec.md)", missing: "gold gradient on the gauge arcs (a ring gradient fill)",
  },
];

/** The widget-style values a sample Look sets under its level's own (L40): its card, accent, text colours, font and extras. */
export const sampleStyle = (t: SampleTheme): Record<string, string | number | boolean> => ({
  surface: `look-${t.id}`,
  accent: t.accent,
  textColor: t.text ?? t.colours.fg,
  mutedColor: t.muted ?? t.colours.sub,
  ...(t.status?.ok ? { ok: t.status.ok } : null),
  ...(t.status?.warn ? { warn: t.status.warn } : null),
  ...(t.status?.crit ? { crit: t.status.crit } : null),
  font: t.font,
  ...t.extra,
});
