// The widget SDK's .d.ts (public/widget-sdk/, written by tools/widgets/sdk-types.mjs) stays in step with the types it is made from:
// its header lists every source file with the hash of its text, so a change to any of them without writing the file again fails
// here, without running TypeScript (the generator itself checks that the file compiles before it writes it).
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { listedSources, OUT, sourceHash } from "../../../tools/widgets/sdk-types.mjs";

const text = readFileSync(new URL(`../../../${OUT}`, import.meta.url), "utf8");

describe("widget SDK types", () => {
  it("name the SDK entry and the widget definition among their sources", () => {
    const paths = listedSources(text).map((s) => s.path);
    expect(paths).toContain("src/widgets/sdk.ts");
    expect(paths).toContain("src/widgets/define.ts");
    expect(paths).toContain("src/widgets/core/primitives.tsx");
    expect(text).toContain('declare module "infopanel-studio/widget-sdk"');
  });

  it("were written from the sources as they are now (else: node tools/widgets/sdk-types.mjs)", () => {
    const stale = listedSources(text).filter((s) => !existsSync(new URL(`../../../${s.path}`, import.meta.url)) || sourceHash(s.path) !== s.sha256);
    expect(stale.map((s) => s.path)).toEqual([]);
  });
});
