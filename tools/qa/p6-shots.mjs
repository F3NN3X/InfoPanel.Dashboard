#!/usr/bin/env node
// Screenshots of every widget kind on a material: one PNG per widget under <outdir>/<surface>/ (the Look System P6 record;
// tools/qa/p6-sheet.py joins them into a sheet).
//   node tools/qa/p6-shots.mjs <outdir> <surface>[,<surface>...] [--spans 2x2] [--widgets A,B]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { startScratch } from "../perf/scratch.mjs";

const [outDir, surfaces = "matte-light"] = process.argv.slice(2);
const flag = (name, fallback) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback);
const spans = flag("spans", "2x2");
const only = flag("widgets", "");
fs.mkdirSync(outDir, { recursive: true });
const scratch = await startScratch({ env: { DASHBOARD_DEBUG: "1" } });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 }, timezoneId: "UTC", locale: "en-US" });
  await page.clock.setFixedTime(new Date("2026-01-15T12:00:00Z"));
  for (const surface of surfaces.split(",")) {
    await page.goto(`${scratch.base}/?widget-qa&spans=${spans}&eager=1&surface=${surface}${only ? `&module=${only}` : ""}`);
    await page.waitForFunction(() => window.__qaMountAll && window.__qaOverflow, null, { timeout: 30_000 });
    await page.evaluate(() => window.__qaMountAll());
    const dir = path.join(outDir, surface);
    fs.mkdirSync(dir, { recursive: true });
    const figs = page.locator("figure[data-qa-module]");
    const n = await figs.count();
    for (let i = 0; i < n; i++) {
      const fig = figs.nth(i);
      const name = await fig.getAttribute("data-qa-module");
      await fig.locator("[data-qa-box]").first().screenshot({ path: path.join(dir, `${name}.png`) });
    }
    console.log(`p6-shots: ${n} widgets in ${dir}`);
  }
} finally {
  await browser.close();
  scratch.stop();
}
