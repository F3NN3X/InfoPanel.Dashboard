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
import { parseCss, type Rule, tokenize, writeTokens } from "./css-syntax";
import { OVERLAY_MAX } from "./effects";
import { iconSetIssues } from "./icon-set";
import { resolveT1, type Look, T1_NAMES } from "./look";
import lookSchema from "./look.schema.json";
import { MAX_LAYERS, numeralIssues, stageIssues } from "./pack-checks";
import { lintPackCss, OPACITY_FLOOR } from "./pack-css";
import packSchema from "./pack.schema.json";
import { cssUrls, isPackRelativeUrl, packCssIssues } from "./pack-urls";
import { schemaErrors } from "./schema-check";
import { contrastOf } from "./status";

export interface PackFile {
  /** Relative to the pack folder, `/` separated (`assets/hazard.svg`). */
  path: string;
  size: number;
  /** Needed for the content checks (a font's signature, an SVG's markup, a licence's text, a layer's colours). */
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
/** A chamfer cuts at most this many px (twice the smallest card padding). */
export const CHAMFER_MAX = 20;
/** Body text, muted text and status text hold this on the card (D13); gradient numerals hold 3:1 (`NUMERAL_MIN`). */
export const TEXT_MIN = 4.5;
/** A layer this bright (relative luminance, times its opacity) is not `static-safe` on an always-on panel. */
export const BRIGHT_LAYER = 0.4;
/** Text the pack colours must show against what is behind it at least this much, or it is hidden. */
const HIDDEN_TEXT_MIN = 3;

const ASSET_TYPES = /\.(png|jpe?g|webp|avif|gif|svg|woff2)$/i;
const ROOT_FILES = /^(pack\.json|look\.json|pack\.css|icons\.json|LOOK\.md|README(\.md)?|thumb\.(avif|png|webp|jpe?g)|(OFL|LICEN[CS]E|COPYING)[\w.-]*)$/i;
const LICENCE_FILE = /^(OFL|LICEN[CS]E|COPYING)/i;
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
  /** `#rrggbb` when the colour is a literal (hex or rgb()). */
  hex?: string;
  alpha: number;
}

const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** A CSS colour as written: hex (3, 4, 6, 8 digits), `rgb()`/`rgba()`, `hsl()`/`hsla()` (alpha only), `transparent`; undefined for anything else (a name, `var()`). */
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
  if (!Number.isFinite(alpha)) return undefined;
  if (fn[1].startsWith("hsl")) return { alpha };
  const [r, g, b] = parts.slice(0, 3).map((p) => (p.endsWith("%") ? (parseFloat(p) * 255) / 100 : parseFloat(p)));
  return [r, g, b].every(Number.isFinite) ? { hex: `#${byte(r)}${byte(g)}${byte(b)}`, alpha } : { alpha };
}

/** Relative luminance of a `#rrggbb` (contrast against black, inverted: reuses the one colour maths of status.ts). */
const luminance = (hex: string): number => ((contrastOf(hex, "#000000") ?? 1) - 1) * 0.05;

/** Mean luminance of the colours a CSS fill or SVG text names, each weighted by its alpha (transparent counts as black); 0 for none. */
function brightness(source: string): number {
  const found = source.match(/#[\da-f]{8}\b|#[\da-f]{6}\b|#[\da-f]{3,4}\b|rgba?\([^)]*\)|\btransparent\b/gi) ?? [];
  const lums = found.flatMap((c) => {
    const parsed = parseColour(c);
    return parsed ? [parsed.hex ? luminance(parsed.hex) * parsed.alpha : 0] : [];
  });
  return lums.length ? lums.reduce((a, b) => a + b, 0) / lums.length : 0;
}

// ---- pack.css ---------------------------------------------------------------------------------------------------------

/** Declarations that move, turn or resize a box; the card is never rotated (spec 03, Layout). */
const ROTATION = /^(transform(-origin|-box|-style)?|rotate|scale|translate|perspective(-origin)?|offset-rotate|zoom|writing-mode)$/;
/** What a `*` rule may paint: it reaches every element of the card, so anything that compounds or covers is refused. */
const UNIVERSAL_OK = /^(font-family|font-feature-settings|color|text-shadow|caret-color|accent-color|text-decoration(-color|-style)?)$/;
/** Selectors that name a gauge: its arc, bar, cells or line. */
const GAUGE = /ring|bar|meter|spark|\*|svg|path|circle|rect/i;

/** The pack CSS's own rule for each message the loader's readers give. */
function cssRule(message: string): string {
  if (message === "@import") return "import";
  if (message.startsWith("url ")) return urlRule(message.slice(4));
  if (message.includes("!important")) return "no-important";
  const prop = /property ([\w-]+) is not a paint property/.exec(message)?.[1];
  if (prop) return ROTATION.test(prop) ? "no-rotation" : "paint-only";
  if (/hides or blurs|opacity/.test(message)) return "hides-content";
  if (message.includes("reaches outside")) return "selector";
  if (message.includes("must start with pack-")) return "font-face";
  if (/^(at-rule|keyframe|@keyframes)/.test(message)) return "paint-only";
  return "css-syntax";
}

/** Every style rule with its declarations, media and supports blocks flattened; keyframes and font faces are left out. */
function styleRules(rules: Rule[]): Rule[] {
  return rules.flatMap((r) => (r.at === undefined ? [r] : r.at === "media" || r.at === "supports" ? styleRules(r.rules ?? []) : []));
}

/** The rules of pack CSS that hide content with paint the lint (`lintPackCss`) reads one declaration at a time (L68, L71). */
function hiddenPaintIssues(css: string, cards: string[]): PackIssue[] {
  const rules = parseCss(css, []);
  const out: PackIssue[] = [];
  const all = styleRules(rules);
  const bgs = all.flatMap((r) => (r.declarations ?? []).filter((d) => /^background(-color)?$/.test(d.name)).flatMap((d) => parseColour(writeTokens(d.value))?.hex ?? []));
  let opacity = 1;
  for (const rule of all) {
    const selector = writeTokens(rule.prelude);
    const universal = rule.prelude.some((t) => t.t === "delim" && t.v === "*");
    const own = (rule.declarations ?? []).flatMap((d) => parseColour(writeTokens(d.value))?.hex && /^background(-color)?$/.test(d.name) ? [parseColour(writeTokens(d.value))!.hex!] : []);
    for (const { name, value } of rule.declarations ?? []) {
      const v = writeTokens(value);
      if (universal && !UNIVERSAL_OK.test(name)) out.push(issue("universal", "pack.css", `${name} on "${selector.slice(0, 30)}" reaches every element of a card: a * rule may set only text colour, font and text shadow`));
      if (/^(fill-|stroke-)?opacity$/.test(name) || (name === "filter" && /opacity\(/i.test(v))) {
        if (universal) out.push(issue("opacity-compound", "pack.css", `${name} on "${selector.slice(0, 30)}" compounds down every element`));
        const a = parseFloat(/opacity\(([^)]*)\)/i.exec(v)?.[1] ?? v);
        if (Number.isFinite(a)) opacity *= Math.min(1, a);
      }
      if (name === "color" || name === "-webkit-text-fill-color") {
        const c = parseColour(v);
        if (c && c.alpha < OPACITY_FLOOR) out.push(issue("hidden-text", "pack.css", `${name} ${v} is transparent text`));
        else if (c?.hex) {
          const behind = own.length ? own : [...bgs, ...cards];
          if (behind.length && !behind.some((b) => (contrastOf(c.hex!, b) ?? HIDDEN_TEXT_MIN) >= HIDDEN_TEXT_MIN)) out.push(issue("hidden-text", "pack.css", `${name} ${v} is under ${HIDDEN_TEXT_MIN}:1 on what is behind it`));
        }
      }
      if ((name === "fill" || name === "stroke") && GAUGE.test(selector) && (/^none$/i.test(v) || (parseColour(v)?.alpha ?? 1) < OPACITY_FLOOR)) {
        out.push(issue("hidden-gauge", "pack.css", `${name}: ${v} on "${selector.slice(0, 30)}" paints a gauge, mark or icon away`));
      }
    }
  }
  if (opacity < OPACITY_FLOOR) out.push(issue("opacity-compound", "pack.css", `the opacities of the rules multiply to ${opacity.toFixed(2)}, under ${OPACITY_FLOOR}`));
  return out;
}

// ---- the rules --------------------------------------------------------------------------------------------------------

/** What each Look in the pack is drawn on: the cards' flat colours (a material's export or fill, else the surface) and the surface, per mode. */
function cardsOf(look: Look, t1: Record<string, string>): string[] {
  const flat = Object.values(look.t2?.materials ?? {}).flatMap((m) => [m.export ?? m.fill].filter((c): c is string => typeof c === "string" && parseColour(c)?.hex !== undefined));
  return [...new Set([t1.surface, ...flat.map((c) => parseColour(c)!.hex!)])];
}

function lookIssues(look: Look): { issues: PackIssue[]; cards: string[] } {
  const issues: PackIssue[] = [];
  const cards: string[] = [];
  for (const mode of look.modes.supported) {
    let t1: Record<string, string>;
    try {
      t1 = resolveT1(look, mode);
    } catch (e) {
      issues.push(issue("schema", "look.json", `${mode}: ${(e as Error).message}`));
      continue;
    }
    // L93: the chrome (the island's pill, the alert cards) takes the surface verbatim, so it is a literal and opaque
    const surface = parseColour(t1.surface);
    if (!surface?.hex || surface.alpha < 1 || !/^#([\da-f]{3}|[\da-f]{6})$/i.test(t1.surface)) issues.push(issue("chrome-surface", "look.json", `${mode} surface ${t1.surface} must be an opaque #rgb or #rrggbb: the chrome and the contrast check read it as written`));
    for (const card of cardsOf(look, t1)) {
      cards.push(card);
      for (const name of TEXT_PAIRS) {
        const ratio = contrastOf(t1[name], card);
        if (ratio === undefined) issues.push(issue("contrast", "look.json", `${mode} ${name} ${t1[name]} on ${card} cannot be checked: use #rgb or #rrggbb`));
        else if (ratio < TEXT_MIN) issues.push(issue("contrast", "look.json", `${mode} ${name} ${t1[name]} is ${ratio.toFixed(2)}:1 on the card ${card}, under ${TEXT_MIN}:1`));
      }
    }
  }
  for (const m of numeralIssues(look)) issues.push(issue("contrast", "look.json", m));
  return { issues, cards: [...new Set(cards)] };
}

/** What is wrong with a pack, one issue each, errors before warnings (empty: it may load). */
export function validatePack(src: PackSource): PackIssue[] {
  const out: PackIssue[] = [];
  const add = (rule: string, file: string, message: string, severity: PackIssue["severity"] = "error") => void out.push(issue(rule, file, message, severity));
  const sizes = new Map(src.files.map((f) => [f.path, f]));

  // schema
  const packErrors = schemaErrors(src.pack, packSchema as Record<string, unknown>, packSchema as Record<string, unknown>);
  const lookErrors = schemaErrors(src.look, lookSchema as Record<string, unknown>, lookSchema as Record<string, unknown>);
  for (const m of packErrors) add("schema", "pack.json", m);
  for (const m of lookErrors) add("schema", "look.json", m);

  // the folder: every file's own path, the size cap, nothing outside the pack's shape
  let total = 0;
  for (const f of src.files) {
    total += f.size;
    if (!isPackRelativeUrl(f.path)) add(urlRule(f.path), f.path, `file path ${f.path} leaves the pack folder`);
    else if (f.path.startsWith("assets/")) {
      if (!ASSET_TYPES.test(f.path)) add("asset-type", f.path, "an asset is an image (png, jpg, webp, avif, gif, svg) or a woff2 font");
    } else if (!ROOT_FILES.test(f.path)) add("asset-extra", f.path, "not a file a pack has");
  }
  if (total > PACK_CEILING_BYTES) add("size", "", `the pack is ${total} bytes, over the ${PACK_CEILING_BYTES} cap`);

  if (packErrors.length || lookErrors.length) return finish(out);
  const pack = src.pack as { id: string; modes: string[]; fonts: { file: string; licence: string }[]; stage: Parameters<typeof stageIssues>[0] & object; burnIn: string; assets?: { file: string; bytes: number }[]; ornament?: { size: number; bleed?: boolean }; edge?: { kind: string; cut?: number } };
  const look = src.look as Look;
  if (look.id !== pack.id) add("id", "look.json", `look.id ${look.id} is not the pack id ${pack.id}`);
  if (pack.modes.join() !== look.modes.supported.join()) add("modes", "pack.json", "modes differ from look.json modes.supported");
  for (const key of T1_NAMES) for (const mode of look.modes.supported) if (!look.t1[mode]?.[key]) add("schema", "look.json", `${mode} ${key} is missing`);

  // referenced files: stage images, fonts, icons, CSS urls; each is a pack path and a file of the folder
  const referenced = new Map<string, string>();
  const refer = (from: string, name: string, base: string) => {
    if (!isPackRelativeUrl(name) || /["']/.test(name)) return void add(urlRule(name), from, `${name} is not a path inside the pack`);
    const path = name.replace(/[?#].*$/, "").replace(/^\.\//, "");
    const found = [base + path, path, `assets/${path}`].find((p) => sizes.has(p));
    if (!found) add("asset-missing", from, `${name} is not in the pack's files`);
    else referenced.set(found, from);
  };
  pack.stage.layers.forEach((l) => l.image && refer("pack.json", l.image, "assets/"));
  pack.fonts.forEach((f) => refer("pack.json", f.file, "assets/"));
  if (src.css !== undefined) for (const u of cssUrls(src.css)) refer("pack.css", u, "");

  // the asset list matches the files
  if (pack.assets) {
    const listed = new Set<string>();
    for (const a of pack.assets) {
      const f = sizes.get(`assets/${a.file}`);
      listed.add(`assets/${a.file}`);
      if (!f) add("asset-listed", "pack.json", `${a.file} is listed and not in the pack's files`);
      else if (f.size !== a.bytes) add("asset-listed", "pack.json", `${a.file} is listed as ${a.bytes} bytes and is ${f.size}`);
    }
    for (const f of src.files) if (f.path.startsWith("assets/") && !listed.has(f.path)) add("asset-listed", f.path, "not in pack.json's asset list: anything not listed is refused");
  }
  for (const f of src.files) if (f.path.startsWith("assets/") && !referenced.has(f.path)) add("asset-unused", f.path, "nothing in the pack uses this file", "warn");
  for (const f of src.files) {
    if (!f.bytes || !f.path.endsWith(".svg")) continue;
    const svg = text(f.bytes);
    if (/<script|<foreignObject|<iframe|<object|<embed|<audio|<video|\son[a-z]+\s*=|javascript:|@import/i.test(svg) || /(?:xlink:)?href\s*=\s*["']\s*(?!#)/i.test(svg) || /url\(\s*["']?\s*(?!#)/i.test(svg)) add("svg-unsafe", f.path, "an SVG holds script, an event handler, an embedded object or a reference outside itself");
  }

  // fonts: woff2 with a licence file (OFL) and a copyright line
  const licence = src.files.find((f) => LICENCE_FILE.test(f.path));
  if (pack.fonts.length && !licence) add("font-licence", "", "fonts need their licence file (OFL.txt) in the pack");
  if (licence?.bytes && !/SIL OPEN FONT LICENSE/i.test(text(licence.bytes))) add("font-licence", licence.path, "the licence file is not the SIL Open Font License");
  for (const f of pack.fonts) {
    if (!/\.woff2$/i.test(f.file)) add("font-type", "pack.json", `${f.file} is not a woff2 file`);
    const bytes = sizes.get(`assets/${f.file}`)?.bytes;
    if (bytes && text(bytes.subarray(0, 4)) !== "wOF2") add("font-type", `assets/${f.file}`, "the file is not a woff2 font (wrong signature)");
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

  // icons
  if (src.icons !== undefined) {
    for (const m of iconSetIssues(src.icons)) add(m.includes("icon name list") ? "icon-key" : "icons", "icons.json", m);
  }

  // the Look: contrast per card, opaque chrome surface, gradient numerals
  const { issues: lookRules, cards } = lookIssues(look);
  out.push(...lookRules);

  // burn-in: a static-safe claim on bright static art
  if (pack.burnIn === "static-safe") {
    pack.stage.layers.forEach((l, i) => {
      const art = l.fill ?? (l.image ? text(sizes.get(`assets/${l.image}`)?.bytes ?? new Uint8Array()) : "");
      const lum = brightness(art) * (l.opacity ?? 1);
      if (lum >= BRIGHT_LAYER) add("burn-in", "pack.json", `stage layer ${i} is bright static art (luminance ${lum.toFixed(2)}): declare needs-shift or needs-dim, not static-safe`);
    });
  }

  // pack.css: URLs, paint only, hiding paint
  if (src.css !== undefined) {
    for (const m of packCssIssues(src.css)) add(cssRule(m), "pack.css", m);
    for (const m of lintPackCss(src.css)) add(cssRule(m), "pack.css", m);
    if (!tokenize(src.css).some((t) => t.t === "error")) out.push(...hiddenPaintIssues(src.css, cards));
  }
  return finish(out);
}

/** Errors first; the same rule on the same file and message once. */
function finish(issues: PackIssue[]): PackIssue[] {
  const seen = new Set<string>();
  const unique = issues.filter((i) => !seen.has(`${i.rule}|${i.file}|${i.message}`) && seen.add(`${i.rule}|${i.file}|${i.message}`));
  return [...unique.filter((i) => i.severity === "error"), ...unique.filter((i) => i.severity === "warn")];
}
