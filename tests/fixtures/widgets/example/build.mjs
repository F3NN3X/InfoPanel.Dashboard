// Builds and signs the example code widget (Phase 6b) the way docs/code-widgets.md tells an author to, into two packages:
//   ../ext.test.example/                   the example, publisher `test`
//   ../wrong-publisher/ext.acme.example/   the same bundle under publisher `acme`, which the key does not hold once trusted for `test`
// both signed with a new TEST-ONLY key pair: its public half is ../TEST-ONLY-example.pub, its secret half is never written (run this
// again, and commit all three, to change the example).
//   node tests/fixtures/widgets/example/build.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { generateKeyPair, readSecretKey } from "../../../../tools/widgets/minisign.mjs";
import { signFolder } from "../../../../tools/widgets/sign.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = await build({
  entryPoints: [join(here, "widget.jsx")],
  bundle: true,
  format: "esm",
  target: "es2022",
  jsx: "transform",
  jsxFactory: "h",
  jsxFragment: "Fragment",
  legalComments: "none",
  // not the app's tsconfig (its automatic JSX would bundle a React of its own)
  tsconfigRaw: "{}",
  write: false,
});
const bundle = out.outputFiles[0].contents;
const pair = generateKeyPair();
const key = readSecretKey(pair.secretText);
for (const [dir, publisher] of [[join(here, "..", "ext.test.example"), "test"], [join(here, "..", "wrong-publisher", "ext.acme.example"), "acme"]]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "widget.js"), bundle);
  const manifest = { format: 1, kind: "code", id: `ext:${publisher}.example`, version: "1.0.0", author: "TEST-ONLY publisher", name: "CPU ring (example)", publisher, entry: "widget.js", files: [] };
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  signFolder(dir, key);
}
writeFileSync(join(here, "..", "TEST-ONLY-example.pub"), pair.publicText);
console.log(`built and signed the example (${bundle.length} bytes); key ${pair.publicText.split("\n")[0].split(" ").pop()}`);
