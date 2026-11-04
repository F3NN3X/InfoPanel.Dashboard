import { describe, expect, it } from "vitest";
import { PACK_IDS, type Pack } from "@/looks/pack";
import { BUILTIN, loadPack, packIssues, registerPack, unregisterPack } from "@/looks/pack-load";
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
    ["a rule that hides the page", { css: "body { display: none }" }],
    ["a rule that moves a card", { css: ".card { position: absolute }" }],
    ["a rule that scales everything", { css: "* { transform: scale(2) }" }],
    ["a size", { css: "[data-part=card] { width: 10px }" }],
    ["font-size", { css: "[data-part=card] { font-size: 40px }" }],
    ["!important", { css: "[data-part=card] { color: red !important }" }],
    ["a selector on :root", { css: ":root { color: red }" }],
    ["a selector on html", { css: "html .a { color: red }" }],
    ["a selector on :host", { css: ":host { color: red }" }],
    ["content outside a pseudo-element", { css: ".a { content: 'x' }" }],
    ["a rule that closes the scope", { css: ".a { color: red } } body { display: none } .b { color: red" }],
    ["an @layer or @scope of its own", { css: "@layer other { .a { color: red } }" }],
    ["a nested rule", { css: ".a { color: red; .b { display: none } }" }],
    ["a remote base", { base: "https://evil.example/" }],
    ["a protocol-relative base", { base: "//evil.example/" }],
    ["a base that climbs out", { base: "../../x/" }],
    ["a base without a closing slash", { base: "/packs/x" }],
    ["an id that is not a slug", { id: 'a"]{}' }],
    ["a Look id that is not the pack id", { look: { ...TEST_PACK.look, id: "other" } }],
    ["no supported modes", { look: { ...TEST_PACK.look, modes: {} as never } }],
  ] as [string, Partial<Pack>][])("refuses a pack with %s", async (_, patch) => {
    const pack = badPack(patch);
    expect(packIssues(pack).length).toBeGreaterThan(0);
    expect(await loadPack("test-pack", from(pack))).toBeUndefined();
  });

  it("takes paint properties, --pack-* custom properties, its own keyframes and font faces, and @media, scoped to the pack", () => {
    const css = [
      "[data-part=card] { background: linear-gradient(#000, #111); border-color: red; box-shadow: 0 0 4px red; --pack-glow: #f0f; font-family: pack-body; filter: saturate(1.2) }",
      ".a::before { background: red }",
      "@keyframes pack-pulse { from { opacity: 0.6 } 50% { opacity: 1 } to { opacity: 0.6 } }",
      "@font-face { font-family: pack-body; src: url(fonts/body.woff2) }",
      "@media (min-width: 600px) { .b { backdrop-filter: blur(12px); animation: pack-pulse 2s infinite } }",
    ].join(" ");
    expect(packIssues(badPack({ css }))).toEqual([]);
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
    try {
      registerPack("test-pack", async () => ({ default: TEST_PACK }));
      expect(PACK_IDS.has("test-pack")).toBe(true);
      expect((await loadPack("test-pack"))?.id).toBe("test-pack");
    } finally {
      unregisterPack("test-pack");
    }
  });
});
