import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FALLBACK_ICON, iconFor } from "../../../src/widgets/core/icons.ts";

/** The icon names no map knows yet: `iconFor` returns the dashed circle for them. P8 maps each one and takes it off this list. */
const KNOWN_GAPS: Record<string, string> = {
  event: "Countdown",
  chevron_left: "StreamDeck",
  chevron_right: "StreamDeck",
  cloud_off: "StreamDeck",
  error: "StreamDeck",
  link: "StreamDeck",
  power_settings_new: "StreamDeck",
  sync: "StreamDeck",
  speaker: "WaveLink",
};

const root = new URL("../../../src/widgets/", import.meta.url);

/** Every `.ts` / `.tsx` file under src/widgets (the widget `meta/` files included). */
function sources(dir: URL): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const child = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
    return e.isDirectory() ? sources(child) : /\.tsx?$/.test(e.name) ? [fileURLToPath(child)] : [];
  });
}

/** The literal icon names widgets pass: `<Icon name="x"`, `icon="x"`, `icon: "x"` and `icon={c ? "a" : "b"}`. */
function usedNames(): Map<string, string> {
  const re = /(?:<Icon name|\bicon)\s*[=:]\s*\{?\s*(?:[^"'?{}\n]*\?\s*)?"([a-z_]+)"(?:\s*:\s*"([a-z_]+)")?/g;
  const used = new Map<string, string>();
  for (const file of sources(root)) {
    for (const m of readFileSync(file, "utf8").matchAll(re)) {
      for (const name of [m[1], m[2]]) if (name && !used.has(name)) used.set(name, file.replaceAll("\\", "/").split("/widgets/")[1]);
    }
  }
  return used;
}

describe("the icon names widgets use", () => {
  const used = usedNames();
  const unmapped = (name: string) => iconFor(name) === FALLBACK_ICON;

  it("finds the names (the scan itself still works)", () => {
    expect(used.size).toBeGreaterThan(60);
    expect(used.has("memory")).toBe(true);
  });

  it("all resolve in iconFor's maps, except the known gaps", () => {
    const missing = [...used].filter(([name]) => unmapped(name) && !(name in KNOWN_GAPS)).map(([name, file]) => `${name} (${file})`);
    expect(missing).toEqual([]);
  });

  it("still lack a mapping for each known gap, so P8 removes the ones it fixes", () => {
    const fixed = Object.keys(KNOWN_GAPS).filter((name) => !unmapped(name));
    expect(fixed).toEqual([]);
  });

  it("are still used by the widget the known gap names", () => {
    const stale = Object.keys(KNOWN_GAPS).filter((name) => !used.has(name));
    expect(stale).toEqual([]);
  });
});
