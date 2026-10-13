// Standalone server for the InfoPanel dashboard.
//
// Serves the production build (dist/), stores the studio config so every
// view of the dashboard (a browser tab, InfoPanel's native WebView2 page)
// shares it, tells open pages when that config changes, and proxies
// cover-art images so the page can sample their colours on a canvas, and
// stores uploaded media (backgrounds) under DATA_DIR/assets — see
// server/assets.mjs for its routes and security rules.
// Sensor data does not pass through here: pages read it straight from the
// InfoPanel Data API (http://127.0.0.1:3921 by default), which allows CORS.
//
// Node built-ins only. Environment:
//   PORT  listen port (default 3922)
//   HOST  listen address (default 127.0.0.1)
//   ALLOW_REMOTE_UPLOAD=1  accept media uploads / deletes from other machines
//   ALLOWED_HOSTS  extra Host names to accept, comma separated (see
//                  server/request-guard.mjs)
//   ASSETS_MAX_BYTES  total size cap of the uploaded media (default 2 GB)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { createAssets } from "./server/assets.mjs";
import { configWriteRefusal, createRequestGuard, parseAllowedHosts } from "./server/request-guard.mjs";

const PORT = Number(process.env.PORT) || 3922;
const HOST = process.env.HOST || "127.0.0.1";

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const LOCAL = process.env.LOCALAPPDATA || path.join(process.env.HOME || ".", ".local", "share");
const DATA_DIR = path.join(LOCAL, "InfoPanel", "Dashboard");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const ASSETS_DIR = path.join(DATA_DIR, "assets");

const MAX_CONFIG_BYTES = 5 * 1024 * 1024;
const MAX_PROXY_BYTES = 25 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 10_000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/* ---------------- config store ---------------- */

fs.mkdirSync(DATA_DIR, { recursive: true });

// Bumped on every save; open pages compare it to decide when to reload.
let configVersion = fs.existsSync(CONFIG_FILE) ? Math.floor(fs.statSync(CONFIG_FILE).mtimeMs) : 0;
const configListeners = new Set();

function saveConfig(json) {
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, CONFIG_FILE);
  configVersion = Math.max(Date.now(), configVersion + 1);
  const event = `data: ${JSON.stringify({ version: configVersion })}\n\n`;
  for (const res of configListeners) res.write(event);
}

/* ---------------- helpers ---------------- */

function send(res, status, body = "", type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/* ---------------- routes ---------------- */

const handleAssets = createAssets({ dir: ASSETS_DIR, configFile: CONFIG_FILE, send });

async function handleConfig(req, res) {
  if (req.method === "GET") {
    if (!fs.existsSync(CONFIG_FILE)) return send(res, 404);
    return send(res, 200, fs.readFileSync(CONFIG_FILE), TYPES[".json"]);
  }
  if (req.method !== "POST") return send(res, 405);

  const refusal = configWriteRefusal(req.headers);
  if (refusal) return send(res, refusal.status, refusal.message);

  let body;
  try {
    body = await readBody(req, MAX_CONFIG_BYTES);
  } catch {
    return send(res, 413);
  }
  try {
    // Must be the config object itself, so a stray client can't clobber it.
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
  } catch {
    return send(res, 400, "expected a config object");
  }
  saveConfig(body);
  send(res, 200, JSON.stringify({ ok: true, version: configVersion }), TYPES[".json"]);
}

function handleConfigEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify({ version: configVersion })}\n\n`);
  configListeners.add(res);
  const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), 15_000);
  req.on("close", () => {
    clearInterval(keepAlive);
    configListeners.delete(res);
  });
}

// https anywhere; plain http only on loopback (a plugin's local image server).
function isValidProxyTarget(url) {
  if (url.protocol === "https:") return true;
  if (url.protocol !== "http:") return false;
  return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

async function handleImageProxy(req, res, query) {
  if (req.method !== "GET") return send(res, 405);
  let target;
  try {
    target = new URL(query.get("url") ?? "");
  } catch {
    return send(res, 400);
  }
  if (!isValidProxyTarget(target)) return send(res, 400);

  let upstream;
  try {
    upstream = await fetch(target, { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
  } catch {
    return send(res, 504);
  }
  if (!upstream.ok) return send(res, upstream.status);
  if (Number(upstream.headers.get("content-length")) > MAX_PROXY_BYTES) return send(res, 413);

  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of upstream.body) {
      size += chunk.length;
      if (size > MAX_PROXY_BYTES) return send(res, 413);
      chunks.push(chunk);
    }
  } catch {
    return send(res, 502);
  }
  const type = (upstream.headers.get("content-type") ?? "application/octet-stream").split(";")[0];
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(Buffer.concat(chunks));
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405);
  if (!fs.existsSync(DIST)) return send(res, 503, "No build found. Run `npm run build` first.");

  let rel = decodeURIComponent(pathname).replace(/^\/+/, "") || "index.html";
  if (rel.split("/").some((seg) => seg === ".." || seg.startsWith("."))) return send(res, 404);

  let file = path.join(DIST, rel);
  if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    // SPA fallback: the app routes client-side via query strings.
    file = path.join(DIST, "index.html");
  }
  const isHtml = file.endsWith(".html");
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    // index.html must track the latest build (hashed asset names change).
    "Cache-Control": isHtml ? "no-store" : "no-cache",
  });
  if (req.method === "HEAD") return res.end();
  const stream = fs.createReadStream(file);
  stream.on("error", () => res.destroy());
  stream.pipe(res);
}

const guard = createRequestGuard({
  host: HOST,
  allowedHosts: parseAllowedHosts(process.env.ALLOWED_HOSTS),
  machineName: os.hostname(),
});

const server = http.createServer(async (req, res) => {
  const refused = guard(req);
  if (refused) {
    res.setHeader("Connection", "close");
    return send(res, refused.status, refused.message);
  }
  const { pathname, searchParams } = new URL(req.url ?? "/", "http://localhost");
  try {
    if (pathname === "/api/config") return await handleConfig(req, res);
    if (pathname === "/events/config") return handleConfigEvents(req, res);
    if (pathname === "/api/image-proxy") return await handleImageProxy(req, res, searchParams);
    if (pathname === "/api/assets" || pathname.startsWith("/api/assets/")) {
      return await handleAssets(req, res, pathname, searchParams);
    }
    if (pathname.startsWith("/api/")) return send(res, 404);
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(`${req.method} ${pathname} failed:`, err);
    if (!res.headersSent) send(res, 500, "internal error");
    else res.destroy();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`InfoPanel dashboard on http://${HOST}:${PORT} (config: ${CONFIG_FILE})`);
});
