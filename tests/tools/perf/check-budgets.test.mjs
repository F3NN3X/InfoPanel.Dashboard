import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { breaches, limitOf, measurePacks, packBreaches } from "../../../tools/perf/check-budgets.mjs";

const b = { kioskEntryGzipBytes: 1000, studioEntryGzipBytes: 2000, entryGzipSlack: 0.01, kioskServerRendererAllowed: false };
const result = (kiosk, studio, extra = {}) => ({ entries: { kiosk: { jsGzip: kiosk, serverRenderer: false, ...extra }, studio: { jsGzip: studio } } });

describe("check-budgets", () => {
  it("lets an entry go over its budget by the slack, and no further", () => {
    expect(limitOf(1000, b)).toBe(1010);
    expect(breaches(result(1010, 2020), b)).toEqual([]);
    expect(breaches(result(1011, 2021), b)).toEqual(["kiosk entry 1011 B gzip > 1010 (budget 1000 + slack)", "studio entry 2021 B gzip > 2020 (budget 2000 + slack)"]);
  });

  it("holds an entry to its exact budget when no slack is set", () => {
    const exact = { ...b, entryGzipSlack: undefined };
    expect(breaches(result(1001, 2000), exact)).toEqual(["kiosk entry 1001 B gzip > 1000 (budget 1000 + slack)"]);
  });

  it("still refuses the server renderer in the kiosk whatever the size", () => {
    expect(breaches(result(10, 10, { serverRenderer: true }), b)).toEqual(["react-dom/server code is in the kiosk closure"]);
  });
});

describe("packBreaches", () => {
  const packs = { packCeilingBytes: 1000, tiny: { codeGzipBytes: 100, assetBytes: 200, layersPerPage: 3 } };
  const bp = { ...b, packs };

  it("passes a pack inside its code and asset budgets", () => {
    expect(packBreaches({ tiny: { codeGzip: 100, assetBytes: 200 } }, bp)).toEqual([]);
    expect(packBreaches({}, bp)).toEqual([]);
  });

  it("names the budget a pack goes over", () => {
    expect(packBreaches({ tiny: { codeGzip: 101, assetBytes: 201 } }, bp)).toEqual(["pack tiny code 101 B gzip > 100", "pack tiny assets 201 B > 200"]);
  });

  it("fails a pack without an entry, an inherited name and a pack over the ceiling", () => {
    expect(packBreaches({ other: { codeGzip: 1, assetBytes: 0 }, constructor: { codeGzip: 1, assetBytes: 0 } }, bp)).toEqual(["pack other has no entry in budgets.json packs", "pack constructor has no entry in budgets.json packs"]);
    const big = { packCeilingBytes: 250, tiny: { codeGzipBytes: 100, assetBytes: 200, layersPerPage: 3 } };
    expect(packBreaches({ tiny: { codeGzip: 100, assetBytes: 200 } }, { packs: big })).toEqual(["pack tiny is 300 B, over the 250 B ceiling"]);
  });

  it("reads the real packs block: no pack ships yet, so nothing is measured", () => {
    expect(measurePacks()).toEqual({});
  });

  it("fails a pack with no chunk of its own, no layersPerPage, or too many layers", () => {
    expect(packBreaches({ tiny: { chunks: 0, codeGzip: 0, assetBytes: 0 } }, bp)).toEqual(["pack tiny has no chunk of its own in the build"]);
    expect(packBreaches({ tiny: { chunks: 2, codeGzip: 1, assetBytes: 0, layers: 4 } }, bp)).toEqual(["pack tiny has 4 compositing layers per page > 3"]);
    const bare = { packs: { tiny: { codeGzipBytes: 100, assetBytes: 200 } } };
    expect(packBreaches({ tiny: { chunks: 1, codeGzip: 1, assetBytes: 0 } }, bare)).toEqual(["pack tiny has no layersPerPage in budgets.json packs"]);
  });

  it("finds a pack's chunks through the manifest, not the file name, and leaves out what an entry carries", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "packs-"));
    try {
      const dist = path.join(root, "dist");
      fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
      fs.mkdirSync(path.join(dist, ".vite"));
      fs.mkdirSync(path.join(root, "src/looks/packs/alpha"), { recursive: true });
      fs.mkdirSync(path.join(root, "src/looks/packs/ghost"), { recursive: true });
      for (const f of ["src/looks/packs/alpha.ts", "src/looks/packs/ghost.ts"]) fs.writeFileSync(path.join(root, f), "");
      fs.mkdirSync(path.join(root, "src/looks/packs/alpha/assets"));
      fs.writeFileSync(path.join(root, "src/looks/packs/alpha/assets/a.png"), "12345");
      for (const f of ["entry.js", "shared.js", "x1.js", "x2.js", "x.css"]) fs.writeFileSync(path.join(dist, "assets", f), f.repeat(50));
      fs.writeFileSync(
        path.join(dist, ".vite/manifest.json"),
        JSON.stringify({
          "index.html": { file: "assets/entry.js", isEntry: true, imports: ["shared", "src/looks/packs/ghost.ts"] },
          shared: { file: "assets/shared.js" },
          "src/looks/packs/alpha.ts": { file: "assets/x1.js", imports: ["shared", "dep"], css: ["assets/x.css"] },
          dep: { file: "assets/x2.js" },
          "src/looks/packs/ghost.ts": { file: "assets/shared.js" },
        })
      );
      const m = measurePacks(dist, root);
      expect(m.alpha.chunks).toBe(3);
      expect(m.alpha.assetBytes).toBe(5);
      expect(m.alpha.codeGzip).toBeGreaterThan(0);
      // "ghost" is statically imported by the page entry: it has no chunk of its own, and the check fails it
      expect(m.ghost.chunks).toBe(0);
      expect(packBreaches(m, { packs: { packCeilingBytes: 1e6, alpha: { codeGzipBytes: 1e6, assetBytes: 10, layersPerPage: 3 }, ghost: { codeGzipBytes: 1, assetBytes: 0, layersPerPage: 3 } } })).toEqual(["pack ghost has no chunk of its own in the build"]);
      expect(measurePacks(path.join(root, "nowhere"), root).alpha.chunks).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
