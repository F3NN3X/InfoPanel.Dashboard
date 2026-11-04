// Where G4 is enforced for theme packs: a pack's assets live in its own folder, so the loader refuses any URL that leaves
// it and any `@import`. The server's CSP allows remote images and fonts, so it does not do this job.

/** One spelling of a URL: no control character or backslash, no scheme (a drive letter is one) or root path, no `..` step. */
function plainRelative(u: string): boolean {
  if (!u || /[\u0000-\u001f\\]/.test(u)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("/")) return false;
  return !u.split(/[/?#]/).includes("..");
}

/**
 * Pack-relative as written and after percent-decoding: a server may decode before it joins the path, and `%5c`, `%2f` and
 * `%3a` then become separators. Decoded until stable (`%252e`); an invalid escape fails closed.
 */
export function isPackRelativeUrl(url: string): boolean {
  let u = url.trim();
  for (let round = 0; round < 5; round++) {
    if (!plainRelative(u)) return false;
    let next: string;
    try {
      next = decodeURIComponent(u);
    } catch {
      return false;
    }
    if (next === u) return true;
    u = next;
  }
  return false;
}

/** Functions whose string arguments name files. */
const URL_FUNCS = new Set(["image-set", "src", "image", "cross-fade"]);
/** Functions whose value cannot be known here: inside a URL function they could spell any URL. */
const DYNAMIC_FUNCS = new Set(["var", "env", "attr"]);
const IDENT = /[a-z0-9_-]/i;
/** A raw newline ends a string (CSS Syntax 4.3.5); an escaped one continues it. */
const NEWLINE = /[\n\r\f]/;
const CLOSER: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

/**
 * What is wrong with a pack's CSS, one line each (empty = fine). A scanner after CSS Syntax Level 3 section 4.3 reads
 * strings (a raw newline ends one), comments, identifiers, url tokens and the nesting of `()`, `[]` and `{}`, so nothing
 * hides in a string or a comment. It fails closed: a backslash outside a string (an escape could spell `url(` or `@import`),
 * a string or a `url(`, `image-set(` or `src(` that never closes, a `var()`, `env()` or `attr()` inside a URL function,
 * `@import`, and any URL that is not pack-relative are issues.
 */
export function packCssIssues(css: string): string[] {
  const issues: string[] = [];
  // the open blocks, innermost last: "(" "[" "{" or a function's lowercase name; a string inside a URL function is a URL
  const stack: string[] = [];
  const n = css.length;
  let i = 0;
  const string = (): string => {
    const q = css[i++];
    const from = i;
    // `\` + newline continues the string; `\` + CRLF is one newline
    while (i < n && css[i] !== q && !NEWLINE.test(css[i])) i += css[i] !== "\\" ? 1 : css[i + 1] === "\r" && css[i + 2] === "\n" ? 3 : 2;
    const value = css.slice(from, Math.min(i, n));
    if (css[i] === q) i++;
    else issues.push("unterminated string");
    return value;
  };
  const check = (url: string) => {
    if (!isPackRelativeUrl(url)) issues.push(`url ${url}`);
  };
  const inUrlFunc = () => stack.some((f) => URL_FUNCS.has(f));
  while (i < n) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
    } else if (c === '"' || c === "'") {
      const value = string();
      if (inUrlFunc()) check(value);
    } else if (c === "\\") {
      issues.push("css escape");
      i += 2;
    } else if (c === "@" || IDENT.test(c)) {
      const at = c === "@";
      const from = at ? ++i : i;
      while (i < n && IDENT.test(css[i])) i++;
      const name = css.slice(from, i).toLowerCase().replace(/^-[a-z]+-/, "");
      if (at && name === "import") issues.push("@import");
      if (!at && css[i] === "(") {
        i++;
        if (name === "url") {
          while (i < n && /\s/.test(css[i])) i++;
          if (css[i] === '"' || css[i] === "'") check(string());
          else {
            const start = i;
            while (i < n && css[i] !== ")") i++;
            const token = css.slice(start, i).trim();
            if (i < n && /[\s"'(]/.test(token)) issues.push(`bad url ${token}`);
            else if (i < n) check(token);
          }
          while (i < n && /\s/.test(css[i])) i++;
          if (css[i] === ")") i++;
          else issues.push("unterminated url(");
        } else {
          if (DYNAMIC_FUNCS.has(name) && inUrlFunc()) issues.push(`${name}() in a url function`);
          // `attr(x type(<url>))` reads a URL from an element attribute
          if (name === "type" && stack.includes("attr")) issues.push("type() in attr()");
          stack.push(name);
        }
      }
    } else {
      if (c === "(" || c === "[" || c === "{") stack.push(c);
      else if (c in CLOSER) {
        // a `)` closes a function or a bare `(`, never a `[` or `{` left open
        const top = stack.at(-1);
        if (top && (c === ")" ? top !== "[" && top !== "{" : top === CLOSER[c])) stack.pop();
      }
      i++;
    }
  }
  for (const f of stack) if (URL_FUNCS.has(f)) issues.push(`unterminated ${f}(`);
  return issues;
}
