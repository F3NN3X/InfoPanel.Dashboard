// A mixer widget's view options (the audiocn views, `core/mixer-views.tsx`), apart from the view so the registry can read
// them without loading audiocn.
import type { LcdDisplayAppearance, LcdDisplayVariant } from "@/components/ui/audiocn/lcd-display";
import type { MixerSize, MixerView } from "./mixer-fit";
import type { WidgetView } from "./types";

/** A mixer view's options, read from the widget's settings (`mixerLookOf`, `registry/audio-settings.ts`). */
export interface MixerLook {
  view: MixerView;
  vertical: boolean;
  stripVariant: "default" | "card" | "ghost";
  stripSize: MixerSize;
  /** The channel's colour tag along the strip's edge. */
  accent: boolean;
  icon: boolean;
  sub: boolean;
  /** A Live / Muted badge in the header. */
  status: boolean;
  meter: boolean;
  faderVariant: "default" | "console";
  /** The fill from the bottom of the track to the value. */
  range: boolean;
  scale: boolean;
  scaleLabels: boolean;
  scaleSide: "start" | "end";
  /** Scale ticks; none = the unit's own. */
  ticks?: number[];
  /** The fader law (a dB fader only). */
  taper: "linear" | "audio";
  /** Arrow-key step of a writable fader, in the fader's unit. */
  step: number;
  /** The mouse wheel moves a focused, writable fader. */
  wheel: boolean;
  /** A strip's LCD readout. */
  lcd: boolean;
  lcdVariant: LcdDisplayVariant;
  /** `auto` follows the widget's surface: a backlit screen on a light one, glowing ink on the others. */
  lcdAppearance: LcdDisplayAppearance;
  lcdSize: MixerSize;
  lcdMatrix: boolean;
  lcdScanlines: boolean;
  /** The status pixel: blinking while the source is live. */
  lcdStatus: boolean;
}

export const MIXER_LOOK: MixerLook = {
  view: "rows",
  vertical: true,
  stripVariant: "default",
  stripSize: "default",
  accent: true,
  icon: true,
  sub: true,
  status: false,
  meter: true,
  faderVariant: "default",
  range: true,
  scale: true,
  scaleLabels: true,
  scaleSide: "start",
  taper: "linear",
  step: 1,
  wheel: false,
  lcd: true,
  lcdVariant: "primary",
  lcdAppearance: "auto",
  lcdSize: "sm",
  lcdMatrix: true,
  lcdScanlines: true,
  lcdStatus: true,
};

/** The views every mixer widget offers; `rows` (the widget's own layout) first, the default. */
export const MIXER_VIEWS: WidgetView[] = [
  { id: "rows", name: "Rows", blurb: "A row per channel, as before" },
  { id: "strips", name: "Strips", blurb: "Console strips: fader, meter and LCD", tags: "console fader channel strip" },
  { id: "lcd", name: "LCD", blurb: "One LCD screen, a line per channel", tags: "display segment readout" },
];
