// A widget package as files and as one `.zip` (FORMAT.md §14): `manifest.json` (id, version, author, each file's bytes and
// SHA-256), `recipe.json` and its images. Export writes the manifest from the files; import reads a zip back to the same
// files, byte for byte, and the validator decides. Studio only (Library and the builder); the kiosk reads files from the route.
import { listEntries, readEntry, writeZip } from "@/lib/infopanel/zip";
import type { Manifest, PackageFile, Recipe } from "./types";
import { FILE_COUNT_MAX, FILE_MAX_BYTES, PACKAGE_PATH, sha256 } from "./validate";

const enc = new TextEncoder();

/** How a recipe is written to `recipe.json`: two-space JSON and a final newline, so an export is the same bytes every time. */
export const recipeBytes = (recipe: Recipe): Uint8Array => enc.encode(`${JSON.stringify(recipe, null, 2)}\n`);

/** The manifest of a recipe and its images: every file listed with its size and hash, in path order. */
export async function manifestOf(recipe: Recipe, files: readonly PackageFile[]): Promise<Manifest> {
  const listed = [...files].filter((f) => f.path !== "manifest.json").sort((a, b) => (a.path < b.path ? -1 : 1));
  return {
    format: 1,
    kind: "recipe",
    id: recipe.id,
    version: recipe.version,
    author: recipe.author,
    name: recipe.name,
    files: await Promise.all(listed.map(async (f) => ({ path: f.path, bytes: f.bytes.length, sha256: await sha256(f.bytes) }))),
  };
}

/** A recipe and its images as a package's files, the manifest first. */
export async function packageOf(recipe: Recipe, images: readonly PackageFile[] = []): Promise<PackageFile[]> {
  const files = [{ path: "recipe.json", bytes: recipeBytes(recipe) }, ...images];
  const manifest = await manifestOf(recipe, files);
  return [{ path: "manifest.json", bytes: enc.encode(`${JSON.stringify(manifest, null, 2)}\n`) }, ...files];
}

/** A package as a `.zip` (stored, its files in the order given). */
export const exportPackage = (files: readonly PackageFile[]): Uint8Array => writeZip(files.map((f) => ({ name: f.path, data: f.bytes })));

/** The files of a package `.zip` (one top folder is taken off). Only a package's own paths are read; anything else is named in `skipped`. */
export async function importPackage(zip: Uint8Array): Promise<{ files: PackageFile[]; skipped: string[] }> {
  const entries = listEntries(zip).filter((e) => !e.name.endsWith("/"));
  if (entries.length > FILE_COUNT_MAX * 2) throw new Error(`the archive holds ${entries.length} files`);
  const root = entries.map((e) => e.name).find((n) => /(^|\/)manifest\.json$/.test(n))?.replace(/manifest\.json$/, "") ?? "";
  const files: PackageFile[] = [];
  const skipped: string[] = [];
  for (const e of entries) {
    const path = e.name.startsWith(root) ? e.name.slice(root.length) : e.name;
    if (!PACKAGE_PATH.test(path)) {
      skipped.push(e.name);
      continue;
    }
    files.push({ path, bytes: await readEntry(zip, e, FILE_MAX_BYTES + 1) });
  }
  return { files, skipped };
}
