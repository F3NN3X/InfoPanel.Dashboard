// The D9 scans, report-only until P7 makes them gates: colour literals outside src/looks/, blur outside the blur cap,
// and ui-* tokens in widgets. Prints the counts per rule and per file; always exits 0.
//   node tools/looks/scan.mjs [--files]    --files lists the lines too
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const list = process.argv.includes("--files");
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = `${dir}/${e.name}`;
    return e.isDirectory() ? files(path) : /\.(tsx?|css)$/.test(e.name) ? [path] : [];
  });
const all = files("src");
const under = (prefixes) => (f) => prefixes.some((p) => f.startsWith(p));

const rules = [
  {
    name: "hex outside src/looks/",
    pattern: /#[0-9a-fA-F]{6}\b/g,
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
    skip: under(["src/widgets/widget-qa/"]),
  },
];

for (const rule of rules) {
  const hits = [];
  for (const f of all) {
    if (rule.only && !rule.only(f)) continue;
    if (rule.skip?.(f)) continue;
    readFileSync(f, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (rule.lineSkip?.test(line)) return;
        const n = line.match(rule.pattern)?.length ?? 0;
        if (n) hits.push({ f, line: i + 1, n, text: line.trim().slice(0, 120) });
      });
  }
  const perFile = new Map();
  for (const h of hits) perFile.set(h.f, (perFile.get(h.f) ?? 0) + h.n);
  console.log(`${rule.name}: ${[...perFile.values()].reduce((a, b) => a + b, 0)} in ${perFile.size} files (report only)`);
  if (list) for (const h of hits) console.log(`  ${join(h.f)}:${h.line}  ${h.text}`);
  else for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${n}  ${f}`);
}
