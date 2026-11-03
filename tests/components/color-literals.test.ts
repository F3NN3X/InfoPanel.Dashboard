import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Hand-typed arbitrary colours in class names: `bg-[#hex]`, `[color:#hex]`, `[rgb(...)]`, `[hsl(...)]`, `[oklch(...)]`.
 * The tokens in `src/index.css` and `src/settings/tokens.css` replace them. Inline `style` hexes are not counted.
 */
const LITERAL = /\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch)\(|[a-z-]+:#[0-9a-fA-F]{3,8})/g;

// The count across src after the FND-030 sweep. Lower it when you remove a literal; never raise it: use a token instead.
const MAX_LITERALS = 120;

// Arbitrary text sizes (`text-[13px]`) left in src/components/studio after the A-18 sweep.
const MAX_ARBITRARY_TEXT = 54;

// Files that hold literal palettes on purpose.
const EXCLUDED = new Set([
  // the widget theme: its values are mirrored as hex in the InfoPanel gauge export
  "src/widgets/core/theme.ts",
  // the mirror of that theme baked into exported gauge frames
  "src/lib/infopanel/gauges/vector.ts",
]);

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = `${dir}/${e.name}`;
    return e.isDirectory() ? files(path) : /\.(tsx?|css)$/.test(e.name) && !EXCLUDED.has(path) ? [join(path)] : [];
  });

describe("colour literals in the UI", () => {
  it("does not grow back in src", () => {
    const count = files("src").reduce((n, f) => n + (readFileSync(f, "utf8").match(LITERAL)?.length ?? 0), 0);
    expect(count).toBeLessThanOrEqual(MAX_LITERALS);
  });

  it("keeps the studio's type on the scale", () => {
    // `text-micro`, `text-caption`, `text-body` and `text-title` are the scale; 11.5 and 12.5 px were swept onto it. Lower the cap as the rest moves; never raise it.
    const count = files("src/components/studio").reduce((n, f) => n + (readFileSync(f, "utf8").match(/text-\[\d/g)?.length ?? 0), 0);
    expect(count).toBeLessThanOrEqual(MAX_ARBITRARY_TEXT);
  });
});
