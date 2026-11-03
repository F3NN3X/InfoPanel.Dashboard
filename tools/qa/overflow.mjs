#!/usr/bin/env node
// The overflow runner: drives the Widget QA page (`?widget-qa`, a scratch server on seeded demo data with
// DASHBOARD_DEBUG=1) at 1x1, 2x2, 4x2 and 4x4, mounts every widget (`window.__qaMountAll`), reads the probe
// (`window.__qaOverflow`, src/widgets/widget-qa/probe.ts) and records, per widget and span, the card and body rects,
// the descendant count, the text and the issues. Two runs diff (diffRuns): a new issue, or any other change at a span
// that is not roomy (4x4 is), fails. Needs `npm run build` and the debug ips-server first (the `overflow` check does both).
//   node tools/qa/overflow.mjs                          run and print the issue count, exit 0
//   node tools/qa/overflow.mjs --save <file>            also write the run to <file> (how a baseline is refreshed)
//   node tools/qa/overflow.mjs --baseline <file>        diff against <file>; exit 1 on a failing change
//   --module a,b   only those widgets (ids, legacy ones too)      --spans 1x1,2x2   other spans
// Known limit: the probe walks elements, so it cannot see pseudo-elements (::before, ::after); a widget that draws
// part of its content there is only checked through its element box.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startScratch } from "../perf/scratch.mjs";
import { diffRuns } from "./overflow-diff.mjs";

const VALUED = new Set(["--save", "--baseline", "--module", "--spans"]);
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!VALUED.has(argv[i]) || !argv[i + 1]) {
    console.error(`overflow: unknown or incomplete argument: ${argv[i]}\nusage: node tools/qa/overflow.mjs [--save file] [--baseline file] [--module a,b] [--spans 1x1,2x2,4x2,4x4]`);
    process.exit(2);
  }
  args[argv[i].slice(2)] = argv[++i];
}
const spans = args.spans ?? "1x1,2x2,4x2,4x4";

/** Runs in the page: one record per widget frame, keyed `<module>@<span>`. */
function collect() {
  const report = window.__qaOverflow();
  const figs = [...document.querySelectorAll("figure[data-qa-module]")];
  const round = (v) => Math.round(v * 100) / 100;
  const frames = {};
  report.forEach((r, i) => {
    const box = figs[i].querySelector("[data-qa-box]");
    const rect = (el) => {
      if (!el) return null;
      const a = el.getBoundingClientRect();
      const o = box.getBoundingClientRect();
      return [a.left - o.left, a.top - o.top, a.width, a.height].map(round);
    };
    const card = box.querySelector("[data-wp-tier]");
    frames[`${r.module}@${r.span}`] = {
      span: r.span,
      issues: r.issues.map((x) => `${x.kind}|${x.selector}|${x.dx}|${x.dy}`),
      card: rect(card),
      body: rect(box.querySelector("[data-wp-body]")),
      n: box.querySelectorAll("*").length,
      text: box.textContent.replace(/\s+/g, " ").trim(),
      view: card?.getAttribute("data-wp-view") ?? null,
    };
  });
  return frames;
}

const scratch = await startScratch({ env: { DASHBOARD_DEBUG: "1" } });
const browser = await chromium.launch({ headless: true });
let frames;
try {
  // A fixed clock and zone: reset times and clocks on the fixtures are "now plus", so the text would differ per run.
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, timezoneId: "UTC", locale: "en-US" });
  await page.clock.setFixedTime(new Date("2026-01-15T12:00:00Z"));
  const module = args.module ? `&module=${args.module}` : "";
  await page.goto(`${scratch.base}/?widget-qa${module}&spans=${spans}&eager=1`);
  await page.waitForFunction(() => window.__qaMountAll && window.__qaOverflow, null, { timeout: 30_000 });
  await page.evaluate(() => window.__qaMountAll());
  frames = await page.evaluate(collect);
} finally {
  await browser.close();
  scratch.stop();
}

const issueCount = Object.values(frames).reduce((n, f) => n + f.issues.length, 0);
console.log(`overflow: ${Object.keys(frames).length} frames, ${issueCount} issues`);
if (args.save) {
  fs.mkdirSync(path.dirname(path.resolve(args.save)), { recursive: true });
  fs.writeFileSync(args.save, `${JSON.stringify({ version: 1, spans, frames }, null, 1)}\n`);
  console.log(`overflow: saved ${args.save}`);
}
if (args.baseline) {
  const base = JSON.parse(fs.readFileSync(args.baseline, "utf8"));
  // A partial run (--module) compares only the frames it made.
  const scoped = args.module ? Object.fromEntries(Object.entries(base.frames).filter(([k]) => k in frames)) : base.frames;
  const d = diffRuns(scoped, frames);
  const show = (title, list) => list.length && console.log(`${title} (${list.length}):\n${list.slice(0, 40).map((x) => `  ${x.slice(0, 240)}`).join("\n")}`);
  show("new issues", d.newIssues);
  show("issues gone", d.goneIssues);
  show("changed", d.changes);
  show("missing frames", d.missing);
  show("added frames", d.added);
  if (d.failing.length) {
    console.error(`overflow: ${d.failing.length} failing change(s) against ${args.baseline}; if they are intended, refresh it with --save`);
    process.exit(1);
  }
  console.log(`overflow: matches ${args.baseline}`);
}
