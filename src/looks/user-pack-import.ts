// Importing and removing a user pack (P12b), in the studio's lazy chunk. A folder or a zip becomes the files a pack has; the
// validator runs on them in `user` mode, and only a pack with no error is sent to `POST /api/packs`, where the server checks
// its structure and size again (it does not take the client's word). Removing a pack takes it off every level that wears it
// (Classic is drawn there instead) before the folder goes.
import { listEntries, readEntry } from "@/lib/infopanel/zip";
import { forgetUserPack, registerUserPacks, USER_PACK_ID, userPackIssues } from "./user-packs";
import { FILE_COUNT_MAX, FILE_MAX_BYTES, PACK_CEILING_BYTES, type PackFile, type PackIssue, type PackSource } from "./pack-validate";

/** A file the user picked: its path from the pack folder (`/` separated) and its bytes. */
export interface PickedFile {
  path: string;
  bytes: Uint8Array;
}

/** What the importer says of a pick: the issues in plain words, whether it may be stored, and what it would store. */
export interface ImportReport {
  id?: string;
  name?: string;
  issues: PackIssue[];
  ok: boolean;
}

/** The files the server stores (`is_pack_file`, packs.rs): the fixed names and `assets/<name>.<ext>`. Everything else is left out. */
const STORED = /^(pack\.json|look\.json|icons\.json|OFL\.txt|thumb\.(png|jpg|webp)|assets\/[a-z0-9][a-z0-9-]{0,63}\.(woff2|png|jpg|webp|svg))$/;

/** What each rule means to someone who has not read the spec; a rule not here gives its own message. */
const PLAIN: Record<string, string> = {
  "user-css": "A pack from your folder cannot bring its own stylesheet (pack.css). Its look is set by look.json.",
  provenance: "This pack takes the id or a font name of a built-in Look. Give it its own.",
  injection: "A value holds markup or a link; look.json and pack.json hold plain values only.",
  "remote-url": "A file is fetched from another address. A pack holds all its files itself.",
  "script-url": "A file is a script address, which a pack may not use.",
  "data-url": "A file is written inline as a data address. Put it in the assets folder.",
  "svg-unsafe": "An SVG holds script or a link out of the file.",
  size: "The pack is over the size limit.",
  "asset-listed": "pack.json's list of assets and the files in the assets folder do not match.",
  "asset-missing": "A file the pack names is not in the pack.",
  "font-licence": "Fonts need their licence (OFL.txt) in the pack, and the SIL Open Font License 1.1.",
  contrast: "Some text or mark could not be read on the card.",
  tone: "The card's tone does not suit its colour.",
  "blur-fallback": "A glass card must stay at least 90% opaque where the blur is off.",
  schema: "A file does not have the shape a pack has.",
  "not-stored": "This file is not part of a pack and is left out.",
};

/** One issue as a line of plain words: where, then what. */
export const describeIssue = (i: PackIssue): string => `${i.file ? `${i.file}: ` : ""}${PLAIN[i.rule] ? `${PLAIN[i.rule]} (${i.message})` : i.message}`;

/** A picked folder or archive with its one top folder taken off (`my-pack/pack.json` is `pack.json`). */
export function withoutRoot(files: readonly PickedFile[]): PickedFile[] {
  const norm = files.map((f) => ({ ...f, path: f.path.replace(/\\/g, "/").replace(/^\.\//, "") }));
  const root = norm.find((f) => /(^|\/)pack\.json$/.test(f.path))?.path.replace(/pack\.json$/, "") ?? "";
  return norm.filter((f) => f.path.startsWith(root)).map((f) => ({ ...f, path: f.path.slice(root.length) }));
}

/** The files of a pick as a pack source, and what was left out: only what the server stores goes in (a stray `pack.css` stays in, for the validator to refuse). */
export function sourceOf(picked: readonly PickedFile[]): { src: PackSource; skipped: string[] } {
  const stored = picked.filter((f) => STORED.test(f.path) || f.path === "pack.css");
  const skipped = picked.filter((f) => !stored.includes(f)).map((f) => f.path);
  const files: PackFile[] = stored.map((f) => ({ path: f.path, size: f.bytes.length, bytes: f.bytes }));
  const json = (path: string): unknown => {
    const bytes = files.find((f) => f.path === path)?.bytes;
    try {
      return bytes && JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return undefined;
    }
  };
  return { src: { pack: json("pack.json"), look: json("look.json"), icons: json("icons.json"), css: undefined, files }, skipped };
}

/** The validator's verdict on a pick: errors refuse it, warnings and the left-out files are shown. */
export function checkImport(picked: readonly PickedFile[]): ImportReport & { src: PackSource } {
  const { src, skipped } = sourceOf(withoutRoot(picked));
  const id = (src.pack as { id?: unknown } | undefined)?.id;
  const name = (src.pack as { name?: unknown } | undefined)?.name;
  const issues = [
    ...userPackIssues(src),
    ...skipped.map((p): PackIssue => ({ rule: "not-stored", severity: "warn", file: p, message: "not a file a pack has" })),
  ];
  const idOk = typeof id === "string" && USER_PACK_ID.test(id);
  if (!idOk) issues.unshift({ rule: "id", severity: "error", file: "pack.json", message: "the pack's id is lowercase letters, digits and hyphens, 48 at most" });
  return { id: idOk ? id : undefined, name: typeof name === "string" ? name : undefined, issues: [...issues.filter((i) => i.severity === "error"), ...issues.filter((i) => i.severity === "warn")], ok: !issues.some((i) => i.severity === "error"), src };
}

/** The files of a `.zip` (stored or deflated), under the pack's caps. */
export async function filesOfZip(buf: Uint8Array): Promise<PickedFile[]> {
  const entries = listEntries(buf).filter((e) => !e.name.endsWith("/"));
  if (entries.length > FILE_COUNT_MAX * 2) throw new Error(`the archive holds ${entries.length} files`);
  return Promise.all(entries.map(async (e) => ({ path: e.name, bytes: await readEntry(buf, e, FILE_MAX_BYTES + 1) })));
}

/** The files of a picked folder (`webkitdirectory`) or of several files at once. */
export async function filesOfInput(list: FileList): Promise<PickedFile[]> {
  const files = [...list];
  if (files.length === 1 && /\.zip$/i.test(files[0].name)) return filesOfZip(new Uint8Array(await files[0].arrayBuffer()));
  if (files.reduce((n, f) => n + f.size, 0) > PACK_CEILING_BYTES * 4) throw new Error("that is far more than a pack holds");
  return Promise.all(files.map(async (f) => ({ path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
}

const WRITE = { "Content-Type": "application/json", "X-Dashboard-Pack": "1" };

const base64 = (bytes: Uint8Array): string => {
  let s = "";
  for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(s);
};

/** Stores a pack the importer passed, then reads it back through the route the way the kiosk will (the validator runs again on those bytes). Returns the issues of that second read, empty when the pack is worn-ready. */
export async function storePack(report: ImportReport & { src: PackSource }): Promise<string | undefined> {
  if (!report.ok || !report.id) return "the pack has errors";
  const files = report.src.files.filter((f) => f.path !== "pack.css").map((f) => ({ path: f.path, data: base64(f.bytes ?? new Uint8Array()) }));
  const res = await fetch("/api/packs", { method: "POST", headers: WRITE, body: JSON.stringify({ id: report.id, files }) });
  if (!res.ok) return (await res.text()) || `the server refused the pack (${res.status})`;
  forgetUserPack(report.id);
  const [registered] = await registerUserPacks([report.id]);
  return registered === report.id ? undefined : "the pack was stored but did not pass the check when it was read back";
}

/** Takes a pack off the server and out of the app. */
export async function removePack(id: string): Promise<boolean> {
  const res = await fetch(`/api/packs/${encodeURIComponent(id)}`, { method: "DELETE", headers: WRITE });
  if (res.ok) forgetUserPack(id);
  return res.ok;
}
