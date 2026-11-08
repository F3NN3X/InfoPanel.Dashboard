#!/usr/bin/env node
// Release feed guard: the shared updater-beta feed (latest.json) must never move to an older version.
//   node tools/ci/feed-newer.mjs --version <X.Y.Z[-pre]> [--feed <current latest.json>]
// Prints `write` when the feed is missing, unreadable or not newer than `--version`, `skip` when it already holds a
// newer one (the reason goes to stderr). Exit 0, or 2 on a usage error. Node built-ins only.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/** A version split into `{ core: [major, minor, patch], pre: string[] }`, or null when it is not semver. */
export function parseVersion(text) {
  const m = SEMVER.exec(String(text).trim());
  return m ? { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split(".") : [] } : null;
}

const numeric = (id) => /^\d+$/.test(id);

/** Semver precedence: -1, 0 or 1. A release outranks its prereleases; prerelease identifiers compare one by one. */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new Error(`not a semver version: ${x ? b : a}`);
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    if (numeric(p) && numeric(q)) return Number(p) < Number(q) ? -1 : 1;
    if (numeric(p) !== numeric(q)) return numeric(p) ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return 0;
}

/** `{ write, reason }`: whether `version` may replace the feed's `feedVersion` (undefined when there is no feed). */
export function decideFeed({ version, feedVersion }) {
  if (feedVersion === undefined || !parseVersion(feedVersion)) return { write: true, reason: "the feed has no usable version" };
  if (compareVersions(feedVersion, version) > 0) return { write: false, reason: `the feed already holds ${feedVersion}, newer than ${version}` };
  return { write: true, reason: `${version} is not older than the feed's ${feedVersion}` };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
  const version = arg("--version");
  if (!version || !parseVersion(version)) {
    console.error("usage: feed-newer.mjs --version <X.Y.Z[-pre]> [--feed <latest.json>]");
    process.exit(2);
  }
  let feedVersion;
  try {
    feedVersion = JSON.parse(fs.readFileSync(arg("--feed"), "utf8")).version;
  } catch {}
  const { write, reason } = decideFeed({ version, feedVersion });
  console.error(`feed guard: ${reason}`);
  console.log(write ? "write" : "skip");
}
