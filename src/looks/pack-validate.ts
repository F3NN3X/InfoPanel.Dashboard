// The pack validator (P12a): a theme pack as files in, a list of issues out. The loader (pack-load.ts) refuses a built pack
// whole; this reads the files a pack author or an importer holds (`pack.json`, `look.json`, `pack.css`, `icons.json`, the file
// list with sizes and bytes) before anything is built, and says which rule each problem breaks. An `error` refuses the pack;
// a `warn` is advice. It reuses the loader's readers (`packCssIssues`, `lintPackCss`, `stageIssues`, `iconSetIssues`) and adds
// the rules they cannot see from a built pack: the asset list against the files, fonts and licence, contrast per card,
// burn-in luminance, ornament and chamfer sizes, and CSS paint that hides content (L71).
//
// Where it runs: the studio (lazy chunk, when a pack is imported) and `tools/validate-pack.mjs` (pack authors, `npm run verify`
// reads the built-in packs through the tests). The server (Rust) does not run it; the server half, for P12b to build, is the
// path-safety check on `GET /api/packs/<id>/<file>` (`isPackRelativeUrl`'s rules) and the size caps (a file, a pack: `PACK_CEILING_BYTES`).
import { safeFill } from "@/widgets/core/t3-tokens";
import { parseCss, type Rule, type Token, tokenize, writeTokens } from "./css-syntax";
import { OVERLAY_MAX } from "./effects";
import { iconSetIssues } from "./icon-set";
import { resolveT1, type Look, type T1Name, T1_NAMES } from "./look";
import lookSchema from "./look.schema.json";
import { MAX_LAYERS, NUMERAL_MIN, numeralIssues, stageIssues } from "./pack-checks";
import { commaParts, lintPackCss, OPACITY_FLOOR } from "./pack-css";
import { INJECTION, jsonShapeIssues, jsonStrings, PROSE_PATHS, rasterMatches, STYLE_BREAKERS, svgIssue, svgPaints, TOKEN_KEY, withoutAliases } from "./pack-safety";
import packSchema from "./pack.schema.json";
import { cssUrls, isPackRelativeUrl, packCssIssues } from "./pack-urls";
import { schemaErrors } from "./schema-check";
import { contrastOf } from "./status";
import { T3_TOKENS } from "./t3";

export interface PackFile {
  /** Relative to the pack folder, `/` separated (`assets/hazard.svg`). */
  path: string;
  /** What the importer says the file holds; it must be a whole number and equal the bytes (the bytes decide). */
  size: number;
  /** Every content check (an SVG's markup, a font's signature, a licence's text, a layer's colours) reads these: a file without them is refused. */
  bytes?: Uint8Array;
}

/** A pack as its author holds it. `pack`, `look` and `icons` are the parsed JSON (unknown: they come from outside). */
export interface PackSource {
  pack: unknown;
  look: unknown;
  css?: string;
  icons?: unknown;
  /** Every file in the folder, the JSON files and the CSS included. */
  files: PackFile[];
}

export interface PackOptions {
  /**
   * `user` (the default) is a pack someone brought: level 1 and 2 of the spec, tokens, values, assets, an icon map and fonts, and no
   * `pack.css` (rule `user-css`). `builtin` is one of ours, whose CSS is read by the CSS rules and then checked in the browser
   * (`pack-visibility`, `pack-selectors`, `pack-faces`).
   */
  source?: "builtin" | "user";
}

export interface PackIssue {
  rule: string;
  severity: "error" | "warn";
  /** The file the issue is in (`pack.json`, `pack.css`, `assets/x.svg`), or "" for the pack as a whole. */
  file: string;
  message: string;
}

/** The size cap of a pack folder: `packCeilingBytes` of the `packs` block in tools/perf/budgets.json (a test pins them equal). */
export const PACK_CEILING_BYTES = 512_000;
/** An ornament is at most this many px and stays inside the card's padding (spec 03, rules for every slot). */
export const ORNAMENT_MAX = 10;
/** A pack folder holds at most this many files, and no file is over `FILE_MAX_BYTES`. */
export const FILE_COUNT_MAX = 64;
export const FILE_MAX_BYTES = 256_000;
/** A chamfer cuts at most this many px (twice the smallest card padding). */
export const CHAMFER_MAX = 20;
/** Body text, muted text and status text hold this on the card (D13); gradient numerals hold 3:1 (`NUMERAL_MIN`). */
export const TEXT_MIN = 4.5;
/** A layer this bright (relative luminance, times its opacity) is not `static-safe` on an always-on panel. */
export const BRIGHT_LAYER = 0.4;
/** Text the pack colours must show against what is behind it at least this much, or it is hidden. */
const HIDDEN_TEXT_MIN = 3;

const ASSET_TYPES = /\.(png|jpe?g|webp|avif|gif|svg|woff2)$/i;
const LICENCE_FILE = /^(OFL\.txt|LICENSE\.txt|LICENCE\.txt|LICENSE|OFL)$/;
const ROOT_FILES = /^(pack\.json|look\.json|pack\.css|icons\.json|LOOK\.md|README(\.md)?|thumb\.(avif|png|webp|jpe?g)|OFL\.txt|LICENSE\.txt|LICENCE\.txt|LICENSE|OFL)$/;
/** A path no file system or server should be asked for: a hidden file, a Windows device name, a trailing dot or space. */
const ODD_PATH = /(^|\/)\.|(^|\/)(con|prn|aux|nul|com\d|lpt\d)(\.|\/|$)|[. ]$/i;
const TEXT_PAIRS = ["fg", "fg-2", "muted", "ok", "warn", "crit", "accent"] as const;

const issue = (rule: string, file: string, message: string, severity: PackIssue["severity"] = "error"): PackIssue => ({ rule, severity, file, message });
const text = (b: Uint8Array) => new TextDecoder().decode(b);

/** The rule a URL breaks: the scheme it names, or `path` when it leaves the folder some other way. */
function urlRule(url: string): string {
  const u = url.trim().toLowerCase();
  if (/^(javascript|vbscript):/.test(u)) return "script-url";
  if (/^[a-z]:[\\/]/.test(u)) return "path";
  if (u.startsWith("data:")) return "data-url";
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/.test(u)) return "remote-url";
  return "path";
}

// ---- colours ----------------------------------------------------------------------------------------------------------

interface Colour {
  /** `#rrggbb` when the colour is a literal (hex, `rgb()` or `hsl()`). */
  hex?: string;
  alpha: number;
}

const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** `hsl()` as 0-255 channels. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + (((h % 360) + 360) % 360) / 30) % 12;
  const a = (Math.min(Math.max(s, 0), 100) / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => (l / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255;
  return [f(0), f(8), f(4)];
}

/** A CSS colour as written: hex (3, 4, 6, 8 digits), `rgb()`/`rgba()`, `hsl()`/`hsla()`, `transparent`; undefined for anything else (a name, `var()`, `oklch()`, `color-mix()`): the caller refuses what it cannot read. */
export function parseColour(value: string): Colour | undefined {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return { alpha: 0 };
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.exec(v)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    return { hex: `#${full.slice(0, 6)}`, alpha: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1 };
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!fn) return undefined;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  const a = parts[3];
  const alpha = a === undefined ? 1 : a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a);
  if (!Number.isFinite(alpha) || parts.length < 3 || parts.length > 4) return undefined;
  const channels = parts.slice(0, 3).map((p) => parseFloat(p));
  if (!channels.every(Number.isFinite)) return undefined;
  const [r, g, b] = fn[1].startsWith("hsl") ? hslToRgb(channels[0], channels[1], channels[2]) : parts.slice(0, 3).map((p, k) => (p.endsWith("%") ? (channels[k] * 255) / 100 : channels[k]));
  return { hex: `#${byte(r)}${byte(g)}${byte(b)}`, alpha: Math.max(0, Math.min(1, alpha)) };
}

/** A colour that is opaque and readable: its `#rrggbb`, else undefined. */
const opaqueHex = (value: string): string | undefined => {
  const c = parseColour(value);
  return c?.hex && c.alpha >= 1 ? c.hex : undefined;
};

/** A colour laid over `under` at `alpha` (0-1), as `#rrggbb`. */
function over(hex: string, alpha: number, under: string): string {
  const [a, b] = [hex, under].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  return `#${a.map((c, k) => byte(c * alpha + b[k] * (1 - alpha))).join("")}`;
}

/** Relative luminance of a `#rrggbb` (contrast against black, inverted: reuses the one colour maths of status.ts). */
const luminance = (hex: string): number => ((contrastOf(hex, "#000000") ?? 1) - 1) * 0.05;

/** Luminance times alpha of one colour as written (transparent: 0), or undefined when it cannot be read. */
function paintLuminance(value: string): number | undefined {
  const c = parseColour(value);
  return c ? (c.hex ? luminance(c.hex) * c.alpha : 0) : undefined;
}

const COLOUR_LITERAL = /#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{3,4}\b|(?:rgba?|hsla?)\([^)]*\)|\btransparent\b/gi;
const GRADIENT_WORDS = /\b(to|top|bottom|left|right|center|at|circle|ellipse|closest-side|farthest-side|closest-corner|farthest-corner|in|from)\b/gi;

/** The brightest stop of a CSS fill (a colour or gradients, layers comma-separated), each times its alpha; undefined when anything in it is not a colour literal or a gradient keyword (a name, `var()`, `oklch()`). */
function fillBrightness(css: string): number | undefined {
  const found = css.match(COLOUR_LITERAL) ?? [];
  const rest = css
    .replace(COLOUR_LITERAL, " ")
    .replace(/(repeating-)?(linear|radial|conic)-gradient\(/gi, " ")
    .replace(/-?\d*\.?\d+(deg|grad|rad|turn|px|%)?/gi, " ")
    .replace(GRADIENT_WORDS, " ");
  if (/[a-z]/i.test(rest)) return undefined;
  const lums = found.map(paintLuminance);
  return lums.some((l) => l === undefined) ? undefined : Math.max(0, ...(lums as number[]));
}

/** The brightest paint of an SVG (the default fill, black, counts as 0); undefined when a paint is not a colour literal. */
function svgBrightness(source: string): number | undefined {
  const lums = svgPaints(source).map(paintLuminance);
  return lums.some((l) => l === undefined) ? undefined : Math.max(0, ...(lums as number[]));
}

// ---- pack.css (built-in packs; a user pack has none) -----------------------------------------------------------------------

/** Declarations that move, turn or resize a box; the card is never rotated (spec 03, Layout). */
const ROTATION = /^(transform(-origin|-box|-style)?|rotate|scale|translate|perspective(-origin)?|offset-rotate|zoom|writing-mode)$/;
/** What a rule that reaches every element may paint: anything that compounds or covers is refused. */
const UNIVERSAL_OK = /^(font-family|font-feature-settings|color|text-shadow|caret-color|accent-color|text-decoration(-color|-style)?)$/;
const BG = /^background(-color)?$/;
/** Values that carry the surrounding colour instead of naming one. */
const KEEP = /^(currentcolor|inherit|initial|unset|revert|revert-layer)$/i;
/** A fill or stroke this close to the card's colour (contrast) is not seen. */
const SAME_AS_CARD = 1.2;
/** Filters, backdrop filters and blend modes a pack's CSS declares, in all (each is a compositing layer). */
const COMPOSITING_MAX = 4;
const COMPOSITING = /^(filter|backdrop-filter|-webkit-backdrop-filter|mix-blend-mode)$/;

/** The pack CSS's own rule for each message the loader's readers give. */
function cssRule(message: string): string {
  if (message === "@import") return "import";
  if (message.startsWith("url ")) return urlRule(message.slice(4));
  if (message.includes("!important")) return "no-important";
  const prop = /property ([\w-]+) is not a paint property/.exec(message)?.[1];
  if (prop) return ROTATION.test(prop) ? "no-rotation" : "paint-only";
  if (/reaches over|recolours|is over \d+ px|repeats runs/.test(message)) return "paint-cap";
  if (/hides or blurs|opacity|stroke-width/.test(message)) return "hides-content";
  if (message.includes("reaches outside")) return "selector";
  if (message.includes("must start with pack-")) return "font-face";
  if (message.includes("nested too deep")) return "css-syntax";
  if (/^(at-rule|keyframe|@keyframes)/.test(message)) return "paint-only";
  return "css-syntax";
}

interface Styled {
  rule: Rule;
  /** A keyframe's frame, which has no selector of its own. */
  frame: boolean;
}

/** Every style rule with its declarations, media and supports blocks flattened, and the frames of keyframes (a frame paints too); font faces are left out. */
function styledRules(rules: Rule[]): Styled[] {
  return rules.flatMap((r): Styled[] =>
    r.at === undefined ? [{ rule: r, frame: false }] : r.at === "media" || r.at === "supports" ? styledRules(r.rules ?? []) : r.at === "keyframes" ? (r.rules ?? []).map((f) => ({ rule: f, frame: true })) : []
  );
}

/**
 * Whether a selector can match more than the pack's own named parts: a `*`, a bare type (`div`, `svg`), `[class]` or any
 * attribute without a value, `:not()`, `:is()`, `:where()`, `:has()`, `:scope`. A part is named by a class, an id or an
 * attribute with a value (`[data-part="num"]`).
 */
function broadSelector(prelude: Token[]): boolean {
  return commaParts(prelude).some((part) => {
    let named = false;
    for (let k = 0; k < part.length; k++) {
      const t = part[k];
      if (t.t === "delim" && t.v === "*") return true;
      if (t.t === "delim" && t.v === "." && part[k + 1]?.t === "ident") named = true;
      if (t.t === "hash") named = true;
      if ((t.t === "ident" || t.t === "function") && part[k - 1]?.t === ":" && /^(not|is|where|has|scope|matches|-webkit-any|-moz-any)$/i.test(t.v)) return true;
      if (t.t === "[") {
        let end = k + 1;
        while (end < part.length && part[end].t !== "]") end++;
        if (part.slice(k, end).some((x) => x.t === "delim" && x.v === "=")) named = true;
        else return true;
      }
    }
    return !named;
  });
}

/** The rules of pack CSS that hide content with paint the lint (`lintPackCss`) reads one declaration at a time (L68, L71). `cards` are the cards' colours, `texts` the Look's text colours. */
function hiddenPaintIssues(css: string, cards: string[], texts: string[]): PackIssue[] {
  const out: PackIssue[] = [];
  const all = styledRules(parseCss(css, []));
  const literals = (v: string) => (v.match(COLOUR_LITERAL) ?? []).flatMap((c) => parseColour(c)?.hex ?? []);
  const bgs = all.flatMap(({ rule }) => (rule.declarations ?? []).filter((d) => BG.test(d.name)).flatMap((d) => literals(writeTokens(d.value))));
  let opacity = 1;
  let compositing = 0;
  for (const { rule, frame } of all) {
    const selector = frame ? `keyframe ${writeTokens(rule.prelude)}` : writeTokens(rule.prelude);
    const universal = !frame && broadSelector(rule.prelude);
    const decls = rule.declarations ?? [];
    const own = decls.filter((d) => BG.test(d.name)).flatMap((d) => literals(writeTokens(d.value)));
    const ownText = decls.some((d) => d.name === "color" || d.name === "-webkit-text-fill-color");
    for (const { name, value } of decls) {
      const v = writeTokens(value);
      const where = `"${selector.slice(0, 30)}"`;
      if (universal && !UNIVERSAL_OK.test(name)) out.push(issue("universal", "pack.css", `${name} on ${where} can reach every element of a card: a rule that does may set only text colour, font and text shadow`));
      if (COMPOSITING.test(name)) compositing++;
      if (/^(fill-|stroke-)?opacity$/.test(name) || (name === "filter" && /opacity\(/i.test(v))) {
        if (universal) out.push(issue("opacity-compound", "pack.css", `${name} on ${where} compounds down every element`));
        const a = parseFloat(/opacity\(([^)]*)\)/i.exec(v)?.[1] ?? v);
        if (Number.isFinite(a)) opacity *= Math.min(1, a);
      }
      if (name === "color" || name === "-webkit-text-fill-color") {
        const c = parseColour(v);
        if (KEEP.test(v)) continue;
        if (!c) out.push(issue("hidden-text", "pack.css", `${name} ${v} cannot be read as a colour: use #rgb, #rrggbb, rgb() or hsl()`));
        else if (c.alpha < OPACITY_FLOOR) out.push(issue("hidden-text", "pack.css", `${name} ${v} is transparent text`));
        else if (c.hex) {
          const behind = own.length ? own : [...bgs, ...cards];
          if (behind.length && !behind.some((b) => (contrastOf(c.hex!, b) ?? HIDDEN_TEXT_MIN) >= HIDDEN_TEXT_MIN)) out.push(issue("hidden-text", "pack.css", `${name} ${v} is under ${HIDDEN_TEXT_MIN}:1 on what is behind it`));
        }
      }
      if (name === "fill" || name === "stroke") {
        const c = parseColour(v);
        if (KEEP.test(v) || /^url\(/i.test(v)) continue;
        if (/^none$/i.test(v)) out.push(issue("hidden-gauge", "pack.css", `${name}: ${v} on ${where} paints a gauge, mark, text or icon away`));
        else if (!c) out.push(issue("hidden-gauge", "pack.css", `${name} ${v} cannot be read as a colour: use #rgb, #rrggbb, rgb() or hsl()`));
        else if (c.alpha < OPACITY_FLOOR) out.push(issue("hidden-gauge", "pack.css", `${name}: ${v} on ${where} paints a gauge, mark, text or icon away`));
        else if (c.hex && cards.some((card) => (contrastOf(c.hex!, card) ?? 99) < SAME_AS_CARD)) out.push(issue("hidden-gauge", "pack.css", `${name} ${v} on ${where} is the colour of the card it is on`));
      }
      if (BG.test(name) && !KEEP.test(v) && !/^none$/i.test(v)) {
        const c = parseColour(v);
        if (!c && !/url\(|gradient\(/i.test(v)) out.push(issue("hidden-text", "pack.css", `${name} ${v} cannot be read as a colour: use #rgb, #rrggbb, rgb() or hsl()`));
        else if (c?.hex && c.alpha >= OPACITY_FLOOR && !ownText) {
          const hidden = texts.find((t) => (contrastOf(c.hex!, t) ?? 99) < HIDDEN_TEXT_MIN);
          if (hidden) out.push(issue("hidden-text", "pack.css", `${name} ${v} on ${where} is under ${HIDDEN_TEXT_MIN}:1 against the text colour ${hidden}`));
        }
      }
    }
  }
  if (compositing > COMPOSITING_MAX) out.push(issue("paint-cap", "pack.css", `${compositing} filter, backdrop-filter and blend declarations, at most ${COMPOSITING_MAX}: each is a compositing layer`));
  if (opacity < OPACITY_FLOOR) out.push(issue("opacity-compound", "pack.css", `the opacities of the rules multiply to ${opacity.toFixed(2)}, under ${OPACITY_FLOOR}`));
  return out;
}

// ---- the Look ---------------------------------------------------------------------------------------------------------

const ALIAS = /^\{([\w.-]+)\}$/;
/** A T1 or T0 value: a colour literal or an alias. */
const colourOrAlias = (v: string) => ALIAS.test(v) || parseColour(v) !== undefined;
/** The corner radius: a length up to 64 px. */
const RADIUS = /^(0|\d+(\.\d+)?(px|rem|em))$/;
const BLUR = /^\d+(\.\d+)?px$/;
const BLUR_MAX = 64;
/** T3 values that are plain words, numbers, aliases and the operators between them (`soft`, `0.32 > 0.06 > 0`, `{faint} / 22%`): no parenthesis, no quote. */
const SIMPLE = /^[\w\s.%/>{}+,-]*$/;
const CUBIC = /^cubic-bezier\(\s*[\d.\s,-]+\)$/;
const MOTION = new Set(["motion-fast", "motion-base", "motion-data"]);
const MOTION_MAX_MS = 2000;
const LENGTH_T3 = new Set(["ring-width", "ring-gap", "icon-stroke", "threshold-width", "range-height", "meter-gap", "series-stroke"]);
const LENGTH_T3_MAX = 64;
/** T3 names that colour text: held to 4.5:1 on the surface when they resolve to a T1 colour. */
const TEXT_T3 = new Set(["status-ok", "status-warn", "status-crit", "info", "unit-color", "label-color", "header-color", "axis-label"]);
/** T3 names that colour a mark (a series, a meter zone, an icon): held to 3:1. */
const MARK_T3 = new Set(["series-1", "series-2", "series-3", "series-4", "series-5", "series-6", "meter-ok", "meter-warn", "meter-clip", "threshold-line", "spike-marker", "icon-color", "toggle-on", "live-indicator", "fader-fill", "range-fill", "mute-active", "solo-active"]);
const OTHER_COLOUR_T3 = new Set(["meter-track", "meter-hold", "range-track", "range-highlight", "fader-track", "fader-knob", "icon-muted", "ring-track", "track", "num-glow-color", "accent-ink", "idle", "mute"]);
/** T3 names that take a gradient or colour fill (`safeFill`); the numeral, ring and spark fills' stops are also read by `numeralIssues`. */
const FILL_T3 = new Set(["border-fill", "header-fill", "num-fill", "ring-fill", "spark-fill"]);

const T3_NAMES = new Set<string>(T3_TOKENS);

/** The T3 values: every name known, every value a plain word, a number, an alias, a colour literal or a gradient `safeFill` reads, lengths and times capped, colour tokens that hold text held to contrast on the resolved colour. */
function t3Issues(look: Look, t1: Record<T1Name, string>, mode: string): PackIssue[] {
  const out: PackIssue[] = [];
  const bad = (rule: string, message: string) => out.push(issue(rule, "look.json", message));
  for (const [name, v] of Object.entries(look.t3 ?? {})) {
    if (!T3_NAMES.has(name)) {
      bad("t3", `t3 ${name} is not a T3 name`);
      continue;
    }
    if (typeof v === "number") {
      if (!Number.isFinite(v) || Math.abs(v) > 1000 || (LENGTH_T3.has(name) && (v < 0 || v > LENGTH_T3_MAX))) bad("t3", `t3 ${name} ${v} is out of range${LENGTH_T3.has(name) ? ` (0 to ${LENGTH_T3_MAX})` : ""}`);
      continue;
    }
    if (FILL_T3.has(name)) {
      if (v !== "solid" && v !== "none" && safeFill(v) === undefined) bad("t3", `t3 ${name} is not a colour or a gradient of colours`);
      continue;
    }
    const colour = TEXT_T3.has(name) || MARK_T3.has(name) || OTHER_COLOUR_T3.has(name);
    if (colour && v !== "" && !ALIAS.test(v) && !parseColour(v) && !/^var\(--w-[\w-]+\)$/.test(v)) bad("t3", `t3 ${name} ${v} cannot be read as a colour: use #rgb, #rrggbb, rgb(), hsl() or an alias`);
    else if (!colour && !SIMPLE.test(v) && !CUBIC.test(v)) bad("t3", `t3 ${name} ${v.slice(0, 40)} is not a plain value`);
    if (MOTION.has(name)) {
      const ms = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(v);
      if (ms && Number(ms[1]) * (ms[2] === "s" ? 1000 : 1) > MOTION_MAX_MS) bad("t3", `t3 ${name} ${v} is over ${MOTION_MAX_MS} ms`);
    }
    if ((TEXT_T3.has(name) || MARK_T3.has(name)) && v !== "") {
      const alias = ALIAS.exec(v)?.[1];
      const resolved = alias === undefined ? v : (T1_NAMES as readonly string[]).includes(alias) ? t1[alias as T1Name] : undefined;
      if (resolved === undefined) continue;
      const min = TEXT_T3.has(name) ? TEXT_MIN : NUMERAL_MIN;
      const ratio = contrastOf(opaqueHex(resolved) ?? resolved, t1.surface);
      if (ratio === undefined) bad("contrast", `${mode} t3 ${name} ${v} cannot be checked: use #rgb or #rrggbb`);
      else if (ratio < min) bad("contrast", `${mode} t3 ${name} ${v} is ${ratio.toFixed(2)}:1 on the surface, under ${min}:1`);
    }
  }
  return out;
}

/** What each Look in the pack is drawn on: the surface and every material's flat colours (its export, its fill and fill-2 laid over the page by their alpha), per mode; a colour the check cannot read is an issue. */
function cardsOf(look: Look, t1: Record<string, string>, mode: string, issues: PackIssue[]): string[] {
  const cards = [t1.surface];
  const page = opaqueHex(t1.bg);
  for (const [name, m] of Object.entries(look.t2?.materials ?? {})) {
    for (const field of ["export", "fill", "fill-2"] as const) {
      const v = m[field];
      if (typeof v !== "string") continue;
      const c = parseColour(v);
      const alpha = (c?.alpha ?? 1) * (field === "export" ? 1 : (m["fill-alpha"] ?? 1));
      const flat = c?.hex ? (alpha >= 0.999 ? c.hex : page ? over(c.hex, alpha, page) : undefined) : undefined;
      if (flat) cards.push(flat);
      else issues.push(issue("contrast", "look.json", `${mode} material ${name} ${field} ${v} cannot be read: use #rgb, #rrggbb, rgb() or hsl() (over an opaque bg)`));
    }
    if (m.blur !== undefined && !(BLUR.test(m.blur) && parseFloat(m.blur) <= BLUR_MAX)) issues.push(issue("blur", "look.json", `material ${name} blur ${m.blur}: a length in px up to ${BLUR_MAX}`));
  }
  return [...new Set(cards)];
}

function lookIssues(look: Look): { issues: PackIssue[]; cards: string[]; texts: string[] } {
  const issues: PackIssue[] = [];
  const cards: string[] = [];
  const texts: string[] = [];
  for (const [k, v] of Object.entries(look.t0 ?? {})) if (!colourOrAlias(v)) issues.push(issue("colour", "look.json", `t0 ${k} ${v.slice(0, 40)} must be #rgb, #rrggbb, rgb(), hsl() or an alias`));
  if (!RADIUS.test(look.radius) || parseFloat(look.radius) * (look.radius.endsWith("px") ? 1 : 16) > 64) issues.push(issue("colour", "look.json", `radius ${look.radius}: a length up to 64 px`));
  for (const mode of look.modes.supported) {
    let t1: Record<string, string>;
    try {
      t1 = resolveT1(look, mode);
    } catch (e) {
      issues.push(issue("schema", "look.json", `${mode}: ${(e as Error).message}`));
      continue;
    }
    for (const name of T1_NAMES) if (!(TEXT_PAIRS as readonly string[]).includes(name) && name !== "surface" && !parseColour(t1[name])) issues.push(issue("colour", "look.json", `${mode} ${name} ${t1[name].slice(0, 40)} must be #rgb, #rrggbb, rgb() or hsl()`));
    // L93: the chrome (the island's pill, the alert cards) takes the surface verbatim, so it is a literal and opaque
    const surface = parseColour(t1.surface);
    if (!surface?.hex || surface.alpha < 1 || !/^#([\da-f]{3}|[\da-f]{6})$/i.test(t1.surface)) issues.push(issue("chrome-surface", "look.json", `${mode} surface ${t1.surface} must be an opaque #rgb or #rrggbb: the chrome and the contrast check read it as written`));
    for (const card of cardsOf(look, t1, mode, issues)) {
      cards.push(card);
      for (const name of TEXT_PAIRS) {
        const ratio = contrastOf(opaqueHex(t1[name]) ?? t1[name], card);
        if (ratio === undefined) issues.push(issue("contrast", "look.json", `${mode} ${name} ${t1[name]} on ${card} cannot be checked: use #rgb or #rrggbb`));
        else if (ratio < TEXT_MIN) issues.push(issue("contrast", "look.json", `${mode} ${name} ${t1[name]} is ${ratio.toFixed(2)}:1 on the card ${card}, under ${TEXT_MIN}:1`));
      }
    }
    for (const name of ["fg", "fg-2", "muted"] as const) {
      const hex = opaqueHex(t1[name]);
      if (hex) texts.push(hex);
    }
    issues.push(...t3Issues(look, t1 as Record<T1Name, string>, mode));
  }
  for (const m of numeralIssues(look)) issues.push(issue("contrast", "look.json", m));
  return { issues, cards: [...new Set(cards)], texts: [...new Set(texts)] };
}

// ---- the folder -------------------------------------------------------------------------------------------------------

type Pack = {
  id: string;
  modes: string[];
  fonts: { file: string; licence: string }[];
  stage: Parameters<typeof stageIssues>[0] & object;
  burnIn: string;
  assets?: { file: string; bytes: number }[];
  ornament?: { size: number; bleed?: boolean };
  edge?: { kind: string; cut?: number };
};

/** What is wrong with a pack, one issue each, errors before warnings (empty: it may load). A crash inside a rule is an issue, never an exception. */
export function validatePack(src: PackSource, options: PackOptions = {}): PackIssue[] {
  try {
    return validate(src, options.source ?? "user");
  } catch (e) {
    return [issue("internal", "", `the pack could not be read to the end (${(e as Error).name}: ${(e as Error).message.slice(0, 80)}): refused`)];
  }
}

function validate(src: PackSource, source: "builtin" | "user"): PackIssue[] {
  const user = source === "user";
  const out: PackIssue[] = [];
  const add = (rule: string, file: string, message: string, severity: PackIssue["severity"] = "error") => void out.push(issue(rule, file, message, severity));

  // the JSON's own shape first (the schema walker recurses): depth, size, prototype keys
  for (const [file, value] of [["pack.json", src.pack], ["look.json", src.look], ["icons.json", src.icons]] as const) for (const m of jsonShapeIssues(value)) add("json-shape", file, m);
  if (out.length) return finish(out);

  // schema
  const packErrors = schemaErrors(src.pack, packSchema as Record<string, unknown>, packSchema as Record<string, unknown>);
  const lookErrors = schemaErrors(src.look, lookSchema as Record<string, unknown>, lookSchema as Record<string, unknown>);
  for (const m of packErrors) add("schema", "pack.json", m);
  for (const m of lookErrors) add("schema", "look.json", m);
  // every string a Look or pack carries ends up in a style or a page: no URL function, script, import or tag, and in a Look no character that ends a declaration
  for (const [file, value] of [["pack.json", src.pack], ["look.json", src.look], ["icons.json", src.icons]] as const) {
    for (const [, str] of jsonStrings(value, PROSE_PATHS)) if (INJECTION.test(str) || (file === "look.json" && STYLE_BREAKERS.test(withoutAliases(str)))) add("injection", file, `the value ${str.slice(0, 40)} holds markup, a URL function or a character that ends a style rule`);
  }

  // material, tone and token keys are plain names
  const look0 = src.look as Look | undefined;
  for (const [group, obj] of [["materials", look0?.t2?.materials], ["tones", look0?.t2?.tones], ["t3", look0?.t3], ...Object.values(look0?.t2?.tones ?? {}).map((t) => ["tone", t] as const)] as [string, unknown][]) {
    if (obj && typeof obj === "object") for (const key of Object.keys(obj)) if (!TOKEN_KEY.test(key)) add("schema", "look.json", `${group} key ${key.slice(0, 30)} is not a plain name (a-z, 0-9, -)`);
  }

  // the folder: every file's size from its bytes, its own path, the caps, nothing outside the pack's shape
  const files = new Map<string, PackFile>();
  const lower = new Set<string>();
  let total = 0;
  if (src.files.length > FILE_COUNT_MAX) add("size", "", `${src.files.length} files, at most ${FILE_COUNT_MAX}`);
  for (const f of src.files) {
    const claimed = Number.isInteger(f.size) && f.size >= 0;
    if (!claimed) add("size", f.path, `size ${f.size} is not a whole number of bytes`);
    else if (f.bytes && f.bytes.length !== f.size) add("size", f.path, `is declared ${f.size} bytes and holds ${f.bytes.length}`);
    if (!f.bytes) add("content-unread", f.path, "the file's bytes were not given, so its content cannot be checked");
    const n = f.bytes?.length ?? (claimed ? f.size : 0);
    total += n;
    if (n > FILE_MAX_BYTES) add("size", f.path, `is ${n} bytes, over the ${FILE_MAX_BYTES} cap for a file`);
    files.set(f.path, { ...f, size: n });
    if (!isPackRelativeUrl(f.path)) add(urlRule(f.path), f.path, `file path ${f.path} leaves the pack folder`);
    else if (f.path.length > 120 || ODD_PATH.test(f.path) || lower.has(f.path.toLowerCase()) || (f.path.startsWith("assets/") && f.path.slice(7).includes("/"))) add("path", f.path, "a path that is too long, hidden, a device name, repeated, or in a folder of assets/");
    else if (f.path.startsWith("assets/")) {
      if (!ASSET_TYPES.test(f.path)) add("asset-type", f.path, "an asset is an image (png, jpg, webp, avif, gif, svg) or a woff2 font");
    } else if (!ROOT_FILES.test(f.path)) add("asset-extra", f.path, "not a file a pack has");
    lower.add(f.path.toLowerCase());
  }
  if (total > PACK_CEILING_BYTES) add("size", "", `the pack is ${total} bytes, over the ${PACK_CEILING_BYTES} cap`);

  if (packErrors.length || lookErrors.length) return finish(out);
  const pack = src.pack as Pack;
  const look = src.look as Look;
  if (look.id !== pack.id) add("id", "look.json", `look.id ${look.id} is not the pack id ${pack.id}`);
  if (pack.modes.join() !== look.modes.supported.join()) add("modes", "pack.json", "modes differ from look.json modes.supported");
  for (const key of T1_NAMES) for (const mode of look.modes.supported) if (!look.t1[mode]?.[key]) add("schema", "look.json", `${mode} ${key} is missing`);

  // referenced files: stage images, fonts, icons, CSS urls; each is a pack path and a file of the folder
  const referenced = new Map<string, string>();
  const resolve = (name: string, base: string) => {
    const path = name.replace(/[?#].*$/, "").replace(/^\.\//, "");
    return [base + path, path, `assets/${path}`].find((p) => files.has(p));
  };
  const refer = (from: string, name: string, base: string) => {
    if (!isPackRelativeUrl(name) || /["']/.test(name)) return void add(urlRule(name), from, `${name} is not a path inside the pack`);
    const found = resolve(name, base);
    if (!found) add("asset-missing", from, `${name} is not in the pack's files`);
    else referenced.set(found, from);
  };
  pack.stage.layers.forEach((l) => l.image !== undefined && refer("pack.json", l.image, "assets/"));
  pack.fonts.forEach((f) => refer("pack.json", f.file, "assets/"));
  if (!user && src.css !== undefined) for (const u of cssUrls(src.css)) refer("pack.css", u, "");

  // the asset list matches the files (a user pack must list every asset)
  const assets = [...files.keys()].filter((p) => p.startsWith("assets/"));
  if (!pack.assets && user && assets.length) add("asset-listed", "pack.json", "a pack with assets lists each in pack.json's assets: anything not listed is refused");
  if (pack.assets) {
    const listed = new Set<string>();
    for (const a of pack.assets) {
      const f = files.get(`assets/${a.file}`);
      listed.add(`assets/${a.file}`);
      if (!f) add("asset-listed", "pack.json", `${a.file} is listed and not in the pack's files`);
      else if (f.size !== a.bytes) add("asset-listed", "pack.json", `${a.file} is listed as ${a.bytes} bytes and is ${f.size}`);
    }
    for (const p of assets) if (!listed.has(p)) add("asset-listed", p, "not in pack.json's asset list: anything not listed is refused");
  }
  for (const p of assets) if (!referenced.has(p)) add("asset-unused", p, "nothing in the pack uses this file", "warn");

  // what each image and font file is, from its bytes (the extension is only a claim)
  for (const f of files.values()) {
    const ext = /\.([a-z0-9]+)$/i.exec(f.path)?.[1].toLowerCase();
    if (!f.bytes || !ext || !(f.path.startsWith("assets/") ? ASSET_TYPES.test(f.path) : /^thumb\./.test(f.path))) continue;
    if (ext === "svg") {
      const m = svgIssue(text(f.bytes));
      if (m) add("svg-unsafe", f.path, m);
    } else if (ext === "woff2") {
      if (text(f.bytes.subarray(0, 4)) !== "wOF2") add("font-type", f.path, "the file is not a woff2 font (wrong signature)");
    } else if (!rasterMatches(ext, f.bytes)) add("image-type", f.path, `the bytes are not a ${ext} image`);
  }

  // fonts: woff2 with a licence file (OFL) and a copyright line
  const licence = [...files.values()].find((f) => LICENCE_FILE.test(f.path));
  if (pack.fonts.length && !licence) add("font-licence", "", "fonts need their licence file (OFL.txt) in the pack");
  if (licence?.bytes && !(/SIL OPEN FONT LICENSE,? Version 1\.1/i.test(text(licence.bytes)) && /copyright/i.test(text(licence.bytes)))) add("font-licence", licence.path, "the licence file is not the SIL Open Font License 1.1 with its copyright line");
  for (const f of pack.fonts) {
    if (!/\.woff2$/i.test(f.file)) add("font-type", "pack.json", `${f.file} is not a woff2 file`);
    if (f.licence !== "OFL-1.1") add("font-licence", "pack.json", `${f.file} licence ${f.licence}: only OFL-1.1 fonts are accepted`);
  }

  // stage, effects, layer budget (the loader's own checks), overlay strength
  if (pack.stage.layers.length > MAX_LAYERS) add("layers", "pack.json", `stage has ${pack.stage.layers.length} layers, at most ${MAX_LAYERS}`);
  for (const m of stageIssues(pack.stage)) {
    if (/^stage layer \d+ image/.test(m)) continue;
    add(/^effect|^more than/.test(m) ? "effects" : "stage", "pack.json", m);
  }
  for (const e of pack.stage.effects ?? []) if (e.opacity !== undefined && e.opacity > OVERLAY_MAX) add("overlay-alpha", "pack.json", `${e.kind} opacity ${e.opacity} is over ${OVERLAY_MAX}: an overlay never hides what is under it`);

  // ornament, edge
  if (pack.ornament && pack.ornament.size > ORNAMENT_MAX && !pack.ornament.bleed) add("ornament", "pack.json", `ornament is ${pack.ornament.size} px, at most ${ORNAMENT_MAX}`);
  if (pack.edge?.kind === "chamfer" && !(pack.edge.cut !== undefined && pack.edge.cut <= CHAMFER_MAX)) add("chamfer", "pack.json", `chamfer cut ${pack.edge.cut ?? "missing"}: at most ${CHAMFER_MAX} px`);
  else if (pack.edge?.kind !== "chamfer" && pack.edge?.cut !== undefined && pack.edge.cut > CHAMFER_MAX) add("chamfer", "pack.json", `edge cut ${pack.edge.cut}: at most ${CHAMFER_MAX} px`);

  // icons
  if (src.icons !== undefined) {
    for (const m of iconSetIssues(src.icons)) add(m.includes("icon name list") ? "icon-key" : "icons", "icons.json", m);
  }

  // the Look: contrast per card, opaque chrome surface, gradient numerals, T3 values, readable colours
  const { issues: lookRules, cards, texts } = lookIssues(look);
  out.push(...lookRules);

  // burn-in: a static-safe claim on bright static art (layers stack: each adds to what is behind it; unreadable art is not static-safe)
  if (pack.burnIn === "static-safe") {
    let behind = 1;
    pack.stage.layers.forEach((l, i) => {
      const art = layerBrightness(l, files, resolve);
      if (art === undefined) return void add("burn-in", "pack.json", `stage layer ${i}'s colours cannot be read (a name, var(), a raster or an unusual colour function): declare needs-shift or needs-dim, not static-safe`);
      const lum = art * (l.opacity ?? 1);
      behind *= 1 - Math.min(1, lum);
      if (lum >= BRIGHT_LAYER) add("burn-in", "pack.json", `stage layer ${i} is bright static art (luminance ${lum.toFixed(2)}): declare needs-shift or needs-dim, not static-safe`);
    });
    if (1 - behind >= BRIGHT_LAYER) add("burn-in", "pack.json", `the stage layers together are bright static art (luminance ${(1 - behind).toFixed(2)}): declare needs-shift or needs-dim, not static-safe`);
  }

  // pack.css: a user pack has none; a built-in pack's is read for URLs, paint only and hiding paint
  if (user && (src.css !== undefined || files.has("pack.css"))) add("user-css", "pack.css", "a user pack carries no pack.css: its paint is the tokens and T3 values of look.json (user CSS needs a grammar of its own and a render check at import)");
  if (!user && src.css !== undefined) {
    for (const m of packCssIssues(src.css)) add(cssRule(m), "pack.css", m);
    for (const m of lintPackCss(src.css)) add(cssRule(m), "pack.css", m);
    if (!tokenize(src.css).some((t) => t.t === "error")) out.push(...hiddenPaintIssues(src.css, cards, texts));
  }
  return finish(out);
}

/** How bright a stage layer is (0-1, before its opacity): its fill, or its SVG's paints; undefined when that cannot be read (a raster, a missing file, a colour name). */
function layerBrightness(l: { fill?: string; image?: string }, files: Map<string, PackFile>, resolve: (name: string, base: string) => string | undefined): number | undefined {
  if (l.fill !== undefined) return fillBrightness(l.fill);
  if (l.image === undefined) return 0;
  const path = isPackRelativeUrl(l.image) ? resolve(l.image, "assets/") : undefined;
  const f = path ? files.get(path) : undefined;
  return f?.bytes && /\.svg$/i.test(f.path) ? svgBrightness(text(f.bytes)) : undefined;
}

/** Errors first; the same rule on the same file and message once. */
function finish(issues: PackIssue[]): PackIssue[] {
  const seen = new Set<string>();
  const unique = issues.filter((i) => !seen.has(`${i.rule}|${i.file}|${i.message}`) && seen.add(`${i.rule}|${i.file}|${i.message}`));
  return [...unique.filter((i) => i.severity === "error"), ...unique.filter((i) => i.severity === "warn")];
}
