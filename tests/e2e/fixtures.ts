import fs from "node:fs";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { startScratch, FIXTURE_DIR, type Scratch } from "../../tools/perf/scratch.mjs";

/** tests/fixtures/perf/fixture.json: the fixture's profile and zone ids (tools/perf/make-fixture.mjs). */
export interface FixtureManifest {
  profiles: { heavy: string; light: string; viz: string };
  zones: { heavy: string[]; light: string[]; viz: string[] };
  gaugeIconZone: string;
  /** Studio zones (`data-zone-id`). */
  zoneSelector: string;
  /** Kiosk zones, in placement order (the kiosk marks none). */
  kioskZoneSelector: string;
  sensorKeys: string[];
  configVersion: number;
}

export const manifest: FixtureManifest = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, "..", "fixture.json"), "utf8"));

/** InfoPanel's default Data API: the real one on a dev machine, nothing in CI. Pages must use the fake one. */
export const DEFAULT_DATA_API = "http://127.0.0.1:3921/**";

/** Each test gets its own scratch server, so a spec that saves the config can't leak into another. */
export const test = base.extend<{ scratch: Scratch }>({
  // Refused like on a machine without InfoPanel, so a page that reaches for it fails here as in CI.
  context: async ({ context }, use) => {
    await context.route(DEFAULT_DATA_API, (route) => route.abort("connectionrefused"));
    await use(context);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads a fixture's dependencies from this destructuring.
  scratch: async ({}, use) => {
    const scratch = await startScratch();
    await use(scratch);
    scratch.stop();
  },
});

export { expect };

/** Collect console errors and failed requests from a page (the kiosk must load clean). */
export function watchErrors(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    // An EventSource closed by navigation or teardown reports as aborted; that is not a load failure.
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  return { errors };
}

/** POST a whole config the way the studio does (the write header `configWriteRefusal` asks for). */
export async function saveConfig(base: string, config: unknown): Promise<Response> {
  return fetch(`${base}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-dashboard-config": "1" },
    body: JSON.stringify(config),
  });
}

/**
 * Waits until the page has stopped moving: the fonts are loaded and the rects of `selector` and of the island have not changed for 8
 * frames in a row. A pack spec reads geometry, text and layers after it, in place of a fixed wait that a slow run could beat (L77).
 */
export async function settled(page: Page, selector: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    (sel) => {
      const w = window as unknown as { __still?: number; __snap?: string };
      const rects = [...document.querySelectorAll(`${sel}, [data-island]`)].map((e) => {
        const r = e.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map(Math.round).join(",");
      });
      const snap = `${rects.join("|")}#${document.fonts.size}`;
      w.__still = [...document.fonts].every((f) => f.status !== "loading") && snap === w.__snap ? (w.__still ?? 0) + 1 : 0;
      w.__snap = snap;
      return w.__still >= 8;
    },
    selector,
    { polling: "raf", timeout: 15_000 }
  );
}

/**
 * Runs in the page (Widget QA): for every ring, bar and meter of every frame, in document order, whether it draws a value mark (a ring's
 * arc with a stroke, a bar's or meter's painted cell that is not the track). A worn pack must light each gauge the same widget lights
 * without it: a screen-wide "some are lit" would pass a pack that hides half of them (L79).
 */
export function gaugeInk(): { key: string; lit: boolean }[] {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  const alpha = (c: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[3] / 255;
  };
  const probe = document.createElement("i");
  probe.style.background = "var(--w-track)";
  const out: { key: string; lit: boolean }[] = [];
  document.querySelectorAll("figure[data-qa-module]").forEach((fig, i) => {
    const card = fig.querySelector("[data-wp-tier]");
    if (!card) return;
    card.appendChild(probe);
    const track = getComputedStyle(probe).backgroundColor;
    probe.remove();
    fig.querySelectorAll('[data-part="ring"], [data-part="bar"], [data-part="meter"]').forEach((gauge, n) => {
      const ring = gauge.getAttribute("data-part") === "ring";
      const marks = [...gauge.querySelectorAll(ring ? "circle[data-wp-ring]" : "*")].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || Number(cs.opacity) < 0.1) return false;
        if (ring) return cs.stroke !== "none" && alpha(cs.stroke) > 0 && Number(cs.strokeOpacity) > 0.1;
        return (alpha(cs.backgroundColor) > 0 && cs.backgroundColor !== track) || cs.backgroundImage !== "none";
      });
      out.push({ key: `${i}:${fig.getAttribute("data-qa-module")}#${n}`, lit: marks.length > 0 });
    });
  });
  return out;
}
