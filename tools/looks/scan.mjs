// The D9 scans, gates since P7: colour literals outside src/looks/, blur outside the blur cap, and ui-* tokens in
// widgets. `scan()` returns the hits; tests/looks/scan.test.ts holds each file to its count in
// tests/looks/scan-baseline.json (a ratchet: counts only go down, a new file starts at 0).
//   node tools/looks/scan.mjs [--files]    prints the counts per rule and per file; --files lists the lines too
//   node tools/looks/scan.mjs --save       rewrites the baseline from the tree (only to lower it)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const path = `${dir}/${e.name}`;
    return e.isDirectory() ? files(path) : /\.(tsx?|css)$/.test(e.name) ? [path] : [];
  });
const under = (prefixes) => (f) => prefixes.some((p) => f.startsWith(p));
// The @generated blocks are written from the Looks; the scan reads what is typed by hand (the lines stay in place).
const GENERATED = /\/\* @generated:begin ([\w-]+)[\s\S]*?@generated:end \1 \*\//g;
const handWritten = (text) => text.replace(GENERATED, (block) => block.replace(/[^\n]/g, ""));

export const RULES = [
  {
    name: "hex outside src/looks/",
    pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6})\b/g,
    // vendored art, screen-template data, dev pages, the QA page, frozen migration data
    skip: (f) => /\.cases\.ts$/.test(f) || under(["src/looks/", "src/assets/", "src/lib/screen-templates/", "src/lib/infopanel/templates/", "src/dev/", "src/widgets/widget-qa/", "src/widgets/__fixtures__/"])(f),
  },
  {
    name: "blur outside the cap",
    pattern: /backdrop-blur[\w-]*|(?<!backdrop-)blur\(\d+px\)|drop-shadow\(/g,
    // the cap helper's own lines are skipped below; allowed: the privacy blur, the cover art, page media, island keyframes
    skip: under(["src/widgets/core/views.tsx", "src/widgets/NetworkAdapters.tsx", "src/widgets/NowPlaying.tsx", "src/lib/appearance.ts", "src/index.css", "src/widgets/widget-qa/"]),
    lineSkip: /wp-blur-cap/,
  },
  {
    name: "ui-* in widgets",
    pattern: /(?<![\w-])(?:--ui-|[\w:]*-ui-)[a-z0-9-]+/g,
    only: under(["src/widgets/"]),
    // the Widget QA page and the two dev galleries
    skip: under(["src/widgets/widget-qa/", "src/widgets/core/viz/viz-gallery.tsx"]),
  },
];

/** Every hit: `{ rule, file, line, n, text }`. */
export function scan() {
  const all = files("src");
  return RULES.flatMap((rule) =>
    all.flatMap((f) => {
      if ((rule.only && !rule.only(f)) || rule.skip?.(f)) return [];
      return handWritten(readFileSync(join(root, f), "utf8"))
        .split(/\r?\n/)
        .flatMap((line, i) => {
          if (rule.lineSkip?.test(line)) return [];
          const n = line.match(rule.pattern)?.length ?? 0;
          return n ? [{ rule: rule.name, file: f, line: i + 1, n, text: line.trim().slice(0, 120) }] : [];
        });
    }),
  );
}

/** `{ [rule]: { [file]: count } }` */
export function counts(hits = scan()) {
  const out = Object.fromEntries(RULES.map((r) => [r.name, {}]));
  for (const h of hits) out[h.rule][h.file] = (out[h.rule][h.file] ?? 0) + h.n;
  return out;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const hits = scan();
  const byRule = counts(hits);
  if (process.argv.includes("--save")) {
    const sorted = Object.fromEntries(Object.entries(byRule).map(([r, m]) => [r, Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)))]));
    writeFileSync(join(root, "tests/looks/scan-baseline.json"), `${JSON.stringify(sorted, null, 2)}\n`);
  }
  for (const [rule, perFile] of Object.entries(byRule)) {
    console.log(`${rule}: ${Object.values(perFile).reduce((a, b) => a + b, 0)} in ${Object.keys(perFile).length} files`);
    if (process.argv.includes("--files")) for (const h of hits.filter((x) => x.rule === rule)) console.log(`  ${h.file}:${h.line}  ${h.text}`);
    else for (const [f, n] of Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${n}  ${f}`);
  }
}
