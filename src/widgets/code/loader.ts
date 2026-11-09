// Loading a code widget (Phase 6b), in its own lazy chunk: the kiosk entry carries only the id test and the module made in
// `recipe/resolve.ts`. Same-origin dynamic import, and only after the server's verification (FORMAT.md §17-18):
//
// 1. the list (`GET /api/widgets`, never cached) must hold the id with `trust` `owner`, `themely` or `user:<name>` and not `off`;
//    with code widgets switched off (USER_CODE_WIDGETS=off or the Widgets page's switch) the server lists none;
// 2. the manifest, served only while its signature verifies, gives widget.js's SHA-256;
// 3. `import()` asks for `widget.js?sha256=<that hash>`, which the server serves only while the file is those bytes and still
//    verifies (409 or 403 otherwise). So the module a page holds under a URL is the file that verified, whatever changes on disk.
//
// Every load checks again (`loadCode` keeps one answer per id only until `recheck` or `forgetCode`), and while a code widget is on
// screen its state is asked again every `RECHECK_MS` (a short request; no stream, the page's connections are few). A widget whose
// package changed, was turned off or no longer verifies gets its new state: a new hash imports the new file (after it verified),
// anything else draws the "not available" card. The old module is dropped: nothing here keeps it (the browser's module map holds
// it under its old URL, which no load asks for again), and the placement draws the new definition's component in place of its own.
import type { ModuleSetting } from "@/modules/types";
import { STANDARD_KEYS } from "@/modules/standard-settings";
import { learnReads, recipeModule } from "../recipe/resolve";
import type { CodeWidgetDefinition, SdkSetting } from "../sdk";
import { SDK } from "./sdk-runtime";
import { definitionOf } from "./validate";

const ROUTE = "/api/widgets";
/** How often a code widget on screen asks whether it may still run. */
export const RECHECK_MS = 30_000;
/** The trust states that load: a signature from a trusted key (the server's `trust`). */
export const LOADS = /^(owner|themely|user:.+)$/;

/** A code widget's state: its definition (and the hash of the bundle it came from), or why it is not drawn. `off`: switched off. */
export type CodeState = { def: CodeWidgetDefinition; sha256: string } | { why: string; off?: boolean };

/** What the list says of a code widget. */
export interface CodeListing {
  id: string;
  name: string;
  version: string;
  trust: string;
  off: boolean;
}

/** The code widgets the server lists, and whether it has them switched off (then it lists none). */
export async function listCode(): Promise<{ list: CodeListing[]; off: boolean }> {
  const res = await fetch(ROUTE, { cache: "no-store" });
  const off = res.headers.get("X-User-Code-Widgets") === "off" || res.headers.get("X-User-Widgets") === "off";
  const raw: unknown = res.ok ? await res.json() : [];
  const list = (Array.isArray(raw) ? raw : []).flatMap((w): CodeListing[] =>
    w && w.kind === "code" && typeof w.id === "string" ? [{ id: w.id, name: String(w.name ?? w.id), version: String(w.version ?? ""), trust: String(w.trust ?? ""), off: w.off === true }] : []
  );
  return { list, off };
}

// one list request for the loads that ask at once; the next load asks again
let asking: ReturnType<typeof listCode> | undefined;
const freshList = (): ReturnType<typeof listCode> => {
  asking ??= listCode().finally(() => {
    asking = undefined;
  });
  return asking;
};

const keyOf = (id: string) => id.replace(":", ".");

/** The SHA-256 of widget.js its manifest lists (the manifest is served only while it verifies). */
async function bundleHash(id: string): Promise<string | undefined> {
  const res = await fetch(`${ROUTE}/${keyOf(id)}/manifest.json`, { cache: "no-store" });
  if (!res.ok) return undefined;
  const manifest = (await res.json()) as { entry?: unknown; files?: { path?: unknown; sha256?: unknown }[] };
  const hash = manifest.entry === "widget.js" && Array.isArray(manifest.files) ? manifest.files.find((f) => f?.path === "widget.js")?.sha256 : undefined;
  return typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash) ? hash : undefined;
}

// the definitions made, by id and bundle hash: a hash runs its bundle's default export once per page
const made = new Map<string, CodeWidgetDefinition>();

/** Imports a bundle by its URL (a seam for tests: the page's own `import()`). */
export let importBundle = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);
/** Tests only: replaces the import. */
export const setImportBundle = (f: (url: string) => Promise<unknown>): void => {
  importBundle = f;
};

/** Checks a code widget now: the list, the manifest's hash, then the import and its definition. Never throws. */
export async function checkCode(id: string): Promise<CodeState> {
  try {
    const { list, off } = await freshList();
    const item = list.find((w) => w.id === id);
    if (!item) return off ? { why: "Third-party code widgets are switched off", off: true } : { why: `${id} is not on this server` };
    if (item.off) return { why: "This widget is turned off on the Widgets page", off: true };
    if (item.trust.startsWith("refused:")) return { why: `Refused: ${item.trust.slice(8)}` };
    if (!LOADS.test(item.trust)) return { why: "It is not signed by a key this app trusts" };
    const sha256 = await bundleHash(id);
    if (!sha256) return { why: "Its package could not be read; it was not loaded" };
    const known = made.get(`${id}@${sha256}`);
    if (known) return { def: known, sha256 };
    const checked = definitionOf(await importBundle(`${ROUTE}/${keyOf(id)}/widget.js?sha256=${sha256}`), SDK);
    if ("error" in checked) return { why: checked.error };
    made.set(`${id}@${sha256}`, checked.def);
    return { def: checked.def, sha256 };
  } catch {
    return { why: "It could not be loaded (it changed, or the server did not answer); it is tried again on the next check" };
  }
}

/** A code widget's option as a Content tab row. */
function rowOf(s: SdkSetting): ModuleSetting {
  const base = { key: s.key, label: s.label, group: "Options", tab: "show" as const };
  switch (s.type) {
    case "select":
      return { ...base, type: "select", default: s.default, options: s.options };
    case "number":
      return { ...base, type: "number", default: s.default, min: s.min, max: s.max, step: s.step };
    default:
      return { ...base, type: s.type, default: s.default };
  }
}

/** Tells the widget's module what it reads and its rows, from its state (none: forget them). */
function learn(id: string, state?: CodeState): void {
  const def = state && "def" in state ? state.def : undefined;
  learnReads(id, state ? () => def?.reads ?? [] : undefined);
  const mod = recipeModule(id);
  if (mod) {
    mod.settings = [...(mod.settings ?? []).filter((s) => STANDARD_KEYS.has(s.key)), ...(def?.settings ?? []).map(rowOf)];
    if (def) Object.assign(mod, { title: def.name });
  }
}

const states = new Map<string, Promise<CodeState>>();

/** A code widget's state: checked on the first ask, then kept until `recheck` or `forgetCode` finds it changed. */
export function loadCode(id: string): Promise<CodeState> {
  let hit = states.get(id);
  if (!hit) {
    hit = checkCode(id).then((s) => {
      learn(id, s);
      return s;
    });
    states.set(id, hit);
  }
  return hit;
}

const watchers = new Map<string, Set<(s: CodeState) => void>>();
let timer: ReturnType<typeof setInterval> | undefined;

/** The same state: the same bundle, or the same reason. */
const same = (a: CodeState, b: CodeState) => ("def" in a && "def" in b ? a.sha256 === b.sha256 : "why" in a && "why" in b && a.why === b.why);

/** Checks every watched code widget again; a changed one gets its new state, and its watchers hear it. */
export async function recheck(ids: Iterable<string> = watchers.keys()): Promise<void> {
  await Promise.all(
    [...ids].map(async (id) => {
      const before = await states.get(id);
      const now = await checkCode(id);
      if (before && same(before, now)) return;
      states.set(id, Promise.resolve(now));
      learn(id, now);
      for (const heard of watchers.get(id) ?? []) heard(now);
    })
  );
}

/** Calls `heard` with a code widget's new state whenever a check finds it changed; returns the unsubscribe. */
export function watchCode(id: string, heard: (s: CodeState) => void): () => void {
  let set = watchers.get(id);
  if (!set) watchers.set(id, (set = new Set()));
  set.add(heard);
  timer ??= setInterval(() => void recheck(), RECHECK_MS);
  return () => {
    set.delete(heard);
    if (!set.size) watchers.delete(id);
    if (!watchers.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Checks a code widget again at once (the Widgets page imported, removed or switched it). */
export const forgetCode = (id: string): Promise<void> => recheck([id]);

/** Tests only: forgets every state, definition and watcher. */
export function resetCode(): void {
  states.clear();
  made.clear();
  watchers.clear();
  if (timer) clearInterval(timer);
  timer = undefined;
  asking = undefined;
}
