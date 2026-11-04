// Pack CSS is paint only and reaches nothing outside the pack (spec 03, Security): the loader lints it against an allow-list
// of paint properties (`lintPackCss`) and mounts it as `@layer look { @scope ([data-look="id"]) { ... } }` (`scopePackCss`).
// The pack's own elements carry `data-look="<id>"` (the widget card, each stage layer and the overlay); a rule reaches those
// elements' descendants, and the element itself through `:scope`. Layout, visibility, position, size and the page (`:root`,
// `html`, `body`) are not the pack's to touch. Anything the lint cannot read is refused.

/** Paint properties (and custom properties); a property that is not here is refused. `content` is allowed on `::before` and `::after` only. */
const PAINT =
  /^(--[\w-]+|color|opacity|filter|backdrop-filter|-webkit-backdrop-filter|box-shadow|text-shadow|fill(-opacity)?|stroke(-opacity|-width|-dasharray|-dashoffset|-linecap|-linejoin)?|mix-blend-mode|accent-color|caret-color|font-family|font-feature-settings|-webkit-text-fill-color|-webkit-text-stroke-color|-webkit-background-clip|background(-color|-image|-position(-x|-y)?|-size|-repeat|-attachment|-clip|-origin|-blend-mode)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-(color|style)|border-image-(source|slice|repeat)|outline-(color|style)|text-decoration(-color|-style)?|(-webkit-)?mask(-(image|mode|position|size|repeat|origin|clip|composite))?|animation(-(name|duration|delay|iteration-count|direction|fill-mode|play-state|timing-function))?)$/;
const FONT_FACE = /^(font-family|src|font-weight|font-style|font-stretch|font-display|unicode-range)$/;
/** The names a selector may not mention: the page, and the shadow host. */
const ESCAPE = /(^|[\s,>+~(])(html|body|head)(?![\w-])|:(root|host|host-context)\b/i;
const KEYFRAME_SELECTOR = /^(from|to|\d+(\.\d+)?%)(\s*,\s*(from|to|\d+(\.\d+)?%))*$/i;

interface Rule {
  prelude: string;
  /** The text between the braces; undefined for a statement ending in `;`. */
  block?: string;
}

/** Splits `src` at its top level into rules; strings and comments are skipped and an unbalanced brace is an issue. */
function rulesOf(src: string, issues: string[]): Rule[] {
  const out: Rule[] = [];
  const n = src.length;
  let i = 0;
  let start = 0;
  const skip = () => {
    if (src[i] === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
    } else if (src[i] === '"' || src[i] === "'") {
      const q = src[i++];
      while (i < n && src[i] !== q && src[i] !== "\n") i++;
      i++;
    } else return false;
    return true;
  };
  while (i < n) {
    if (skip()) continue;
    if (src[i] === "}") {
      issues.push("unbalanced }");
      return out;
    }
    if (src[i] === ";") {
      out.push({ prelude: src.slice(start, i).trim() });
      start = ++i;
    } else if (src[i] === "{") {
      const from = ++i;
      let depth = 1;
      while (i < n && depth > 0) {
        if (skip()) continue;
        if (src[i] === "{") depth++;
        else if (src[i] === "}") depth--;
        i++;
      }
      if (depth > 0) {
        issues.push("unbalanced {");
        return out;
      }
      out.push({ prelude: src.slice(start, from - 1).trim(), block: src.slice(from, i - 1) });
      start = i;
    } else i++;
  }
  if (src.slice(start).replace(/\/\*[\s\S]*?\*\//g, "").trim()) issues.push("css after the last rule");
  return out;
}

/** The declarations of a block as [name, value] pairs, split at `;` outside strings and brackets. */
function declarationsOf(block: string): [string, string][] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let from = 0;
  const text = block.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === ";" && depth <= 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const at = p.indexOf(":");
      return at < 0 ? [p, ""] : [p.slice(0, at).trim().toLowerCase(), p.slice(at + 1).trim()];
    });
}

const pseudoOnly = (selector: string) => selector.split(",").every((s) => /::?(before|after)\s*$/i.test(s.trim()));

function lintDeclarations(where: string, block: string, allowed: (name: string) => boolean, issues: string[]): void {
  if (block.includes("{")) issues.push(`${where}: nested rule`);
  for (const [name, value] of declarationsOf(block)) {
    if (!allowed(name)) issues.push(`${where}: property ${name} is not a paint property`);
    if (/!\s*important/i.test(value)) issues.push(`${where}: !important`);
  }
}

function lintRules(rules: Rule[], top: boolean, issues: string[]): void {
  for (const { prelude, block } of rules) {
    if (block === undefined) {
      issues.push(`statement ${prelude.slice(0, 24)}`);
    } else if (prelude.startsWith("@")) {
      const name = prelude.slice(1).split(/[\s({]/)[0].toLowerCase().replace(/^-[a-z]+-/, "");
      if (name === "media" || name === "supports") lintRules(rulesOf(block, issues), false, issues);
      else if (top && name === "keyframes") {
        for (const frame of rulesOf(block, issues)) {
          if (frame.block === undefined || !KEYFRAME_SELECTOR.test(frame.prelude)) issues.push(`keyframe ${frame.prelude.slice(0, 24)}`);
          else lintDeclarations("keyframe", frame.block, (p) => PAINT.test(p) && !p.startsWith("animation"), issues);
        }
      } else if (top && name === "font-face") lintDeclarations("@font-face", block, (p) => FONT_FACE.test(p), issues);
      else issues.push(`at-rule @${name}`);
    } else {
      const selector = prelude.replace(/"[^"]*"|'[^']*'/g, '""');
      if (!selector || ESCAPE.test(selector)) issues.push(`selector ${prelude.slice(0, 40)} reaches outside the pack`);
      const pseudo = pseudoOnly(selector);
      lintDeclarations(`rule ${prelude.slice(0, 24)}`, block, (p) => PAINT.test(p) || (p === "content" && pseudo), issues);
    }
  }
}

/** What is wrong with a pack's CSS beyond its URLs (`packCssIssues`): a property that is not paint, a selector outside the pack, an at-rule or `!important`. Empty = paint only. */
export function lintPackCss(css: string): string[] {
  const issues: string[] = [];
  lintRules(rulesOf(css, issues), true, issues);
  return issues;
}

/** The stylesheet that goes in the page: the pack's rules scoped to `[data-look="id"]` inside `@layer look`. `@keyframes` and `@font-face` cannot nest in a scope, so they sit beside it in the layer. Call on CSS that passed `lintPackCss`. */
export function scopePackCss(id: string, css: string): string {
  const rules = rulesOf(css, []);
  const global = (r: Rule) => /^@(-[a-z]+-)?(keyframes|font-face)\b/i.test(r.prelude);
  const text = (r: Rule) => `${r.prelude}{${r.block}}`;
  return `@layer look{${rules.filter(global).map(text).join("")}@scope ([data-look="${id}"]){${rules.filter((r) => !global(r)).map(text).join("")}}}`;
}
