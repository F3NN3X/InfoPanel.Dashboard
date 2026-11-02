// Whether a mixer widget's audiocn view (strips or the LCD) fits its zone, and how it fills it. Strips step down a size
// (lg, default, sm), then tighten their padding and gaps, then go bare (no scale, status line or icon, the readout as text
// where the LCD has no room) before any channel is left out; the LCD sizes its text to the zone. A view that can't fit one channel falls back to the rows view; one that can't fit them all at its smallest
// shows fewer and counts the rest.

export type MixerView = "rows" | "strips" | "lcd";
export type MixerSize = "sm" | "default" | "lg";

export interface MixerFitInput {
  view: MixerView;
  vertical: boolean;
  /** The body's size, px. */
  w: number;
  h: number;
  /** Strips or LCD lines to place, masters included. */
  count: number;
  /** How many of them are masters (drawn after a separator). */
  masters: number;
  /** The strips' size the user picked (the fader's thumb and track): the largest the fit uses. */
  size: MixerSize;
  /** What a strip draws besides its name and fader. */
  meter: boolean;
  /** Width of the meter in a vertical strip, px (an L/R pair is wider than one ladder). */
  meterW: number;
  fader: boolean;
  /** The faders take input (a thumb); a read-only one is only its track. */
  writable: boolean;
  /** The controls row's height, px: mute buttons, mute marks or route dots (0 = none drawn). */
  controls: number;
  scale: boolean;
  console: boolean;
  /** The LCD readout (a strip's), or the LCD view's least text size. */
  lcd: boolean;
  lcdSize: MixerSize;
  /** The widest readout, in characters ("100%" is 4, "−60.0" 5). */
  chars: number;
  /** The longest channel name, in characters (the LCD view's labels). */
  nameChars: number;
}

export interface MixerFit {
  view: MixerView;
  /** Strips or lines drawn: the first n of the list. */
  n: number;
  /** The ones left out, counted on a "+n" mark. */
  more: number;
  /** A strip keeps its LCD (a short zone drops it before it drops the view). */
  lcd: boolean;
  /** The strips' size after stepping down. */
  size: MixerSize;
  /** Tight padding and gaps. */
  dense: boolean;
  /** Dense, and no scale, status line or icon: the last step before channels are left out. */
  bare: boolean;
  /** The gap between strips, px. */
  gap: number;
  /** A vertical strip's width, or an LCD column's, px. */
  stripW: number;
  /** The LCD view's text size, px. */
  font: number;
  /** The LCD view's rows of columns (horizontal: 1 or 2). */
  rows: number;
}

export const MIXER_GAP = 8;
/** The tight gap and padding of a dense mixer. */
export const DENSE_GAP = 4;
const PAD = 16;
const DENSE_PAD = 8;
/** Between a vertical strip's meter, scale and track (dense: half). */
const GAP_X = 8;
const GAP_Y = 6;
const THUMB: Record<MixerSize, number> = { sm: 12, default: 16, lg: 20 };
/** A read-only fader's track, with no thumb (audiocn's track sizes). */
const TRACK: Record<MixerSize, number> = { sm: 3, default: 4, lg: 6 };
const SMALLER: Record<MixerSize, MixerSize | null> = { lg: "default", default: "sm", sm: null };
/** The LCD's text size, px, and its frame: the bezel and the screen's padding, both sides. */
const LCD_TEXT: Record<MixerSize, number> = { sm: 14, default: 18, lg: 24 };
const LCD_FRAME_W = 20;
const LCD_FRAME_H = 16;
/** A mono character with the LCD's letter spacing, in em. */
const LCD_CHAR = 0.68;
/** The LCD view's line pitch in em (the text and its padding), the biggest text it grows to, and its least width. */
const LCD_LINE = 1.5;
const LCD_MAX_TEXT = 48;
const LCD_VIEW_MIN_W = 120;
/** The LCD separator before the masters (one dot pitch and its line's share). */
const LCD_SEP = 4;
/** The DbScale's labels beside a vertical fader. */
const SCALE_LABELS_W = 28;
/** The name and its status line. */
const HEADER_H = 34;
/** A horizontal DbScale's labels and its gap to the track. */
const SCALE_H = 16 + 8;
const FADER_MIN_H = 56;
/** A row strip: its header line, a meter line, the fader line; the header moves beside them from 576px (audiocn's @xl). */
const ROW_WIDE = 576;
const ROW_MIN_W = 200;
/** Below the row strips: room for the last fader's touch area. */
const ROWS_PAD = 4;
/** What a roomy row strip's parts add past their sizes (the badge's border, the scale's margins); a dense one measures exact. */
const ROW_SLACK = 8;
/** The "+n" mark. */
const MORE_W = 28;
const MORE_H = 18;

const ROWS: MixerFit = { view: "rows", n: 0, more: 0, lcd: false, size: "default", dense: false, bare: false, gap: MIXER_GAP, stripW: 0, font: 0, rows: 1 };

/** A strip's density: its size, whether padding and gaps are tight, and whether the scale and status line are gone. */
export interface Step {
  size: MixerSize;
  dense: boolean;
  bare: boolean;
}

/** The densities to try, largest first: the picked size, each smaller one, the smallest made tight, then bare. */
export function stepsFrom(size: MixerSize): Step[] {
  const steps: Step[] = [];
  for (let s: MixerSize | null = size; s; s = SMALLER[s]) steps.push({ size: s, dense: false, bare: false });
  return [...steps, { size: "sm", dense: true, bare: false }, { size: "sm", dense: true, bare: true }];
}
const TIGHTEST: Step = { size: "sm", dense: true, bare: true };
/** A bare strip's header (the name alone: a bare strip drops its icon too), and the readout as text. */
const TITLE_H = 18;
const TEXT_H = 16;

/** The separator before the masters: a line between two gaps. */
const sepOf = (f: MixerFitInput, gap: number) => (f.masters > 0 && f.masters < f.count ? 1 + 2 * gap : 0);

/** The LCD's outer size for `chars` characters at a text size. */
export const lcdBox = (size: MixerSize, chars: number): { w: number; h: number } => ({ w: Math.ceil(chars * LCD_TEXT[size] * LCD_CHAR) + LCD_FRAME_W, h: LCD_TEXT[size] + LCD_FRAME_H });

/** How many of `count` items of `item` px fit `room` px, `gap` apart, keeping `more` px for a "+n" mark when not all do. */
function fitCount(room: number, item: number, gap: number, count: number, more: number): { n: number; more: number } {
  const all = Math.floor((room + gap) / (item + gap));
  if (all >= count) return { n: count, more: 0 };
  const n = Math.max(0, Math.floor((room - more + gap) / (item + gap)));
  return { n, more: count - n };
}

type Parts = Pick<MixerFitInput, "meter" | "meterW" | "fader" | "writable" | "controls" | "scale" | "console" | "lcd" | "lcdSize" | "chars">;

/** The fader across its travel: the thumb (a console cap is wider), or a read-only fader's track. */
const knob = (f: Parts, step: Step, vertical: boolean) => (!f.writable ? TRACK[step.size] : f.console && vertical ? Math.round(THUMB[step.size] * 1.8) : THUMB[step.size]);

/** A vertical strip's least width at a density: the meter, the fader and its scale side by side, or the LCD if wider. */
export function stripWidth(f: Parts, step: Step): number {
  const pad = step.dense ? DENSE_PAD : PAD,
    gap = step.dense ? GAP_X / 2 : GAP_X;
  const parts = (f.meter ? f.meterW + gap : 0) + (f.fader ? knob(f, step, true) + (f.scale && !step.bare ? SCALE_LABELS_W + gap : 0) : 0);
  return Math.max(pad + parts + 2 * gap, f.lcd ? pad + lcdBox(f.lcdSize, f.chars).w : 0, 56);
}

/** A row strip's least height at a density (`lcd`: its readout is the LCD, else text). */
export function rowHeight(f: Parts & Pick<MixerFitInput, "w">, step: Step): number {
  const line = (f.meter ? 8 + GAP_Y : 0) + (f.fader ? knob(f, step, false) + (f.scale && !step.bare ? SCALE_H : 0) : 0);
  const body = Math.max(line, f.lcd ? lcdBox(f.lcdSize, f.chars).h : TEXT_H, f.controls);
  const header = step.bare ? TITLE_H : HEADER_H;
  return (step.dense ? DENSE_PAD : PAD + ROW_SLACK) + (f.w >= ROW_WIDE ? Math.max(body, header) : header + GAP_Y + body);
}

/** A vertical strip's least height at a density, without and with its LCD. */
const columnHeight = (f: Parts, step: Step) => (step.dense ? DENSE_PAD : PAD) + (step.bare ? TITLE_H : HEADER_H) + GAP_Y + FADER_MIN_H + (f.controls ? GAP_Y + f.controls : 0);

function fitStrips(f: MixerFitInput): MixerFit {
  const steps = stepsFrom(f.size);
  const at = (step: Step, n: number, more: number, lcd: boolean, stripW = 0): MixerFit => ({ ...ROWS, view: "strips", n, more, lcd, size: step.size, dense: step.dense, bare: step.bare, gap: step.dense ? DENSE_GAP : MIXER_GAP, stripW });
  const lcdH = lcdBox(f.lcdSize, f.chars).h + GAP_Y;
  if (f.vertical) {
    if (columnHeight(f, TIGHTEST) > f.h) return ROWS;
    // the first density where every strip fits; a short zone drops the LCD before the size steps down, and a bare
    // strip drops it before a channel goes
    for (const step of steps) {
      if (columnHeight(f, step) > f.h) continue;
      const gap = step.dense ? DENSE_GAP : MIXER_GAP;
      const room = f.w - sepOf(f, gap);
      const tall = f.lcd && columnHeight(f, step) + lcdH <= f.h;
      for (const lcd of step.bare && tall ? [true, false] : [tall]) {
        const min = stripWidth({ ...f, lcd }, step);
        if (f.count * min + (f.count - 1) * gap <= room) return at(step, f.count, 0, lcd, Math.floor((room - (f.count - 1) * gap) / f.count));
      }
    }
    // the bare strips with text readouts still leave some out
    const room = f.w - sepOf(f, DENSE_GAP);
    const { n, more } = fitCount(room, stripWidth({ ...f, lcd: false }, TIGHTEST), DENSE_GAP, f.count, MORE_W);
    return n < 1 ? ROWS : at(TIGHTEST, n, more, false, Math.floor((room - MORE_W - DENSE_GAP * n) / n));
  }
  if (f.w < ROW_MIN_W) return ROWS;
  const wideEnough = f.w >= ROW_MIN_W + lcdBox(f.lcdSize, f.chars).w;
  for (const step of steps) {
    const gap = step.dense ? DENSE_GAP : MIXER_GAP;
    for (const lcd of step.bare ? [f.lcd && wideEnough, false] : [f.lcd && wideEnough]) {
      if (f.count * rowHeight({ ...f, lcd }, step) + (f.count - 1) * gap <= f.h - ROWS_PAD - sepOf(f, gap)) return at(step, f.count, 0, lcd);
    }
  }
  const { n, more } = fitCount(f.h - ROWS_PAD - sepOf(f, DENSE_GAP), rowHeight({ ...f, lcd: false }, TIGHTEST), DENSE_GAP, f.count, MORE_H);
  return n < 1 ? ROWS : at(TIGHTEST, n, more, false);
}

/** The LCD view's text size for a box: the most that fits, from the picked size up to `LCD_MAX_TEXT`; 0 = not even the picked size. */
const lcdFont = (base: number, ...limits: number[]): number => {
  const font = Math.floor(Math.min(LCD_MAX_TEXT, ...limits));
  return font >= base ? font : 0;
};

function fitLcd(f: MixerFitInput): MixerFit {
  const base = LCD_TEXT[f.lcdSize];
  const sep = f.masters > 0 && f.masters < f.count ? LCD_SEP : 0;
  const roomW = f.w - LCD_FRAME_W,
    roomH = f.h - LCD_FRAME_H - sep;
  if (f.vertical) {
    if (f.w < LCD_VIEW_MIN_W) return ROWS;
    // a line per channel: the name, two spaces, the value
    const font = lcdFont(base, roomH / f.count / LCD_LINE, roomW / ((f.nameChars + f.chars + 2) * LCD_CHAR));
    if (font) return { ...ROWS, view: "lcd", n: f.count, lcd: true, font };
    // the picked size, the names truncating, and the lines that fit
    const line = Math.ceil(base * LCD_LINE);
    const { n, more } = fitCount(roomH, line, 0, f.count, line);
    return n < 1 ? ROWS : { ...ROWS, view: "lcd", n, more, lcd: true, font: base };
  }
  // columns of a name over a value, on one row or, where the names need the width, two
  const fitRows = (rows: number) => {
    const cols = Math.ceil(f.count / rows);
    const colW = (roomW - (cols - 1) * MIXER_GAP) / cols;
    return { rows, cols, colW, font: lcdFont(base, colW / (Math.max(f.nameChars, f.chars) * LCD_CHAR), roomH / rows / (2 * LCD_LINE)) };
  };
  const best = [fitRows(1), fitRows(2)].sort((a, b) => b.font - a.font)[0];
  if (best.font) return { ...ROWS, view: "lcd", n: f.count, lcd: true, font: best.font, rows: best.rows, stripW: Math.floor(best.colW) };
  // the picked size: the values must fit their columns (the names truncate)
  const col = Math.ceil(f.chars * base * LCD_CHAR);
  const rows = Math.max(1, Math.min(2, Math.floor(roomH / (2 * LCD_LINE * base))));
  if (roomH < 2 * LCD_LINE * base) return ROWS;
  const perRow = Math.floor((roomW + MIXER_GAP) / (col + MIXER_GAP));
  const capacity = perRow * rows;
  if (capacity < 1) return ROWS;
  const n = capacity >= f.count ? f.count : capacity - 1;
  if (n < 1) return ROWS;
  return { ...ROWS, view: "lcd", n, more: f.count - n, lcd: true, font: base, rows, stripW: col };
}

/** The view a mixer draws and how much of it: the rows view (the widget's own layout) when nothing else fits. */
export function mixerFit(f: MixerFitInput): MixerFit {
  if (f.view === "rows" || f.count < 1 || f.w <= 0 || f.h <= 0) return ROWS;
  return f.view === "lcd" ? fitLcd(f) : fitStrips(f);
}

/**
 * The scale ticks a fader `len` px long can label with `gap` px between them: the ends first, then the rest from the
 * top. audiocn's own thinning only hides labels, so the hidden marks would still crowd a short scale. 0 px (not yet
 * measured) keeps them all.
 */
export function thinTicks(ticks: readonly number[], toPosition: (v: number) => number, len: number, gap: number): number[] {
  const sorted = [...new Set(ticks)].sort((a, b) => b - a);
  if (len <= 0) return sorted;
  const order = sorted.length > 1 ? [sorted[0], sorted[sorted.length - 1], ...sorted.slice(1, -1)] : sorted;
  const kept: number[] = [];
  for (const t of order) if (kept.every((k) => Math.abs(toPosition(t) - toPosition(k)) * len >= gap)) kept.push(t);
  return kept.sort((a, b) => b - a);
}
