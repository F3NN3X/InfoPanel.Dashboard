import { describe, expect, it } from "vitest";
import { PACK_IDS, type Pack } from "@/looks/pack";
import { BUILTIN, loadPack, packIssues, registerPack } from "@/looks/pack-load";
import { badPack, TEST_PACK } from "./__fixtures__/test-pack";

const from = (pack: Pack) => ({ [pack.id]: async () => ({ default: pack }) });

describe("the pack loader (G4)", () => {
  it("loads a pack that passes every check", async () => {
    expect(packIssues(TEST_PACK)).toEqual([]);
    expect(await loadPack("test-pack", from(TEST_PACK))).toEqual({ ...TEST_PACK, Stage: expect.any(Function) });
  });

  it.each([
    ["a remote url in the CSS", { css: ".a { background: url(https://evil.example/x.png) }" }],
    ["an @import in the CSS", { css: '@import "other.css";' }],
    ["an escaped url( in the CSS", { css: String.raw`.a { background: u\72l(//evil.example/x.png) }` }],
    ["a remote asset path", { assets: ["https://evil.example/x.woff2"] }],
    ["an asset path that climbs out of the folder", { assets: ["../../x.png"] }],
    ["a root asset path", { assets: ["/etc/passwd"] }],
    ["a stage image that leaves the folder", { stage: { layers: [{ image: "..%2fx.png" }] } }],
    ["a stage image with a quote", { stage: { layers: [{ image: 'a".png' }] } }],
    ["a stage fill that is an image", { stage: { layers: [{ fill: "url(https://evil.example/x.png)" }] } }],
    ["four stage layers", { stage: { layers: [{}, {}, {}, {}] } }],
  ] as [string, Partial<Pack>][])("refuses a pack with %s", async (_, patch) => {
    const pack = badPack(patch);
    expect(packIssues(pack).length).toBeGreaterThan(0);
    expect(await loadPack("test-pack", from(pack))).toBeUndefined();
  });

  it("refuses an unknown id, an inherited key and a module that is another pack", async () => {
    expect(await loadPack("nope", from(TEST_PACK))).toBeUndefined();
    expect(await loadPack("constructor", from(TEST_PACK))).toBeUndefined();
    expect(await loadPack("other", from(TEST_PACK) as never)).toBeUndefined();
    expect(await loadPack("test-pack", { "test-pack": async () => ({ default: { ...TEST_PACK, id: "other" } }) })).toBeUndefined();
  });

  it("keeps a gradient numeral at 3:1 on the Look's surface, in every mode it supports", () => {
    const withFill = (fill: string): Pack => ({ ...TEST_PACK, look: { ...TEST_PACK.look, t3: { ...TEST_PACK.look.t3, "num-fill": fill } } });
    expect(packIssues(withFill("linear-gradient(#ffffff, #f4f4f5)"))).toEqual([]);
    // dark surface #18181b: a near-black stop is unreadable
    expect(packIssues(withFill("linear-gradient(#ffffff, #202024)")).join()).toMatch(/under 3:1/);
    expect(packIssues(withFill("linear-gradient(oklch(80% 0.1 30), #ffffff)")).join()).toMatch(/cannot be checked/);
    // the light surface (#f4f4f5) makes the same white stop unreadable once the Look supports light
    const both = { ...TEST_PACK, look: { ...TEST_PACK.look, modes: { supported: ["dark", "light"] as ("dark" | "light")[] } } };
    expect(packIssues(both).join()).toMatch(/#ffffff is 1\.\d+:1 on the surface in light/);
    expect(packIssues(withFill("url(https://evil.example/x.png)")).join()).toMatch(/not a gradient/);
  });

  it("registers a source and its id, and the shipped id list matches the built-in sources", async () => {
    expect(Object.keys(BUILTIN).filter((id) => id !== "test-pack").sort()).toEqual([...PACK_IDS].filter((id) => id !== "test-pack").sort());
    registerPack("test-pack", async () => ({ default: TEST_PACK }));
    expect(PACK_IDS.has("test-pack")).toBe(true);
    expect((await loadPack("test-pack"))?.id).toBe("test-pack");
    delete BUILTIN["test-pack"];
    PACK_IDS.delete("test-pack");
  });
});
