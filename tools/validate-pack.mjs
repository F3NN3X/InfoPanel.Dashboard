// Validates a theme pack folder: `node tools/validate-pack.mjs <dir>` prints each issue as `error|warn rule file: message` and
// exits 1 on any error (2 on a usage error). The rules are src/looks/pack-validate.ts, bundled here with esbuild (no test runner).
//   node tools/validate-pack.mjs src/looks/packs/field-kit --builtin   (--builtin leaves out the pack's .ts/.tsx code files and reads it as one of ours, CSS included)
// Without --builtin the folder is read as a user pack: a pack.css is held to the user grammar (rule `user-css`). That is all this tool can
// say of it: the render check and the server's signature happen when the studio imports the pack, and a pack.css without them is never served.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const walk = (dir, prefix = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]));

/** A pack folder as the validator's `PackSource` (JSON that does not parse is left `undefined`, which the schema check then refuses); `skip` drops files by path (the built-in packs' code). */
export function readPackDir(dir, skip) {
  const files = walk(dir).filter((p) => !skip?.test(p)).map((path) => {
    const bytes = new Uint8Array(readFileSync(join(dir, path)));
    return { path, size: statSync(join(dir, path)).size, bytes };
  });
  const text = (path) => files.find((f) => f.path === path)?.bytes;
  const json = (path) => {
    const bytes = text(path);
    try {
      return bytes && JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return undefined;
    }
  };
  return { pack: json("pack.json"), look: json("look.json"), css: text("pack.css") && new TextDecoder().decode(text("pack.css")), icons: json("icons.json"), files };
}

/** The validator, bundled from source. */
export async function loadValidator() {
  const { build } = await import("esbuild");
  const result = await build({
    entryPoints: [join(root, "src/looks/pack-validate.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": join(root, "src") },
    loader: { ".json": "json" },
    logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node tools/validate-pack.mjs <pack folder>");
    process.exit(2);
  }
  const { validatePack } = await loadValidator();
  const builtin = process.argv.includes("--builtin");
  const issues = validatePack(readPackDir(dir, builtin ? /\.tsx?$/ : undefined), { source: builtin ? "builtin" : "user" });
  for (const i of issues) console.log(`${i.severity} ${i.rule} ${i.file || "-"}: ${i.message}`);
  const errors = issues.filter((i) => i.severity === "error").length;
  console.log(`${errors} error(s), ${issues.length - errors} warning(s)`);
  if (!builtin && !errors && readPackDir(dir).css !== undefined) console.log("pack.css passes the grammar; it still has to pass the render check when the studio imports it");
  process.exit(errors ? 1 : 0);
}
