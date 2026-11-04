#!/usr/bin/env node
// CI check of the deterministic bundle budgets (tools/perf/budgets.json) against the build in dist/: the kiosk and
// studio entry closures' gzip bytes, no React server renderer in the kiosk closure, and no debug-only globals in either.
// With --packs: each built-in pack's lazy chunks and assets against the `packs` block. Exit 1 on a breach.
//   npm run build && node tools/perf/check-budgets.mjs [--packs]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const budgets = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/perf/budgets.json"), "utf8"));

/**
 * The most an entry may weigh: its budget plus `entryGzipSlack` of it. The same build gzips a few bytes apart on Windows
 * and on each Linux runner image, so an exact budget fails on the platform it wasn't measured on.
 */
export const limitOf = (budget, b = budgets) => Math.floor(budget * (1 + (b.entryGzipSlack ?? 0)));

/** The breaches of a bundle report, as messages (empty when within budget). */
export function breaches(result, b = budgets) {
  const out = [];
  const { kiosk, studio } = result.entries;
  const kioskLimit = limitOf(b.kioskEntryGzipBytes, b);
  const studioLimit = limitOf(b.studioEntryGzipBytes, b);
  if (kiosk.jsGzip > kioskLimit) out.push(`kiosk entry ${kiosk.jsGzip} B gzip > ${kioskLimit} (budget ${b.kioskEntryGzipBytes} + slack)`);
  if (studio.jsGzip > studioLimit) out.push(`studio entry ${studio.jsGzip} B gzip > ${studioLimit} (budget ${b.studioEntryGzipBytes} + slack)`);
  if (kiosk.serverRenderer && !b.kioskServerRendererAllowed) out.push("react-dom/server code is in the kiosk closure");
  for (const [name, e] of Object.entries({ kiosk, studio })) for (const s of e.debugSymbols ?? []) out.push(`debug-only ${s} is in the ${name} closure`);
  return out;
}

/**
 * The breaches of the built-in packs' sizes (`measured`: id -> { codeGzip, assetBytes }) against `b.packs`, as messages.
 * A pack with no budget entry is a breach: its budget is set (measured + 25 %) in the change that adds the pack.
 */
export function packBreaches(measured, b = budgets) {
  const out = [];
  const packs = b.packs ?? {};
  const ceiling = packs.packCeilingBytes ?? 512000;
  for (const [id, m] of Object.entries(measured)) {
    const budget = Object.hasOwn(packs, id) ? packs[id] : undefined;
    if (!budget || typeof budget !== "object") {
      out.push(`pack ${id} has no entry in budgets.json packs`);
      continue;
    }
    if (m.codeGzip > budget.codeGzipBytes) out.push(`pack ${id} code ${m.codeGzip} B gzip > ${budget.codeGzipBytes}`);
    if (m.assetBytes > budget.assetBytes) out.push(`pack ${id} assets ${m.assetBytes} B > ${budget.assetBytes}`);
    if (m.codeGzip + m.assetBytes > ceiling) out.push(`pack ${id} is ${m.codeGzip + m.assetBytes} B, over the ${ceiling} B ceiling`);
  }
  return out;
}

const gzipSize = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
const dirBytes = (dir) =>
  fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? dirBytes(path.join(dir, e.name)) : fs.statSync(path.join(dir, e.name)).size), 0) : 0;

/** The built-in packs (src/looks/packs/<id>.ts{,x}) measured in `dist`: their chunks are the `assets/<id>-*.js|css` files. */
export function measurePacks(dist = path.join(ROOT, "dist"), root = ROOT) {
  const dir = path.join(root, "src/looks/packs");
  const ids = fs.existsSync(dir) ? fs.readdirSync(dir).flatMap((f) => (/^[\w-]+\.tsx?$/.test(f) ? [f.replace(/\.tsx?$/, "")] : [])) : [];
  const built = fs.existsSync(path.join(dist, "assets")) ? fs.readdirSync(path.join(dist, "assets")) : [];
  return Object.fromEntries(
    ids.map((id) => [
      id,
      {
        codeGzip: built.filter((f) => f.startsWith(`${id}-`) && /\.(js|css)$/.test(f)).reduce((n, f) => n + gzipSize(path.join(dist, "assets", f)), 0),
        assetBytes: dirBytes(path.join(dir, id, "assets")),
      },
    ])
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--packs")) {
    const measured = measurePacks();
    const found = packBreaches(measured);
    for (const [id, m] of Object.entries(measured)) console.log(`pack ${id}: ${m.codeGzip} B gzip code, ${m.assetBytes} B assets`);
    console.log(`${Object.keys(measured).length} built-in packs`);
    for (const b of found) console.error(`over budget: ${b}`);
    process.exit(found.length ? 1 : 0);
  }
  // Loaded here, so the tests import `breaches` without the report (Vitest can't transform it; Node runs it).
  const { report } = await import("./bundle-report.mjs");
  const result = report({ dist: path.join(ROOT, "dist") });
  const found = breaches(result);
  const { kiosk, studio } = result.entries;
  console.log(
    `kiosk ${kiosk.jsGzip} B gzip (budget ${budgets.kioskEntryGzipBytes}, limit ${limitOf(budgets.kioskEntryGzipBytes)}), studio ${studio.jsGzip} B gzip (budget ${budgets.studioEntryGzipBytes}, limit ${limitOf(budgets.studioEntryGzipBytes)}), server renderer in kiosk: ${kiosk.serverRenderer}`
  );
  for (const b of found) console.error(`over budget: ${b}`);
  process.exit(found.length ? 1 : 0);
}
