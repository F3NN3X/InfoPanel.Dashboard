// Uploaded media (images and videos used as backgrounds) for server.mjs.
//
// Files live in DATA_DIR/assets, named by content: the SHA-256 of the
// bytes plus the extension of the sniffed type, so the same file uploaded
// twice is stored once and a URL never changes meaning (served immutable).
// A file path is only ever built from an id matching ID_RE; nothing the
// client sends is used as a path otherwise.
//
// Security rules:
// - The type comes from the file's magic bytes (png, jpeg, gif, webp,
//   avif, mp4, webm); SVG, HTML and everything else is refused, and the
//   declared Content-Type has to agree. Matroska (.mkv, and WebM files
//   that are Matroska inside) is stored as webm: browsers play both.
// - Uploads and deletes need the `X-Dashboard-Asset: 1` header. A custom
//   header makes a cross-site request preflight, and this server never
//   answers preflights, so another site can't upload from a visitor's
//   browser.
// - Uploads and deletes come from loopback only, unless the environment
//   sets ALLOW_REMOTE_UPLOAD=1.
// - At most MAX_IN_FLIGHT uploads run at once (429), and the stored media
//   stays under ASSETS_MAX_BYTES (507), checked before a body is read.
//
// Node built-ins only. The pure helpers are exported for the tests.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const ID_RE = /^[a-f0-9]{64}\.(png|jpg|gif|webp|avif|mp4|webm)$/;

/** The upload limit per kind, in bytes. */
export const LIMITS = { image: 25 * 1024 * 1024, video: 300 * 1024 * 1024 };

/** Extension -> MIME type and kind of every accepted type. */
export const TYPES = {
  png: { mime: "image/png", kind: "image" },
  jpg: { mime: "image/jpeg", kind: "image" },
  gif: { mime: "image/gif", kind: "image" },
  webp: { mime: "image/webp", kind: "image" },
  avif: { mime: "image/avif", kind: "image" },
  mp4: { mime: "video/mp4", kind: "video" },
  webm: { mime: "video/webm", kind: "video" },
};

/** How many leading bytes the sniffer looks at. */
export const HEAD_BYTES = 256;

/** Uploads running at once, before the next one gets 429. */
export const MAX_IN_FLIGHT = 2;
/** Default cap on the total size of the stored media. */
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;

const UPLOAD_HEADER = "x-dashboard-asset";
const TEMP_PREFIX = ".upload-";

/* ---------------- pure helpers ---------------- */

const ascii = (buf, start, end) => buf.subarray(start, end).toString("latin1");
const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

// ISO-BMFF brands (the `ftyp` box) of MP4 video and of AVIF.
const AVIF_BRANDS = new Set(["avif", "avis"]);
const MP4_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "M4V ", "mmp4", "MSNV"]);

function sniffFtyp(buf) {
  if (buf.length < 16 || ascii(buf, 4, 8) !== "ftyp") return null;
  const boxEnd = Math.min(buf.readUInt32BE(0), buf.length);
  const major = ascii(buf, 8, 12);
  const compatible = [];
  for (let i = 16; i + 4 <= boxEnd; i += 4) compatible.push(ascii(buf, i, i + 4));
  // AVIF files often carry a generic major brand (mif1) and list avif later.
  if (AVIF_BRANDS.has(major) || compatible.some((b) => AVIF_BRANDS.has(b))) return "avif";
  // HEIC, QuickTime and audio-only brands stay out.
  return MP4_BRANDS.has(major) ? "mp4" : null;
}

/**
 * The type of a file from its first bytes (`HEAD_BYTES` is plenty), as
 * `{ ext, mime, kind }`, or null when it is not an accepted type.
 */
export function sniffType(buf) {
  let ext = null;
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ext = "png";
  else if (startsWith(buf, [0xff, 0xd8, 0xff])) ext = "jpg";
  else if (["GIF87a", "GIF89a"].includes(ascii(buf, 0, 6))) ext = "gif";
  else if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 12) === "WEBP") ext = "webp";
  // Matroska EBML header, DocType "webm" or "matroska": many tools write
  // the latter into .webm files, and the browser plays either.
  else if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) ext = "webm";
  else ext = sniffFtyp(buf);
  return ext ? { ext, ...TYPES[ext] } : null;
}

// Other names browsers give accepted types (Matroska is stored as webm).
const MIME_ALIASES = { "video/x-matroska": "webm", "video/matroska": "webm" };

/** The accepted type a Content-Type header declares, or null. */
export function declaredType(header) {
  const mime = String(header ?? "").split(";")[0].trim().toLowerCase();
  const ext = MIME_ALIASES[mime] ?? Object.keys(TYPES).find((e) => TYPES[e].mime === mime);
  return ext ? { ext, ...TYPES[ext] } : null;
}

/** The file of an asset id inside `dir`, or null for anything not an id. */
export function assetPath(dir, id) {
  if (typeof id !== "string" || !ID_RE.test(id)) return null;
  const file = path.join(dir, id);
  return file.startsWith(dir + path.sep) ? file : null;
}

/** The asset ids a text (the saved config JSON) refers to. */
export function referencedIds(text) {
  const re = /\/api\/assets\/([a-f0-9]{64}\.(?:png|jpg|gif|webp|avif|mp4|webm))/g;
  return new Set(Array.from(String(text).matchAll(re), (m) => m[1]));
}

/**
 * A `Range: bytes=…` header against a file of `size` bytes: `{ start, end }`
 * (inclusive) to serve 206, "unsatisfiable" for 416, or null to ignore it
 * and serve the whole file (no header, malformed, or several ranges).
 */
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header ?? "").trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") {
    // Suffix range: the last N bytes.
    const n = Number(m[2]);
    if (n === 0 || size === 0) return "unsatisfiable";
    return { start: Math.max(0, size - n), end: size - 1 };
  }
  const start = Number(m[1]);
  const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (m[2] !== "" && Number(m[2]) < start) return null;
  if (start >= size) return "unsatisfiable";
  return { start, end };
}

/** True for a loopback peer address (IPv4, IPv6 or IPv4-mapped). */
export function isLoopback(address) {
  const a = String(address ?? "");
  return a === "::1" || /^(::ffff:)?127\./.test(a);
}

/** The total size of the files in `dir` (temp files of running uploads included). */
export function dirBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const name of fs.readdirSync(dir)) {
    try {
      total += fs.statSync(path.join(dir, name)).size;
    } catch {
      // Deleted while counting.
    }
  }
  return total;
}

/**
 * The refusal `{ status, message }` for a new upload, or null: 429 when
 * `maxInFlight` uploads are already running, 507 when `used + incoming`
 * would pass `maxBytes`.
 */
export function uploadQuotaRefusal({ inFlight, maxInFlight, used, incoming, maxBytes }) {
  if (inFlight >= maxInFlight) return { status: 429, message: "too many uploads in progress" };
  if (used + incoming > maxBytes) return { status: 507, message: "media storage is full" };
  return null;
}

/* ---------------- request handling ---------------- */

class HttpError extends Error {
  constructor(status, message = "") {
    super(message);
    this.status = status;
  }
}

/**
 * Stream a request body into `tmp` while hashing it, refusing it once it
 * passes `limit` or once its first bytes are not the `expected` type.
 * Resolves `{ size, digest }`; rejects with an HttpError after the temp
 * file is closed (the caller deletes it).
 */
function receive(req, tmp, limit, expected) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(tmp, { flags: "wx" });
    const hash = crypto.createHash("sha256");
    let size = 0;
    let head = Buffer.alloc(0);
    let failed = false;

    const checkHead = () => {
      const sniffed = sniffType(head);
      return sniffed !== null && sniffed.ext === expected;
    };
    const fail = (status, message) => {
      if (failed) return;
      failed = true;
      req.removeListener("data", onData);
      req.pause();
      out.destroy();
      out.once("close", () => reject(new HttpError(status, message)));
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit) return fail(413);
      if (head.length < HEAD_BYTES) {
        head = Buffer.concat([head, chunk]).subarray(0, HEAD_BYTES);
        if (head.length === HEAD_BYTES && !checkHead()) return fail(415, "file content does not match its type");
      }
      hash.update(chunk);
      if (!out.write(chunk)) {
        req.pause();
        out.once("drain", () => !failed && req.resume());
      }
    };

    req.on("data", onData);
    req.on("error", () => fail(400, "upload aborted"));
    req.on("end", () => {
      if (failed) return;
      if (size === 0) return fail(400, "empty body");
      if (!checkHead()) return fail(415, "file content does not match its type");
      out.end();
      out.once("close", () => resolve({ size, digest: hash.digest("hex") }));
    });
    req.on("close", () => {
      if (!req.complete) fail(400, "upload aborted");
    });
    out.on("error", () => fail(500));
  });
}

/**
 * The /api/assets routes. `send(res, status, body, type)` is the server's
 * plain response helper; `configFile` is scanned by `?unused=1`.
 */
export function createAssets({ dir, configFile, send }) {
  const allowRemote = process.env.ALLOW_REMOTE_UPLOAD === "1";
  const maxBytes = Number(process.env.ASSETS_MAX_BYTES) > 0 ? Number(process.env.ASSETS_MAX_BYTES) : DEFAULT_MAX_BYTES;
  let inFlight = 0;
  const json = (res, status, value) => send(res, status, JSON.stringify(value), "application/json; charset=utf-8");

  // Temp files of uploads cut off by a restart.
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(TEMP_PREFIX)) fs.rmSync(path.join(dir, name), { force: true });
    }
  }

  /** The reason a write (upload / delete) is refused, or null. */
  function writeRefusal(req) {
    if (req.headers[UPLOAD_HEADER] !== "1") return "missing X-Dashboard-Asset header";
    if (!allowRemote && !isLoopback(req.socket.remoteAddress)) return "uploads are accepted from this computer only";
    return null;
  }

  function list() {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => ID_RE.test(name))
      .map((id) => {
        const stat = fs.statSync(path.join(dir, id));
        const { mime, kind } = TYPES[path.extname(id).slice(1)];
        return { id, url: `/api/assets/${id}`, type: mime, kind, size: stat.size, mtime: Math.floor(stat.mtimeMs) };
      })
      .sort((a, b) => b.mtime - a.mtime);
  }

  function handleList(res, query) {
    let assets = list();
    if (query.get("unused") === "1") {
      const used = referencedIds(fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : "");
      assets = assets.filter((a) => !used.has(a.id));
    }
    json(res, 200, assets);
  }

  async function handleUpload(req, res) {
    const refusal = writeRefusal(req);
    if (refusal) return send(res, 403, refusal);
    const declared = declaredType(req.headers["content-type"]);
    if (!declared) return send(res, 415, "unsupported type: png, jpeg, gif, webp, avif, mp4, webm or mkv");
    const limit = LIMITS[declared.kind];
    // Close the connection after an early answer instead of reading the rest.
    if (Number(req.headers["content-length"]) > limit) {
      res.setHeader("Connection", "close");
      return send(res, 413);
    }

    const declaredLength = Number(req.headers["content-length"]);
    const quota = uploadQuotaRefusal({
      inFlight,
      maxInFlight: MAX_IN_FLIGHT,
      used: dirBytes(dir),
      incoming: declaredLength > 0 ? declaredLength : limit,
      maxBytes,
    });
    if (quota) {
      res.setHeader("Connection", "close");
      return send(res, quota.status, quota.message);
    }

    fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, `${TEMP_PREFIX}${crypto.randomUUID()}.tmp`);
    let received;
    inFlight += 1;
    try {
      received = await receive(req, tmp, limit, declared.ext);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      if (!(err instanceof HttpError)) throw err;
      res.setHeader("Connection", "close");
      return send(res, err.status, err.message);
    } finally {
      inFlight -= 1;
    }

    const id = `${received.digest}.${declared.ext}`;
    const file = assetPath(dir, id);
    try {
      if (fs.existsSync(file)) fs.rmSync(tmp, { force: true });
      else fs.renameSync(tmp, file);
    } catch (err) {
      fs.rmSync(tmp, { force: true });
      // A concurrent upload of the same bytes got there first.
      if (!fs.existsSync(file)) throw err;
    }
    json(res, 200, { id, url: `/api/assets/${id}`, type: declared.mime, size: received.size });
  }

  function handleDelete(req, res, file) {
    const refusal = writeRefusal(req);
    if (refusal) return send(res, 403, refusal);
    if (!fs.existsSync(file)) return send(res, 404);
    fs.rmSync(file, { force: true });
    send(res, 204);
  }

  function serveAsset(req, res, file) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return send(res, 404);
    }
    const headers = {
      "Content-Type": TYPES[path.extname(file).slice(1)].mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
    };
    const range = parseRange(req.headers.range, stat.size);
    if (range === "unsatisfiable") {
      res.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}`, "Content-Length": "0" });
      return res.end();
    }
    const { start, end } = range ?? { start: 0, end: stat.size - 1 };
    res.writeHead(range ? 206 : 200, {
      ...headers,
      "Content-Length": String(end - start + 1),
      ...(range && { "Content-Range": `bytes ${start}-${end}/${stat.size}` }),
    });
    if (req.method === "HEAD" || stat.size === 0) return res.end();
    // The file can vanish between stat and open (a concurrent delete).
    const stream = fs.createReadStream(file, { start, end });
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }

  /** Handle /api/assets and /api/assets/<id>. */
  return async function handleAssets(req, res, pathname, query) {
    if (pathname === "/api/assets") {
      if (req.method === "GET") return handleList(res, query);
      if (req.method === "POST") return await handleUpload(req, res);
      return send(res, 405);
    }
    const file = assetPath(dir, pathname.slice("/api/assets/".length));
    if (!file) return send(res, 404);
    if (req.method === "GET" || req.method === "HEAD") return serveAsset(req, res, file);
    if (req.method === "DELETE") return handleDelete(req, res, file);
    return send(res, 405);
  };
}
