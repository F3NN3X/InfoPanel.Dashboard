/**
 * The studio's Export dialog (§9): a canvas zone's stored form written back as a `.canvas.zip`
 * (canvas.json plus its files by SHA-256), with the font choices for it. Pure: the dialog reads the files.
 */
import type { AssetTable } from "../assets/assets.ts";
import { reviewFont, type Verdict } from "../font-licence.ts";
import { matchSupplied, type SuppliedFace } from "../font-supply.ts";
import type { StoredCanvas, StoredFont } from "../import/stored.ts";
import { bundle } from "../import/bundle.ts";
import { readFaces, type FontCategory } from "../sfnt.ts";

/* ---- fonts ---- */

/** A My library font a restricted font can be swapped for in the export. */
export interface SwapTarget {
  hash: string;
  file: string;
  family: string;
  category: FontCategory;
  verdict: Verdict;
  license?: string;
  faces: SuppliedFace[];
  bytes: Uint8Array;
}

export type FontChoice = "include" | "leave" | { swap: SwapTarget };

export interface FontLicenceRow {
  hash: string;
  family: string;
  file: string;
  /** Requests drawn with it. */
  uses: number;
  license?: string;
  /** Its kind of design, when the file is at hand to say. */
  category?: FontCategory;
  verdict: Verdict;
  reason: string;
}

/** One row per supplied font file the stored form carries; `files` (by hash) tell each one's category. */
export function fontLicences(stored: StoredCanvas, files: ReadonlyMap<string, Uint8Array> = new Map()): FontLicenceRow[] {
  const out = new Map<string, FontLicenceRow>();
  for (const f of stored.fonts) {
    const s = f.use === "supplied" ? f.supplied : undefined;
    if (!s) continue;
    const row = out.get(s.hash);
    if (row) {
      row.uses++;
      continue;
    }
    const review = reviewFont({ license: s.license });
    const bytes = files.get(s.hash);
    const category = bytes ? (readFaces(bytes).find((x) => x.index === s.index) ?? readFaces(bytes)[0])?.category : undefined;
    out.set(s.hash, {
      hash: s.hash, family: s.family || s.file, file: s.file, uses: 1, license: s.license,
      ...(category ? { category } : {}), verdict: review.verdict, reason: review.reason,
    });
  }
  return [...out.values()];
}

/** The default choice: a font that may not be shared stays out until the user includes it. */
export const defaultFontChoice = (row: FontLicenceRow): FontChoice => (row.verdict === "keep" ? "leave" : "include");

/** A library font file as a swap target; null for a file with no readable face. */
export function swapTargetOf(file: string, hash: string, bytes: Uint8Array): SwapTarget | null {
  const faces = readFaces(bytes);
  const first = faces[0];
  if (!first) return null;
  const review = reviewFont({ license: first.licenseText, licenseUrl: first.licenseUrl, embedding: first.embedding });
  return {
    hash, file, family: first.family, category: first.category ?? "other", verdict: review.verdict,
    ...(first.licenseText ? { license: first.licenseText } : {}),
    faces: faces.map((f) => ({ ...f, origin: "upload" as const, file, url: "", size: bytes.length })),
    bytes,
  };
}

/**
 * The fonts a restricted font can be swapped for: another file that may travel, of the same category. A font that
 * doesn't classify itself ("other") may be swapped for any of them, so it still gets a choice.
 */
export function swapOptions(row: FontLicenceRow, targets: readonly SwapTarget[]): SwapTarget[] {
  const free = targets.filter((t) => t.hash !== row.hash && t.verdict !== "keep");
  const category = row.category ?? "other";
  return category === "other" ? free : free.filter((t) => t.category === category);
}

/**
 * The stored form with the left-out fonts drawn as InfoPanel's face instead, and the swapped ones
 * drawn with their alternative's closest face (per request). The studio's own canvas is untouched.
 */
export function withFontChoices(stored: StoredCanvas, choices: ReadonlyMap<string, FontChoice>): StoredCanvas {
  const fonts = stored.fonts.map((f): StoredFont => {
    const choice = f.supplied ? choices.get(f.supplied.hash) : undefined;
    if (choice === "leave") return { request: f.request, use: "infopanel" };
    if (choice && typeof choice === "object") {
      // The alternative has another family name: ask for its faces by that name.
      const face = matchSupplied({ ...f.request, font: choice.swap.family }, choice.swap.faces);
      if (!face) return { request: f.request, use: "infopanel" };
      const supplied = { hash: choice.swap.hash, file: face.file, index: face.index, family: face.family, face: face.face, ...(choice.swap.license ? { license: choice.swap.license } : {}) };
      return { request: f.request, use: "supplied", supplied };
    }
    return f;
  });
  return fonts.some((f, i) => f !== stored.fonts[i]) ? { ...stored, fonts } : stored;
}

/** The font files for the package: the canvas's own plus the swapped-in alternatives'. */
export function withSwapFiles(files: ReadonlyMap<string, Uint8Array>, choices: ReadonlyMap<string, FontChoice>): Map<string, Uint8Array> {
  const out = new Map(files);
  for (const c of choices.values()) if (typeof c === "object") out.set(c.swap.hash, c.swap.bytes);
  return out;
}

/* ---- writing ---- */

/** `<name>.canvas.zip`: the stored form, its assets and the fonts it still draws with. */
export function canvasZip(stored: StoredCanvas, assets: AssetTable, fontFiles: ReadonlyMap<string, Uint8Array>): Uint8Array {
  const used = new Set(stored.fonts.flatMap((f) => (f.use === "supplied" && f.supplied ? [f.supplied.hash] : [])));
  return bundle(stored, assets, new Map([...fontFiles].filter(([hash]) => used.has(hash))));
}

/** A file name from a profile name ("ARC v2" → "ARC_v2"). */
export const fileStem = (s: string) => s.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "profile";
