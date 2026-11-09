import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkCode, forgetCode, loadCode, recheck, resetCode, setImportBundle, watchCode, type CodeState } from "@/widgets/code/loader";
import { recipeModule } from "@/widgets/recipe/resolve";

// A code widget is imported only after the server verified it (Phase 6b): the list must say a trusted signer and not off, and the
// import asks for the bundle by the hash its verified manifest lists. Every refusal the server can give (a tampered file, an
// untrusted, revoked or wrong-publisher key), a switch that is off and a widget turned off import nothing. A changed package is
// checked again and its new bundle imported by its new hash; the old definition is dropped.

const FIXTURE = new URL("../../fixtures/widgets/ext.test.example/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", FIXTURE), "utf8"));
const HASH: string = manifest.files[0].sha256;
const ID = "ext:test.example";

interface Served {
  trust?: string;
  off?: boolean;
  switchedOff?: boolean;
  hash?: string;
}

/** A fetch answering the list and the manifest as the server would for `served`; the imports asked for are in `imports`. */
function serve(served: Served) {
  const imports: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    if (url === "/api/widgets") {
      const list = served.switchedOff ? [] : [{ id: ID, kind: "code", name: "CPU ring (example)", version: "1.0.0", trust: served.trust ?? "user:Test", ...(served.off ? { off: true } : {}) }];
      return new Response(JSON.stringify(list), { status: 200, headers: served.switchedOff ? { "X-User-Code-Widgets": "off" } : {} });
    }
    if (url === "/api/widgets/ext.test.example/manifest.json") return new Response(JSON.stringify({ ...manifest, files: [{ ...manifest.files[0], sha256: served.hash ?? HASH }] }), { status: 200 });
    return new Response(null, { status: 404 });
  });
  setImportBundle(async (url) => {
    imports.push(url);
    return import(/* @vite-ignore */ new URL("widget.js", FIXTURE).href);
  });
  return imports;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetCode();
  vi.useRealTimers();
});

const def = (s: CodeState) => ("def" in s ? s.def : undefined);
const why = (s: CodeState) => ("why" in s ? s.why : undefined);

describe("loading a code widget", () => {
  it("imports a widget a trusted key signed, by its verified hash, and registers its validated definition", async () => {
    for (const trust of ["owner", "themely", "user:Test"]) {
      resetCode();
      const imports = serve({ trust });
      const state = await loadCode(ID);
      expect(def(state)?.name, trust).toBe("CPU ring (example)");
      expect(imports).toEqual([`/api/widgets/ext.test.example/widget.js?sha256=${HASH}`]);
    }
    const mod = recipeModule(ID)!;
    expect(mod.readsFor?.(undefined)).toEqual(["system.cpu.", "libre."]);
    expect(mod.settings?.map((s) => s.key)).toEqual(expect.arrayContaining(["label", "crash"]));
  });

  it.each([
    ["a tampered file", "refused:widget.js is not the file the manifest lists (size or SHA-256)"],
    ["an untrusted key", "refused:signed with a key this app does not trust (345BEEA66DE248DB)"],
    ["a revoked key", "refused:signed with a revoked key (345BEEA66DE248DB)"],
    ["a wrong publisher", "refused:signed with a key (345BEEA66DE248DB) that does not sign for the publisher acme"],
    ["an unsigned or unknown state", "unsigned"],
  ])("refuses %s and imports nothing", async (_, trust) => {
    const imports = serve({ trust });
    const state = await loadCode(ID);
    expect(def(state)).toBeUndefined();
    expect(why(state)).toMatch(trust.startsWith("refused:") ? /^Refused: / : /not signed by a key this app trusts/);
    expect(imports).toEqual([]);
  });

  it("imports nothing while code widgets are switched off, or this one is turned off", async () => {
    let imports = serve({ switchedOff: true });
    expect(await loadCode(ID)).toEqual({ why: "Third-party code widgets are switched off", off: true });
    expect(imports).toEqual([]);
    resetCode();
    imports = serve({ off: true });
    expect(await loadCode(ID)).toEqual({ why: "This widget is turned off on the Widgets page", off: true });
    expect(imports).toEqual([]);
  });

  it("refuses a bundle whose import fails (a hash the server no longer serves) or whose definition is not the SDK's", async () => {
    serve({});
    setImportBundle(() => Promise.reject(new TypeError("409")));
    expect(why(await checkCode(ID))).toMatch(/could not be loaded/);
    setImportBundle(async () => ({ default: (sdk: { defineWidget: (d: unknown) => unknown }) => sdk.defineWidget({ name: "x", reads: [], defaultSize: [2, 2] }) }));
    expect(why(await checkCode(ID))).toBe("render is not a function");
    setImportBundle(async () => ({ default: { name: "not a function" } }));
    expect(why(await checkCode(ID))).toBe("the bundle's default export is not a function of the SDK");
  });

  it("checks a watched widget again: a changed package imports its new bundle by its new hash, a refused one drops the old", async () => {
    vi.useFakeTimers();
    serve({});
    const heard: CodeState[] = [];
    const stop = watchCode(ID, (s) => heard.push(s));
    const first = def(await loadCode(ID));
    await recheck();
    expect(heard, "nothing changed").toEqual([]);

    const other = "a".repeat(64);
    const again = serve({ hash: other });
    await recheck();
    expect(again).toEqual([`/api/widgets/ext.test.example/widget.js?sha256=${other}`]);
    expect(heard.length).toBe(1);
    expect(def(heard[0])).toBeDefined();
    expect(def(heard[0])).not.toBe(first);

    serve({ trust: "refused:widget.js is not the file the manifest lists (size or SHA-256)" });
    await forgetCode(ID);
    expect(why(heard[1])).toMatch(/^Refused/);
    expect(def(await loadCode(ID))).toBeUndefined();
    expect(recipeModule(ID)?.readsFor?.(undefined)).toEqual([]);
    stop();
    expect(vi.getTimerCount(), "the poll stops with its last watcher").toBe(0);
  });
});
