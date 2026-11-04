import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FALLBACK_ICON, iconFor } from "../../../src/widgets/core/icons.ts";

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

  it("all resolve in iconFor's maps", () => {
    const missing = [...used].filter(([name]) => unmapped(name)).map(([name, file]) => `${name} (${file})`);
    expect(missing).toEqual([]);
  });
});
