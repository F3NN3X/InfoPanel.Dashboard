// Where G4 is enforced for theme packs: a pack's assets live in its own folder, so the loader refuses any URL that leaves
// it and any `@import`. The server's CSP allows remote images and fonts, so it does not do this job.

/** A scheme (`https:`, `data:`, `javascript:`), a protocol-relative `//`, a root path, a backslash, or a `..` step. */
export function isPackRelativeUrl(url: string): boolean {
  const u = url.trim();
  if (!u || /[\u0000-\u001f\\]/.test(u)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("/")) return false;
  let decoded = u;
  try {
    decoded = decodeURIComponent(u);
  } catch {
    return false;
  }
  return !decoded.split(/[/?#]/).includes("..");
}

/** Functions whose string arguments name files. */
const URL_FUNCS = new Set(["image-set", "src", "image"]);
const IDENT = /[a-z0-9_-]/i;

/**
 * What is wrong with a pack's CSS, one line each (empty = fine). A small scanner reads strings, comments, identifiers and
 * parentheses, so nothing hides in a string or a comment; it fails closed: a backslash outside a string (an escape could
 * spell `url(` or `@import`) and any `url(`, `image-set(` or `src(` that never closes are issues, as are `@import` and any
 * URL that is not pack-relative.
 */
export function packCssIssues(css: string): string[] {
  const issues: string[] = [];
  // the open functions, innermost last: a string inside an image-set() or src() is a URL
  const stack: string[] = [];
  const n = css.length;
  let i = 0;
  const string = (): string => {
    const q = css[i++];
    const from = i;
    while (i < n && css[i] !== q) i += css[i] === "\\" ? 2 : 1;
    const value = css.slice(from, i);
    i++;
    return value;
  };
  const check = (url: string) => {
    if (!isPackRelativeUrl(url)) issues.push(`url ${url}`);
  };
  while (i < n) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
    } else if (c === '"' || c === "'") {
      const value = string();
      if (stack.some((f) => URL_FUNCS.has(f))) check(value);
    } else if (c === "\\") {
      issues.push("css escape");
      i += 2;
    } else if (c === "@" || IDENT.test(c)) {
      const at = c === "@";
      const from = at ? ++i : i;
      while (i < n && IDENT.test(css[i])) i++;
      const name = css.slice(from, i).toLowerCase().replace(/^-(?:webkit|moz|o|ms)-/, "");
      if (at && name === "import") issues.push("@import");
      if (!at && css[i] === "(") {
        i++;
        if (name === "url") {
          while (i < n && /\s/.test(css[i])) i++;
          if (css[i] === '"' || css[i] === "'") check(string());
          else {
            const from = i;
            while (i < n && css[i] !== ")") i++;
            if (i < n) check(css.slice(from, i).trim());
          }
          while (i < n && /\s/.test(css[i])) i++;
          if (css[i] === ")") i++;
          else issues.push("unterminated url(");
        } else stack.push(name);
      }
    } else if (c === ")") {
      stack.pop();
      i++;
    } else i++;
  }
  for (const f of stack) if (URL_FUNCS.has(f)) issues.push(`unterminated ${f}(`);
  return issues;
}
