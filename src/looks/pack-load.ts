// The pack loader (P9): the one place a pack enters the app, and where G4 is enforced for it. A pack is code in a chunk of
// its own; before the app uses it, every CSS string and file path it names goes through `pack-urls`, its stage is held to
// 3 layers and its gradient numerals to 3:1 (G6). A pack that fails any check is refused whole, never trimmed.
import { safeFill, safeGradient } from "@/widgets/core/t3-tokens";
import { resolveT1, type Look } from "./look";
import { setPackId, type Pack } from "./pack";
import { lintPackCss, scopePackCss } from "./pack-css";
import PackStageLayers from "./pack-stage";
import { isPackRelativeUrl, packCssIssues } from "./pack-urls";
import { contrastOf } from "./status";

/** Built-in packs by Look id: one import() each, so a pack is a chunk the entries never carry. None ships yet (P10). */
export const BUILTIN: Record<string, () => Promise<{ default: Pack }>> = {};

/** Registers a pack source: how tests and the dev fixtures bring a pack that does not ship. Never called by the app. */
export function registerPack(id: string, load: () => Promise<{ default: Pack }>): void {
  BUILTIN[id] = load;
  setPackId(id, true);
}

/** Takes a registered pack source out again (tests). */
export function unregisterPack(id: string): void {
  delete BUILTIN[id];
  setPackId(id, false);
  shared.delete(id);
}

const MAX_LAYERS = 3;
const ID = /^[a-z0-9][a-z0-9-]*$/;
/** Large numerals hold 3:1 (G6). */
const NUMERAL_MIN = 3;
const COLOUR_FN = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;
const STOP = /#[0-9a-f]{3,8}\b|var\(--w-[\w-]+\)/gi;

/** The problems with a gradient numeral fill: a stop that cannot be read as a colour, or one under 3:1 on the Look's surface in a mode it supports. */
function numeralIssues(look: Look): string[] {
  const fill = look.t3?.["num-fill"];
  if (fill === undefined || fill === "solid") return [];
  const gradient = safeGradient(fill);
  if (!gradient) return ["num-fill is not a gradient of colours"];
  if (COLOUR_FN.test(gradient)) return ["num-fill stops must be hex colours or var(--w-*): other colour functions cannot be checked"];
  const issues: string[] = [];
  for (const mode of look.modes.supported) {
    const t1 = resolveT1(look, mode) as Record<string, string>;
    for (const stop of gradient.match(STOP) ?? []) {
      const colour = stop.startsWith("var(") ? t1[stop.slice(8, -1)] : stop;
      const ratio = colour ? contrastOf(colour, t1.surface) : undefined;
      if (ratio === undefined) issues.push(`num-fill stop ${stop} cannot be checked (${mode})`);
      else if (ratio < NUMERAL_MIN) issues.push(`num-fill stop ${stop} is ${ratio.toFixed(2)}:1 on the surface in ${mode}, under ${NUMERAL_MIN}:1`);
    }
  }
  return issues;
}

/** A folder URL the pack's files are served from: relative or a root path of this origin, ending in `/`, never a scheme or `//host`. */
function baseIssue(base: string): boolean {
  const rest = base.replace(/^\/(?!\/)/, "");
  return !(base.endsWith("/") && !/["'()\s]/.test(base) && (rest === "" || isPackRelativeUrl(rest)));
}

/** What is wrong with a pack, one line each (empty = it may load). */
export function packIssues(pack: Pack): string[] {
  const issues: string[] = [];
  if (!ID.test(pack.id)) issues.push("id is not lowercase letters, digits and hyphens");
  if (pack.look.id !== pack.id) issues.push("look.id is not the pack id");
  if (!Array.isArray(pack.look.modes?.supported)) return [...issues, "look.modes.supported"];
  if (pack.base !== undefined && (typeof pack.base !== "string" || baseIssue(pack.base))) issues.push(`base ${pack.base}`);
  if (pack.css) issues.push(...packCssIssues(pack.css).map((i) => `css: ${i}`), ...lintPackCss(pack.css).map((i) => `css: ${i}`));
  for (const a of pack.assets ?? []) if (!isPackRelativeUrl(a)) issues.push(`asset ${a}`);
  const layers = pack.stage?.layers ?? [];
  if (layers.length > MAX_LAYERS) issues.push(`stage has ${layers.length} layers, at most ${MAX_LAYERS}`);
  layers.forEach((l, i) => {
    if (l.fill !== undefined && !safeFill(l.fill)) issues.push(`stage layer ${i} fill`);
    if (l.image !== undefined && !(isPackRelativeUrl(l.image) && !/["']/.test(l.image))) issues.push(`stage layer ${i} image ${l.image}`);
    if (l.opacity !== undefined && !(l.opacity >= 0 && l.opacity <= 1)) issues.push(`stage layer ${i} opacity`);
  });
  issues.push(...numeralIssues(pack.look));
  return issues;
}

/** The pack `id` names, or undefined: no such pack, a module that is not that pack, or any issue (the pack is refused whole). */
export async function loadPack(id: string, sources: Record<string, () => Promise<{ default: Pack }>> = BUILTIN): Promise<Pack | undefined> {
  const load = Object.hasOwn(sources, id) ? sources[id] : undefined;
  if (!load) return undefined;
  const pack = (await load()).default;
  return pack?.id === id && pack.look && packIssues(pack).length === 0 ? { ...pack, Stage: PackStageLayers } : undefined;
}

const shared = new Map<string, { load: () => Promise<{ default: Pack }>; pack: Promise<Pack | undefined> }>();

/** `loadPack` once per pack id: every zone, the page and the studio canvas share one import and one validation. A failed import is tried again. */
export function sharedPack(id: string): Promise<Pack | undefined> {
  const load = Object.hasOwn(BUILTIN, id) ? BUILTIN[id] : undefined;
  if (!load) return Promise.resolve(undefined);
  const known = shared.get(id);
  if (known?.load === load) return known.pack;
  const pack = loadPack(id);
  shared.set(id, { load, pack });
  pack.catch(() => shared.get(id)?.pack === pack && shared.delete(id));
  return pack;
}

const mounted = new Map<string, { el: HTMLStyleElement; users: number }>();

/** Puts a pack's CSS in the page, scoped and in `@layer look` (one `<style data-pack>` per pack, however many users); returns the function that lets go of it. */
export function mountPackCss(pack: Pack): () => void {
  if (!pack.css) return () => {};
  let entry = mounted.get(pack.id);
  if (!entry) {
    const el = document.createElement("style");
    el.dataset.pack = pack.id;
    el.textContent = scopePackCss(pack.id, pack.css);
    document.head.append(el);
    entry = { el, users: 0 };
    mounted.set(pack.id, entry);
  }
  entry.users++;
  const mine = entry;
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    if (--mine.users === 0) {
      mine.el.remove();
      if (mounted.get(pack.id) === mine) mounted.delete(pack.id);
    }
  };
}
