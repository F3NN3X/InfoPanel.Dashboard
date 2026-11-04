// The one CSS reader for pack CSS (spec 03, Security): a tokenizer after CSS Syntax Level 3 section 4, a parser into rules,
// selectors and declarations, and the writer that turns the parsed rules back into CSS. The URL check (`pack-urls`) and the
// paint lint (`pack-css`) read the same tokens, and the page gets the rules as written here, never the pack's own text, so the
// browser sees what the checks saw. Anything outside the small grammar a pack needs is an issue (fail closed).

export type TokenKind =
  | "ws"
  | "ident"
  | "function"
  | "at"
  | "hash"
  | "string"
  | "url"
  | "number"
  | "percentage"
  | "dimension"
  | "delim"
  | ":"
  | ";"
  | ","
  | "("
  | ")"
  | "["
  | "]"
  | "{"
  | "}"
  /** Something the browser would read but a pack may not hold: `v` says what (a bad string or url, an escape, `<!--`). */
  | "error";

export interface Token {
  t: TokenKind;
  /** The name, string or url value (escapes decoded), a number's text as written, a delim's character or an error's message. */
  v: string;
  /** The value of a number, percentage or dimension. */
  n?: number;
  /** A dimension's unit. */
  unit?: string;
}

const isDigit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";
const isHex = (c: string | undefined) => c !== undefined && /^[0-9a-f]$/i.test(c);
const isWs = (c: string | undefined) => c === " " || c === "\t" || c === "\n";
const isNameStart = (c: string | undefined) => c !== undefined && (/^[a-z_]$/i.test(c) || c.charCodeAt(0) >= 0x80);
const isName = (c: string | undefined) => isNameStart(c) || isDigit(c) || c === "-";
const NON_PRINTABLE = /[\u0000-\u0008\u000b\u000e-\u001f\u007f]/;
const validEscape = (a: string | undefined, b: string | undefined) => a === "\\" && b !== "\n";
const startsIdent = (a: string | undefined, b: string | undefined, c: string | undefined) =>
  a === "-" ? isNameStart(b) || b === "-" || validEscape(b, c) : isNameStart(a) || validEscape(a, b);
const startsNumber = (a: string | undefined, b: string | undefined, c: string | undefined) =>
  a === "+" || a === "-" ? isDigit(b) || (b === "." && isDigit(c)) : a === "." ? isDigit(b) : isDigit(a);

/** The tokens of `css` (comments dropped, runs of white space one `ws`). */
export function tokenize(input: string): Token[] {
  // 3.3: one newline, no NUL
  const css = input.replace(/\r\n?|\f/g, "\n").replace(/\0/g, "\uFFFD");
  const n = css.length;
  const out: Token[] = [];
  let i = 0;
  // set when an escape is read outside a string (a pack never needs one, and it could spell `url(` or `@import`)
  let escaped = false;
  const at = (k = 0) => css[i + k];

  // 4.3.7 (after the backslash)
  const escape = (): string => {
    if (i >= n) return "\uFFFD";
    if (isHex(at())) {
      let hex = "";
      while (hex.length < 6 && isHex(at())) hex += css[i++];
      if (isWs(at())) i++;
      const cp = Number.parseInt(hex, 16);
      return cp === 0 || (cp >= 0xd800 && cp <= 0xdfff) || cp > 0x10ffff ? "\uFFFD" : String.fromCodePoint(cp);
    }
    const cp = css.codePointAt(i) as number;
    i += cp > 0xffff ? 2 : 1;
    return String.fromCodePoint(cp);
  };
  // 4.3.12
  const name = (): string => {
    let s = "";
    for (;;) {
      if (isName(at())) s += css[i++];
      else if (validEscape(at(), at(1))) {
        i++;
        escaped = true;
        s += escape();
      } else return s;
    }
  };
  // 4.3.5
  const string = (q: string): Token => {
    let s = "";
    for (;;) {
      const c = css[i];
      if (c === undefined) return { t: "error", v: "unterminated string" };
      if (c === q) {
        i++;
        return { t: "string", v: s };
      }
      if (c === "\n") return { t: "error", v: "unterminated string" };
      i++;
      if (c !== "\\") s += c;
      else if (at() === "\n") i++;
      else if (i < n) s += escape();
    }
  };
  // 4.3.14
  const badUrl = (from: number): Token => {
    while (i < n && at() !== ")") {
      if (validEscape(at(), at(1))) {
        i++;
        escape();
      } else i++;
    }
    const raw = css.slice(from, i).trim();
    if (i < n) i++;
    return { t: "error", v: `bad url ${raw}` };
  };
  // 4.3.6 (after `url(` and its white space)
  const url = (): Token => {
    const from = i;
    let s = "";
    for (;;) {
      const c = css[i];
      if (c === undefined) return { t: "error", v: "unterminated url(" };
      if (c === ")") {
        i++;
        return { t: "url", v: s };
      }
      if (isWs(c)) {
        while (isWs(at())) i++;
        if (at() === ")") {
          i++;
          return { t: "url", v: s };
        }
        if (i >= n) return { t: "error", v: "unterminated url(" };
        return badUrl(from);
      }
      if (c === '"' || c === "'" || c === "(" || NON_PRINTABLE.test(c)) return badUrl(from);
      if (c === "\\") {
        if (!validEscape(c, at(1))) return badUrl(from);
        i++;
        escaped = true;
        s += escape();
      } else {
        s += c;
        i++;
      }
    }
  };
  // 4.3.3
  const numeric = (): Token => {
    const from = i;
    if (at() === "+" || at() === "-") i++;
    while (isDigit(at())) i++;
    if (at() === "." && isDigit(at(1))) {
      i++;
      while (isDigit(at())) i++;
    }
    if ((at() === "e" || at() === "E") && (isDigit(at(1)) || ((at(1) === "+" || at(1) === "-") && isDigit(at(2))))) {
      i += 2;
      while (isDigit(at())) i++;
    }
    const v = css.slice(from, i);
    const num = Number(v);
    if (startsIdent(at(), at(1), at(2))) return { t: "dimension", v, n: num, unit: name() };
    if (at() === "%") {
      i++;
      return { t: "percentage", v, n: num };
    }
    return { t: "number", v, n: num };
  };
  // 4.3.4
  const identLike = (): Token => {
    const s = name();
    if (s.toLowerCase() === "url" && at() === "(") {
      i++;
      while (isWs(at()) && isWs(at(1))) i++;
      const q = isWs(at()) ? at(1) : at();
      if (q === '"' || q === "'") return { t: "function", v: s };
      while (isWs(at())) i++;
      return url();
    }
    if (at() === "(") {
      i++;
      return { t: "function", v: s };
    }
    return { t: "ident", v: s };
  };

  while (i < n) {
    const c = css[i];
    escaped = false;
    let tok: Token;
    if (c === "/" && at(1) === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end < 0) {
        out.push({ t: "error", v: "unterminated comment" });
        break;
      }
      i = end + 2;
      continue;
    }
    if (isWs(c)) {
      while (isWs(at())) i++;
      if (out.at(-1)?.t !== "ws") out.push({ t: "ws", v: " " });
      continue;
    }
    if (c === '"' || c === "'") {
      i++;
      tok = string(c);
    } else if (c === "#" && (isName(at(1)) || validEscape(at(1), at(2)))) {
      i++;
      tok = { t: "hash", v: name() };
    } else if ("(),:;[]{}".includes(c)) {
      i++;
      tok = { t: c as TokenKind, v: c };
    } else if ((c === "+" || c === "-" || c === ".") && startsNumber(c, at(1), at(2))) tok = numeric();
    else if (c === "-" && at(1) === "-" && at(2) === ">") {
      i += 3;
      tok = { t: "error", v: "-->" };
    } else if (c === "-" && startsIdent(c, at(1), at(2))) tok = identLike();
    else if (c === "<" && css.startsWith("!--", i + 1)) {
      i += 4;
      tok = { t: "error", v: "<!--" };
    } else if (c === "@" && startsIdent(at(1), at(2), at(3))) {
      i++;
      tok = { t: "at", v: name() };
    } else if (c === "\\") {
      if (validEscape(c, at(1))) tok = identLike();
      else {
        i++;
        tok = { t: "error", v: "css escape" };
      }
    } else if (isDigit(c)) tok = numeric();
    else if (isNameStart(c)) tok = identLike();
    else {
      const cp = css.codePointAt(i) as number;
      i += cp > 0xffff ? 2 : 1;
      tok = { t: "delim", v: String.fromCodePoint(cp) };
    }
    if (escaped) out.push({ t: "error", v: "css escape" });
    out.push(tok);
  }
  if (out[0]?.t === "ws") out.shift();
  if (out.at(-1)?.t === "ws") out.pop();
  return out;
}

const hexEscape = (c: string) => `\\${(c.codePointAt(0) as number).toString(16)} `;
/** A name (ident, unit, hash or at-keyword) the tokenizer reads back as the same name. */
function writeName(s: string, ident: boolean): string {
  let out = "";
  [...s].forEach((c, k) => {
    if (ident && k === 0 && isDigit(c)) out += hexEscape(c);
    else if (ident && k === 1 && isDigit(c) && s[0] === "-") out += hexEscape(c);
    else if (isName(c)) out += c;
    else if (NON_PRINTABLE.test(c) || c === "\n" || c === "\t") out += hexEscape(c);
    else out += `\\${c}`;
  });
  return ident && s === "-" ? "\\-" : out;
}
/** A string in double quotes, with `"`, `\`, newlines and control characters escaped. */
export const writeString = (s: string) => `"${s.replace(/["\\]|[\u0000-\u001f\u007f]/g, (c) => (c === '"' || c === "\\" ? `\\${c}` : hexEscape(c)))}"`;
const writeUrl = (s: string) => s.replace(/["'()\\\s]|[\u0000-\u001f\u007f]/g, hexEscape);

function writeToken(tok: Token): string {
  switch (tok.t) {
    case "ident":
      return writeName(tok.v, true);
    case "function":
      return `${writeName(tok.v, true)}(`;
    case "at":
      return `@${writeName(tok.v, true)}`;
    case "hash":
      return `#${writeName(tok.v, false)}`;
    case "string":
      return writeString(tok.v);
    case "url":
      return `url(${writeUrl(tok.v)})`;
    case "percentage":
      return `${tok.v}%`;
    case "dimension":
      return tok.v + writeName(tok.unit ?? "", true);
    case "error":
      throw new Error(`unwritable token: ${tok.v}`);
    default:
      return tok.v;
  }
}

const IDENT_LIKE = ["ident", "function", "url", "-", "number", "percentage", "dimension"];
/** Pairs the tokenizer would read as one token unless a comment parts them (CSS Syntax 3, section 9). */
function needsComment(a: Token, b: Token): boolean {
  const x = a.t === "delim" ? a.v : a.t;
  const y = b.t === "delim" ? b.v : b.t;
  if (x === "ident") return IDENT_LIKE.includes(y) || y === "(";
  if (x === "at" || x === "hash" || x === "dimension" || x === "#" || x === "-") return IDENT_LIKE.includes(y);
  if (x === "number") return IDENT_LIKE.includes(y) && y !== "-" ? true : y === "%";
  if (x === "@") return ["ident", "function", "url", "-"].includes(y);
  if (x === "." || x === "+") return ["number", "percentage", "dimension"].includes(y);
  return x === "/" && y === "*";
}

/** Tokens back into CSS: each token as the tokenizer reads it again, `/**\/` between two that would merge. */
export function writeTokens(tokens: Token[]): string {
  let out = "";
  tokens.forEach((tok, k) => {
    if (k > 0 && needsComment(tokens[k - 1], tok)) out += "/**/";
    out += writeToken(tok);
  });
  return out;
}

export interface Declaration {
  /** Lowercase, except a custom property, which keeps its case. */
  name: string;
  /** The value's tokens, without the white space at either end. */
  value: Token[];
}

export interface Rule {
  /** The at-rule's name, lowercase and without a vendor prefix; undefined for a style rule. */
  at?: string;
  /** The selector, or the at-rule's prelude, without the white space at either end. */
  prelude: Token[];
  /** A style rule's, a keyframe's or `@font-face`'s declarations. */
  declarations?: Declaration[];
  /** The rules inside `@media`, `@supports` or `@keyframes`. */
  rules?: Rule[];
}

const GROUPS = new Set(["media", "supports", "keyframes"]);
const DECLARATION_BLOCKS = new Set(["font-face"]);
/** `@media` and `@supports` inside each other go this deep and no deeper (a deeper stylesheet is refused, never recursed into). */
const MAX_NESTING = 8;
const CLOSE: Partial<Record<TokenKind, TokenKind>> = { "(": ")", function: ")", "[": "]" };

const trim = (tokens: Token[]) => {
  let a = 0;
  let b = tokens.length;
  while (a < b && tokens[a].t === "ws") a++;
  while (b > a && tokens[b - 1].t === "ws") b--;
  return tokens.slice(a, b);
};

/**
 * The rules of a stylesheet, or of what it could read before it found a construct a pack may not hold: then `issues` says
 * what, and the result is not to be used. Blocks must balance (`()` `[]` and functions inside a prelude or a value, `{}`
 * around a rule); a stray closer, a nested rule, a `{}` in a value, a statement (`@import ...;`, `color: red;` outside a
 * rule), an at-rule other than `@media`, `@supports`, `@keyframes` and `@font-face`, and any error token are refused.
 */
export function parseCss(css: string, issues: string[]): Rule[] {
  const toks = tokenize(css);
  let i = 0;
  let failed = false;
  const fail = (msg: string) => {
    if (!failed) issues.push(msg);
    failed = true;
    i = toks.length;
  };
  /** Tokens up to (not including) the first of `stops` outside a block; undefined after a failure. */
  const component = (stops: TokenKind[]): Token[] | undefined => {
    const from = i;
    const open: TokenKind[] = [];
    while (i < toks.length) {
      const tok = toks[i];
      if (tok.t === "error") return void fail(tok.v);
      if (open.length === 0 && stops.includes(tok.t)) break;
      if (tok.t in CLOSE) open.push(CLOSE[tok.t] as TokenKind);
      else if (tok.t === ")" || tok.t === "]" || tok.t === "}" || tok.t === "{") {
        if (open.at(-1) !== tok.t) return void fail(`unbalanced ${tok.t}`);
        open.pop();
      }
      i++;
    }
    if (open.length) return void fail(`unbalanced ${open.at(-1) === ")" ? "(" : "["}`);
    return trim(toks.slice(from, i));
  };
  const declarations = (): Declaration[] => {
    const out: Declaration[] = [];
    while (i < toks.length && !failed) {
      const tok = toks[i];
      if (tok.t === "ws" || tok.t === ";") i++;
      else if (tok.t === "}") {
        i++;
        return out;
      } else if (tok.t === "ident") {
        i++;
        if (toks[i]?.t === "ws") i++;
        if (toks[i]?.t !== ":") {
          fail(`nested rule or a declaration without a colon at ${tok.v}`);
          break;
        }
        i++;
        const value = component([";", "}", "{"]);
        if (value === undefined) break;
        if (toks[i]?.t === "{") {
          fail(`nested rule at ${tok.v}`);
          break;
        }
        out.push({ name: tok.v.startsWith("--") ? tok.v : tok.v.toLowerCase(), value });
      } else {
        fail(tok.t === "error" ? tok.v : `nested rule at ${writeToken(tok)}`);
      }
    }
    fail("unbalanced {");
    return out;
  };
  const rules = (nested: boolean, depth = 0): Rule[] => {
    const out: Rule[] = [];
    if (depth > MAX_NESTING) {
      fail("at-rules nested too deep");
      return out;
    }
    while (i < toks.length && !failed) {
      const tok = toks[i];
      if (tok.t === "ws") {
        i++;
        continue;
      }
      if (tok.t === "}") {
        if (nested) {
          i++;
          return out;
        }
        fail("unbalanced }");
        break;
      }
      const at = tok.t === "at" ? tok.v.toLowerCase().replace(/^-[a-z]+-/, "") : undefined;
      if (at !== undefined) i++;
      const prelude = component([";", "{", "}"]);
      if (prelude === undefined) break;
      const end = toks[i];
      if (end?.t !== "{") {
        fail(`statement ${at !== undefined ? `@${at} ` : ""}${writeTokens(prelude).slice(0, 24)}`);
        break;
      }
      i++;
      if (at === undefined || DECLARATION_BLOCKS.has(at)) out.push({ at, prelude, declarations: declarations() });
      else if (GROUPS.has(at)) out.push({ at, prelude, rules: rules(true, depth + 1) });
      else fail(`at-rule @${at}`);
    }
    if (nested) fail("unbalanced {");
    return out;
  };
  const out = rules(false);
  return failed ? [] : out;
}

/** Rules back into CSS, from the parsed structure only. */
export function writeRules(rules: Rule[]): string {
  return rules
    .map((r) => {
      const head = (r.at !== undefined ? `@${r.at}${r.prelude.length ? " " : ""}` : "") + writeTokens(r.prelude);
      const body = r.rules ? writeRules(r.rules) : (r.declarations ?? []).map((d) => `${writeName(d.name, true)}:${writeTokens(d.value)};`).join("");
      return `${head}{${body}}`;
    })
    .join("");
}
