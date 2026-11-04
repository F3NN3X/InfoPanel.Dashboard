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

const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi;
const CSS_STRING_FUNC = /(?:image-set|src)\(([^)]*)\)/gi;
const CSS_STRING = /"([^"]*)"|'([^']*)'/g;

/** What is wrong with a pack's CSS, one line each (empty = fine): `@import`, an escaped at-rule name, and any URL that is not pack-relative. */
export function packCssIssues(css: string): string[] {
  const text = css.replace(CSS_COMMENT, "");
  const issues: string[] = [];
  if (/@import\b/i.test(text)) issues.push("@import");
  if (/@\\/.test(text)) issues.push("escaped at-rule");
  const urls = [...text.matchAll(CSS_URL)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");
  // image-set("a.png" 1x) and src("a.woff2") name a file without url()
  for (const f of text.matchAll(CSS_STRING_FUNC)) for (const s of f[1].matchAll(CSS_STRING)) urls.push(s[1] ?? s[2] ?? "");
  for (const u of urls) if (!isPackRelativeUrl(u)) issues.push(`url ${u}`);
  return issues;
}
