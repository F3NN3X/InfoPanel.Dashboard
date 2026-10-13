// Generates the bundled page background of the Glass / Frosted appearance
// presets (public/assets/bg/aurora.png): soft color blobs on a dark base.
// Deterministic and dependency-free (zlib + a hand-written PNG encoder);
// rerun with `node tools/gen-bg.mjs` after changing the blobs.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const W = 640;
const H = 360;
const BASE = [10, 10, 20];
/** x, y (0–1), radius (fraction of the width), color, strength. */
const BLOBS = [
  [0.18, 0.28, 0.38, [124, 58, 237], 0.9],
  [0.78, 0.22, 0.34, [6, 182, 212], 0.75],
  [0.62, 0.86, 0.42, [219, 39, 119], 0.7],
  [0.08, 0.92, 0.3, [37, 99, 235], 0.65],
  [0.46, 0.5, 0.22, [99, 102, 241], 0.35],
];
// 4×4 ordered dither (±0.5 level) against banding when scaled up.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function pixel(x, y) {
  const c = [...BASE];
  for (const [bx, by, r, color, k] of BLOBS) {
    const dx = x / W - bx;
    const dy = (y / H - by) * (H / W);
    const a = k * Math.exp(-(dx * dx + dy * dy) / (r * r * 0.5));
    for (let i = 0; i < 3; i++) c[i] += (color[i] - c[i]) * Math.min(1, a);
  }
  const d = BAYER[(y % 4) * 4 + (x % 4)] / 16 - 0.5;
  return c.map((v) => Math.max(0, Math.min(255, Math.round(v + d))));
}

// Raw scanlines, filter 1 (Sub) for a smaller file.
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  const row = y * (W * 3 + 1);
  raw[row] = 1;
  let prev = [0, 0, 0];
  for (let x = 0; x < W; x++) {
    const p = pixel(x, y);
    for (let i = 0; i < 3; i++) raw[row + 1 + x * 3 + i] = (p[i] - prev[i] + 256) & 255;
    prev = p;
  }
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/bg/aurora.png");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`${out}: ${png.length} bytes`);
