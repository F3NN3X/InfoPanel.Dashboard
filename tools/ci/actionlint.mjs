#!/usr/bin/env node
// Lints .github/workflows with actionlint. The binary is a pinned release, downloaded once into .cache/actionlint and
// checked against the SHA-256 below before it runs; CI and a developer machine use the same pin. It comes through the
// REST API's asset route first (its id is pinned too; GITHUB_TOKEN, when set, lifts the 60 an hour unauthenticated
// limit), then the github.com download link: on 2026-11-08 that link answered 504 for hours while the API served the file.
// Pin: https://github.com/rhysd/actionlint/releases/tag/v1.7.12 (checksums file of that release). Node built-ins only.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "1.7.12";
const ASSETS = {
  "linux-x64": { name: `actionlint_${VERSION}_linux_amd64.tar.gz`, id: 384924896, sha256: "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8" },
  "win32-x64": { name: `actionlint_${VERSION}_windows_amd64.zip`, id: 384924919, sha256: "6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9" },
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Fetches `url`, retrying a network error or a 5xx after each delay in turn (GitHub's release downloads 504 during an
 * outage); a 4xx or the last failure throws.
 */
export async function fetchRetried(url, init = {}, delays = [5000, 15000, 30000], fetchFn = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  for (let attempt = 0; ; attempt++) {
    let error;
    try {
      const response = await fetchFn(url, init);
      if (response.ok) return response;
      error = new Error(`download failed: ${response.status}`);
      if (response.status < 500) throw error;
    } catch (caught) {
      if (caught === error) throw error;
      error = caught;
    }
    if (attempt >= delays.length) throw error;
    console.error(`${error.message}, retrying in ${delays[attempt] / 1000} s`);
    await sleep(delays[attempt]);
  }
}

/** Where `asset` can be downloaded, in the order tried: the API's asset route, then the github.com link. */
export function sourcesFor(asset, token = process.env.GITHUB_TOKEN) {
  const headers = { Accept: "application/octet-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  return [
    { url: `https://api.github.com/repos/rhysd/actionlint/releases/assets/${asset.id}`, init: { headers } },
    { url: `https://github.com/rhysd/actionlint/releases/download/v${VERSION}/${asset.name}`, init: {} },
  ];
}

/** The first source that answers, trying each with `fetchRetried`; throws the last error when none does. */
export async function downloadFirst(sources, fetchOne = fetchRetried) {
  let error;
  for (const { url, init } of sources) {
    try {
      return await fetchOne(url, init);
    } catch (caught) {
      error = caught;
      console.error(`${url}: ${caught.message}`);
    }
  }
  throw error;
}

/** The pinned asset for this platform, or null. */
export function assetFor(platform = process.platform, arch = process.arch) {
  return ASSETS[`${platform}-${arch}`] ?? null;
}

async function ensureBinary() {
  const asset = assetFor();
  if (!asset) throw new Error(`no pinned actionlint for ${process.platform}-${process.arch}`);
  const dir = path.join(ROOT, ".cache", "actionlint", VERSION);
  const bin = path.join(dir, process.platform === "win32" ? "actionlint.exe" : "actionlint");
  if (fs.existsSync(bin)) return bin;
  fs.mkdirSync(dir, { recursive: true });
  const response = await downloadFirst(sourcesFor(asset));
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== asset.sha256) throw new Error(`actionlint ${asset.name} has SHA-256 ${sha256}, expected ${asset.sha256}`);
  const archive = path.join(dir, asset.name);
  fs.writeFileSync(archive, bytes);
  // Windows: its own bsdtar reads zip (a GNU tar on PATH, as in Git Bash, takes "E:" for a host).
  const tar = process.platform === "win32" ? path.join(process.env.SystemRoot ?? String.raw`C:\Windows`, "System32", "tar.exe") : "tar";
  execFileSync(tar, ["-xf", archive, "-C", dir, path.basename(bin)]);
  fs.rmSync(archive);
  return bin;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const bin = await ensureBinary();
    process.exitCode = spawnSync(bin, ["-color"], { cwd: ROOT, stdio: "inherit" }).status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
