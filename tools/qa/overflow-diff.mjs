// The comparison behind tools/qa/overflow.mjs: two runs (frame key -> record) in, what changed out. Pure; no I/O.

/** Spans where a change is reported but only new issues fail: there is room, so a change there is rarely a regression. */
export const ROOMY_SPANS = ["4x4"];

const FIELDS = ["card", "body", "n", "view", "text"];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @param {Record<string, {span: string, issues: string[], card: number[]|null, body: number[]|null, n: number, text: string, view: string|null}>} base
 * @param {typeof base} next
 * @returns {{newIssues: string[], goneIssues: string[], changes: string[], failing: string[], missing: string[], added: string[]}}
 *   `failing` is what fails a run: a new issue anywhere, any other change (or a lost frame) at a span that is not roomy.
 */
export function diffRuns(base, next) {
  const out = { newIssues: [], goneIssues: [], changes: [], failing: [], missing: [], added: [] };
  for (const [key, a] of Object.entries(base)) {
    const b = next[key];
    if (!b) {
      out.missing.push(key);
      if (!ROOMY_SPANS.includes(a.span)) out.failing.push(`${key} is gone`);
      continue;
    }
    for (const x of b.issues) if (!a.issues.includes(x)) out.newIssues.push(`${key} ${x}`);
    for (const x of a.issues) if (!b.issues.includes(x)) out.goneIssues.push(`${key} ${x}`);
    const changed = FIELDS.filter((f) => !same(a[f], b[f]));
    if (!same(a.issues, b.issues)) changed.push("issues");
    if (changed.length === 0) continue;
    const line = `${key} ${changed.join(", ")}`;
    out.changes.push(line);
    if (!ROOMY_SPANS.includes(a.span)) out.failing.push(line);
  }
  for (const key of Object.keys(next)) if (!base[key]) out.added.push(key);
  out.failing.push(...out.newIssues.map((x) => `new issue: ${x}`));
  return out;
}
