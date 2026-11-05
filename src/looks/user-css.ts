// The grammar of a user pack's CSS (L94): a reader that accepts only what it positively recognises. The built-in packs' rules
// (`lintPackCss`, the validator's `hiddenPaintIssues`) are a deny-list over free CSS, which cannot say what stays visible (decision
// log, P12a fix round 1), so they are not what guards a user pack. This one is an allow-list: a selector is the documented `data-part`
// slots and the two plain combinators, a declaration is a property of the short list below, and a colour is a hex or `rgb()`
// literal or a `var(--pack-*)` that resolves to one in the same file. No at-rule, no `url()` (a relative one in a `<style>` resolves
// against the page, never the pack folder, so no spelling stays inside the pack), no `!important`, no fallback, no function
// beyond those. Passing this says only that the file is plain: whether the pack keeps content readable is the render check's
// (`pack-render-check`), and whether the check ran is what the server's signature records (packs.rs).
import { parseColour } from "./colour";
import { parseCss, type Declaration, type Rule, type Token, writeTokens } from "./css-syntax";
import { commaParts, lintPackCss, OPACITY_FLOOR } from "./pack-css";
import { packCssIssues } from "./pack-urls";

/** The hooks a pack may paint (spec 03, Level 3 hooks, and the three later ones the built-ins use). */
const SLOTS = new Set(["card", "header", "label", "num", "unit", "ring", "bar", "meter", "spark", "threshold", "range", "fader", "icon", "chip", "button", "status", "alert", "tab", "legend", "mono"]);
/** The slots that are marks: a background on one is its track or its value's backdrop, and would hide what the mark draws. */
const MARKS = new Set(["ring", "bar", "meter", "spark", "threshold", "range", "fader", "icon"]);
/** Custom properties the app itself sets (`--pack-chrome-fill`): a pack's own are any other `--pack-*`. */
const RESERVED = /^--pack-chrome-/;
const CUSTOM = /^--pack-[a-z0-9][a-z0-9-]*$/;
const HEX = /^([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

/** Properties that hold one colour. Text and marks keep at least `OPACITY_FLOOR` of it; `box` ones paint a box, so never a mark. */
const COLOURS: Record<string, { ink?: boolean; box?: boolean }> = {
  color: { ink: true },
  fill: { ink: true },
  stroke: { ink: true },
  "text-decoration-color": {},
  "caret-color": {},
  "accent-color": {},
  background: { box: true },
  "background-color": { box: true },
  "border-color": { box: true },
  "border-top-color": { box: true },
  "border-right-color": { box: true },
  "border-bottom-color": { box: true },
  "border-left-color": { box: true },
  "outline-color": { box: true },
};
/** A plain number from..to. */
const NUMBERS: Record<string, readonly [number, number]> = { opacity: [OPACITY_FLOOR, 1], "stroke-width": [0.5, 8] };
/** Shadows stay at the box they belong to: a spread or a long offset paints over the neighbour, which no measure can see. */
const SHADOW_OFFSET_MAX = 4;
const SHADOW_BLUR_MAX = 12;

/** A colour as read: a literal's alpha, or the custom property it names. */
type Read = { alpha: number } | { ref: string };

/** One colour value: a hex token, an `rgb()`/`rgba()` of plain numbers, or a bare `var(--pack-x)`. Anything else is undefined. */
function readColour(value: Token[]): Read | undefined {
  const [head] = value;
  if (value.length === 1 && head.t === "hash" && HEX.test(head.v)) return literal(value);
  if (head?.t !== "function" || value.at(-1)?.t !== ")") return undefined;
  const inner = value.slice(1, -1);
  const name = head.v.toLowerCase();
  if (name === "var") return inner.length === 1 && inner[0].t === "ident" && CUSTOM.test(inner[0].v) && !RESERVED.test(inner[0].v) ? { ref: inner[0].v } : undefined;
  if (name !== "rgb" && name !== "rgba") return undefined;
  const plain = inner.every((t) => t.t === "number" || t.t === "percentage" || t.t === "ws" || t.t === "," || (t.t === "delim" && t.v === "/"));
  const numbers = inner.filter((t) => t.t === "number" || t.t === "percentage");
  const channels = numbers.slice(0, 3).every((t) => (t.n as number) >= 0 && (t.n as number) <= (t.t === "number" ? 255 : 100));
  const alpha = numbers[3] === undefined || ((numbers[3].n as number) >= 0 && (numbers[3].n as number) <= (numbers[3].t === "number" ? 1 : 100));
  return plain && (numbers.length === 3 || numbers.length === 4) && channels && alpha ? literal(value) : undefined;
}

function literal(value: Token[]): Read | undefined {
  const colour = parseColour(writeTokens(value));
  return colour?.hex ? { alpha: colour.alpha } : undefined;
}

/** The custom properties the file defines, each with every value it was given. */
type Defined = Map<string, Read[]>;

/** The lowest alpha a colour can resolve to, or a reason it does not resolve in this file: every definition is followed, and a loop is no colour. */
function resolve(read: Read, defined: Defined, trail: readonly string[] = []): number | string {
  if ("alpha" in read) return read.alpha;
  if (trail.includes(read.ref)) return `var(${read.ref}) loops`;
  const values = defined.get(read.ref);
  if (!values) return `var(${read.ref}) is not defined in this file`;
  let least = 1;
  for (const value of values) {
    const alpha = resolve(value, defined, [...trail, read.ref]);
    if (typeof alpha === "string") return alpha;
    least = Math.min(least, alpha);
  }
  return least;
}

/** The value's parts at the top level, white space between them dropped: a function and its arguments are one part. */
function words(value: Token[]): Token[][] {
  const out: Token[][] = [];
  let depth = 0;
  let open = false;
  for (const tok of value) {
    if (tok.t === "ws" && depth === 0) {
      open = false;
      continue;
    }
    if (!open) out.push([]);
    open = true;
    out.at(-1)?.push(tok);
    if (tok.t === "function" || tok.t === "(") depth++;
    else if (tok.t === ")") depth--;
  }
  return out;
}

/** A shadow's px, or undefined: a dimension in px or a bare 0. */
const shadowPx = (word: Token[]): number | undefined => {
  const [tok] = word;
  if (word.length !== 1) return undefined;
  if (tok.t === "number") return tok.n === 0 ? 0 : undefined;
  return tok.t === "dimension" && tok.unit === "px" ? (tok.n as number) : undefined;
};

/** What is wrong with one shadow: `[inset] x y [blur] colour`, no spread and no list. */
function shadowIssue(value: Token[], box: boolean, defined: Defined): string | undefined {
  const parts = words(value);
  if (box && parts[0]?.length === 1 && parts[0][0].t === "ident" && parts[0][0].v.toLowerCase() === "inset") parts.shift();
  const colour = parts.pop();
  const lengths = parts.map(shadowPx);
  if (!colour || (lengths.length !== 2 && lengths.length !== 3) || lengths.some((n) => n === undefined)) return "is not one shadow of x, y, an optional blur and a colour";
  const [x, y, blur = 0] = lengths as number[];
  if (Math.abs(x) > SHADOW_OFFSET_MAX || Math.abs(y) > SHADOW_OFFSET_MAX || blur < 0 || blur > SHADOW_BLUR_MAX) return `reaches past ${SHADOW_OFFSET_MAX} px of offset or ${SHADOW_BLUR_MAX} px of blur`;
  const read = readColour(colour);
  if (!read) return "does not end in a hex or rgb() colour or a var(--pack-*)";
  const alpha = resolve(read, defined);
  return typeof alpha === "string" ? alpha : undefined;
}

/** What is wrong with one declaration on a rule that paints `slots`. */
function declarationIssue({ name, value }: Declaration, slots: readonly string[], defined: Defined): string | undefined {
  const text = `${name}: ${writeTokens(value).slice(0, 40)}`;
  if (name.startsWith("--")) {
    if (!CUSTOM.test(name) || RESERVED.test(name)) return `${name} is not a custom property of the pack`;
    if (!readColour(value)) return `${text} is not a hex or rgb() colour or a var(--pack-*)`;
    const alpha = resolve({ ref: name }, defined);
    return typeof alpha === "string" ? `${text}: ${alpha}` : undefined;
  }
  const marked = slots.find((s) => MARKS.has(s));
  const colour = Object.hasOwn(COLOURS, name) ? COLOURS[name] : undefined;
  if (colour) {
    if (colour.box && marked) return `${name} paints the box of ${marked}, which would hide the mark it draws`;
    const read = readColour(value);
    if (!read) return `${text} is not a hex or rgb() colour or a var(--pack-*)`;
    const alpha = resolve(read, defined);
    if (typeof alpha === "string") return `${text}: ${alpha}`;
    return colour.ink && alpha < OPACITY_FLOOR ? `${text} is under ${OPACITY_FLOOR} opaque` : undefined;
  }
  const range = Object.hasOwn(NUMBERS, name) ? NUMBERS[name] : undefined;
  if (range) return value.length === 1 && value[0].t === "number" && (value[0].n as number) >= range[0] && (value[0].n as number) <= range[1] ? undefined : `${text} is not a number from ${range[0]} to ${range[1]}`;
  if (name === "box-shadow" || name === "text-shadow") {
    if (name === "box-shadow" && marked) return `box-shadow paints the box of ${marked}, which would hide the mark it draws`;
    const issue = shadowIssue(value, name === "box-shadow", defined);
    return issue && `${text} ${issue}`;
  }
  return `property ${name} is not one a pack may set`;
}

/** The slot of one compound (`[data-part="num"]`), read from `at`; undefined for anything else. */
function slotAt(part: Token[], at: number): string | undefined {
  const [open, attr, is, name, close] = part.slice(at, at + 5);
  const exact = open?.t === "[" && attr?.t === "ident" && attr.v === "data-part" && is?.t === "delim" && is.v === "=" && name?.t === "string" && close?.t === "]";
  return exact && SLOTS.has(name.v) ? name.v : undefined;
}

/** The slot one selector paints, or undefined: compounds of one known slot each, joined by a descendant or a child combinator. */
function subject(part: Token[]): string | undefined {
  const tokens = part.filter((t, k) => !(t.t === "ws" && (k === 0 || k === part.length - 1)));
  let at = 0;
  for (;;) {
    const slot = slotAt(tokens, at);
    if (slot === undefined) return undefined;
    at += 5;
    if (at === tokens.length) return slot;
    const from = at;
    if (tokens[at]?.t === "ws") at++;
    if (tokens[at]?.t === "delim" && tokens[at].v === ">") at += tokens[at + 1]?.t === "ws" ? 2 : 1;
    if (at === from) return undefined;
  }
}

function ruleIssues(rule: Rule, defined: Defined): string[] {
  const where = writeTokens(rule.prelude).slice(0, 40);
  if (rule.at !== undefined) return [`at-rule @${rule.at}: a user pack's CSS has style rules only`];
  const slots = commaParts(rule.prelude).map(subject);
  if (rule.prelude.length === 0 || slots.some((s) => s === undefined)) return [`selector ${where} is not the data-part slots`];
  return (rule.declarations ?? []).flatMap((d) => {
    const issue = declarationIssue(d, slots as string[], defined);
    return issue ? [`${where}: ${issue}`] : [];
  });
}

/** What is wrong with a user pack's CSS, one line each. Empty means every part of it was recognised; nothing else does. */
export function userCssIssues(css: string): string[] {
  const syntax: string[] = [];
  const rules = parseCss(css, syntax);
  if (syntax.length) return syntax;
  if (!rules.some((r) => r.declarations?.length)) return ["the file holds no rule"];
  const defined: Defined = new Map();
  for (const rule of rules) {
    for (const d of rule.declarations ?? []) {
      if (!d.name.startsWith("--")) continue;
      const read = readColour(d.value);
      if (read) defined.set(d.name, [...(defined.get(d.name) ?? []), read]);
    }
  }
  const issues = rules.flatMap((r) => ruleIssues(r, defined));
  // what the loader reads the mounted file with: the grammar sits inside it, and a disagreement refuses the file
  return issues.length ? issues : [...packCssIssues(css), ...lintPackCss(css)];
}
