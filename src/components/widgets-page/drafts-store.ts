// The builder's autosave (Phase 5c, as the Gauges page keeps its drafts): every open recipe with edits the server does not have is
// written to this browser's storage as it changes, and the Widgets page opens them again when it mounts, so leaving the page (or the
// studio) loses nothing. A recipe is a server package only when saved on purpose (each save bumps its version), so a draft lives
// here and not on the server. What is kept: the recipe now, the stored recipe it started from, and its images; not the undo steps.
import type { PackageFile, Recipe } from "@/widgets/recipe/types";
import { historyOf } from "./history";
import { isUnsaved } from "./widgets-model";

/** Where the drafts are kept. */
export const DRAFTS_KEY = "studio.widgets.drafts";
/** The most kept (characters of JSON): past it the images of a draft are left out, then the draft. */
export const DRAFTS_MAX_CHARS = 2_000_000;

/** An open recipe, as the page holds it (`builder.tsx`'s `Draft`). */
export interface OpenRecipe {
  key: string;
  history: { past: readonly Recipe[]; present: Recipe; future: readonly Recipe[] };
  images: PackageFile[];
  stored?: Recipe;
}

interface Kept {
  key: string;
  recipe: Recipe;
  stored?: Recipe;
  images: { path: string; data: string }[];
}

const toBase64 = (bytes: Uint8Array): string => {
  let s = "";
  for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(s);
};
const fromBase64 = (data: string): Uint8Array => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

/** Whether an open recipe is kept: it has edits the server does not have (a new one counts once it is edited). */
export const keeps = (d: OpenRecipe): boolean => isUnsaved(d) && (!!d.stored || d.history.past.length > 0);

/** The text kept for `drafts`: the ones `keeps` takes, within `max` characters (images left out first, then whole drafts from the end). */
export function draftsText(drafts: readonly OpenRecipe[], max = DRAFTS_MAX_CHARS): string {
  const kept: Kept[] = drafts.filter(keeps).map((d) => ({ key: d.key, recipe: d.history.present, ...(d.stored ? { stored: d.stored } : {}), images: d.images.map((f) => ({ path: f.path, data: toBase64(f.bytes) })) }));
  let text = JSON.stringify(kept);
  for (let k = kept.length - 1; k >= 0 && text.length > max; k--) {
    kept[k] = { ...kept[k], images: [] };
    text = JSON.stringify(kept);
  }
  while (kept.length && text.length > max) {
    kept.pop();
    text = JSON.stringify(kept);
  }
  return text;
}

/** The open recipes a kept text holds, each with a fresh undo history; anything that does not read as one is left out. */
export function draftsOf(text: string | null): OpenRecipe[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text ?? "[]");
  } catch {
    return [];
  }
  return (Array.isArray(raw) ? raw : []).flatMap((k: Partial<Kept> | null): OpenRecipe[] => {
    const r = k?.recipe;
    if (!k || typeof k.key !== "string" || !r || typeof r !== "object" || typeof r.id !== "string" || !r.root) return [];
    try {
      const images = (Array.isArray(k.images) ? k.images : []).map((f) => ({ path: String(f.path), bytes: fromBase64(String(f.data)) }));
      return [{ key: k.key, history: historyOf(r), images, ...(k.stored && typeof k.stored === "object" ? { stored: k.stored } : {}) }];
    } catch {
      return [];
    }
  });
}

/** Writes the drafts to this browser's storage (none left: the key goes). A full or blocked storage keeps what it had. */
export function saveDrafts(drafts: readonly OpenRecipe[], storage: Pick<Storage, "setItem" | "removeItem"> = localStorage): void {
  try {
    const text = draftsText(drafts);
    if (text === "[]") storage.removeItem(DRAFTS_KEY);
    else storage.setItem(DRAFTS_KEY, text);
  } catch {
    // the drafts of the last write that fitted stay
  }
}

/** The drafts kept in this browser's storage. */
export function loadDrafts(storage: Pick<Storage, "getItem"> = localStorage): OpenRecipe[] {
  try {
    return draftsOf(storage.getItem(DRAFTS_KEY));
  } catch {
    return [];
  }
}
