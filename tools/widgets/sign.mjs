// Signs a widget package folder with a minisign secret key (Phase 6a; FORMAT.md §17), for publishers and tests:
//   node tools/widgets/sign.mjs <package-folder> --key <secret.key> [--password-env <VAR>]
//     writes the folder's manifest.json again: `files` listed from the folder (every file but the manifest, by path, with its
//     size and SHA-256), then `signature` over the canonical bytes. An encrypted key's password is read from the variable named.
//   node tools/widgets/sign.mjs --generate <name>
//     writes <name>.pub and <name>.key, a new key pair with the secret key NOT encrypted: throwaway keys for tests and trying it
//     out. A key that signs for others (the owner's, a publisher's) is made with `minisign -G`, which encrypts it.
// The app trusts a signature only from a key it has: the owner's built-in key, or a key added in Settings > Widget publishers.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { generateKeyPair, readSecretKey, signManifest } from "./minisign.mjs";

/** Every file under `dir` but the manifest, as package paths (`widget.js`, `images/a.png`), sorted. */
export function packageFiles(dir) {
  const out = [];
  const walk = (at) => {
    for (const name of readdirSync(at)) {
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else out.push(relative(dir, path).replace(/\\/g, "/"));
    }
  };
  walk(dir);
  return out.filter((p) => p !== "manifest.json" && !p.startsWith(".")).sort();
}

/** Signs the package in `dir` with `key` (`readSecretKey`'s): the manifest is written with its files and signature. */
export function signFolder(dir, key) {
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const files = packageFiles(dir).map((path) => {
    const bytes = readFileSync(join(dir, path));
    return { path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  const signed = signManifest({ ...manifest, files }, key);
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(signed, null, 2)}\n`);
  return signed;
}

function main(args) {
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const generate = flag("--generate");
  if (generate) {
    const pair = generateKeyPair();
    writeFileSync(`${generate}.pub`, pair.publicText);
    writeFileSync(`${generate}.key`, pair.secretText, { mode: 0o600 });
    console.log(`wrote ${generate}.pub and ${generate}.key (not encrypted: for tests only)`);
    return 0;
  }
  const dir = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  const keyFile = flag("--key");
  if (!dir || !keyFile) {
    console.error("usage: node tools/widgets/sign.mjs <package-folder> --key <secret.key> [--password-env <VAR>] | --generate <name>");
    return 2;
  }
  const passwordEnv = flag("--password-env");
  const key = readSecretKey(readFileSync(keyFile, "utf8"), passwordEnv ? process.env[passwordEnv] : undefined);
  const signed = signFolder(dir, key);
  console.log(`signed ${signed.id} ${signed.version}: ${signed.files.length} files`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}
