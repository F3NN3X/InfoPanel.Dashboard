/**
 * Minimal ZIP (for `.infopanel` bundles) with no dependencies.
 *
 * Writing: STORE entries (no compression) + CRC-32 — InfoPanel's importer
 * accepts any valid zip, compression is irrelevant.
 * Reading: parses the central directory; entries may be stored (C#
 * System.IO.Compression writes Deflate, so inflate raw via
 * `DecompressionStream`, available in every WebView2/Chromium we target).
 */

/* CRC-32 (IEEE 802.3, table-driven) */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ *
 * Writer (store)
 * ------------------------------------------------------------------ */

export interface ZipFile {
  name: string;
  data: Uint8Array;
}

const enc = new TextEncoder();

export function zipStore(files: ZipFile[]): Uint8Array {
  const locals: number[] = [];
  const central: number[] = [];

  const pushU16 = (arr: number[], v: number) => arr.push(v & 0xff, (v >>> 8) & 0xff);
  const pushU32 = (arr: number[], v: number) =>
    arr.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  const pushBytes = (arr: number[], src: number[] | Uint8Array) => {
    for (let i = 0; i < src.length; i++) arr.push(src[i]);
  };

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const c = locals.length; // offset of this local header

    // local file header
    pushU32(locals, 0x04034b50);
    pushU16(locals, 20); // version needed
    pushU16(locals, 0x0800); // flags: UTF-8 names
    pushU16(locals, 0); // method: store
    pushU16(locals, 0); // mod time
    pushU16(locals, 0); // mod date
    pushU32(locals, crc);
    pushU32(locals, f.data.length);
    pushU32(locals, f.data.length);
    pushU16(locals, nameBytes.length);
    pushU16(locals, 0); // extra length
    pushBytes(locals, nameBytes);
    pushBytes(locals, f.data);

    // central directory record
    pushU32(central, 0x02014b50);
    pushU16(central, 20); // made by
    pushU16(central, 20); // needed
    pushU16(central, 0x0800);
    pushU16(central, 0); // method
    pushU16(central, 0); // time
    pushU16(central, 0); // date
    pushU32(central, crc);
    pushU32(central, f.data.length);
    pushU32(central, f.data.length);
    pushU16(central, nameBytes.length);
    pushU16(central, 0); // extra
    pushU16(central, 0); // comment
    pushU16(central, 0); // disk number
    pushU16(central, 0); // internal attrs
    pushU32(central, 0); // external attrs
    pushU32(central, c); // local header offset
    pushBytes(central, nameBytes);
  }

  // end of central directory (20 bytes), placed after the central dir
  const localsLen = locals.length;
  const eocd: number[] = [];
  pushU32(eocd, 0x06054b50);
  pushU16(eocd, 0);
  pushU16(eocd, 0);
  pushU16(eocd, files.length);
  pushU16(eocd, files.length);
  pushU32(eocd, central.length);
  pushU32(eocd, localsLen); // central dir starts right after local files
  pushU16(eocd, 0);

  const out = new Uint8Array(locals.length + central.length + eocd.length);
  out.set(new Uint8Array(locals), 0);
  out.set(new Uint8Array(central), locals.length);
  out.set(new Uint8Array(eocd), locals.length + central.length);
  return out;
}

/* ------------------------------------------------------------------ *
 * Reader
 * ------------------------------------------------------------------ */

function inflateRaw(buf: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    return Promise.reject(new Error("DecompressionStream unavailable"));
  }
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter();
  const r = ds.readable.getReader();
  w.write(buf).then(() => w.close());
  const chunks: Uint8Array[] = [];
  const read = (): Promise<Uint8Array> =>
    r.read().then(({ done, value }) => {
      if (done) {
        const len = chunks.reduce((a, c) => a + c.length, 0);
        const out = new Uint8Array(len);
        let o = 0;
        for (const c of chunks) {
          out.set(c, o);
          o += c.length;
        }
        return out;
      }
      chunks.push(value);
      return read();
    });
  return read();
}

const dec = new TextDecoder();

/**
 * Unzip a `.infopanel` bundle. Returns file path → bytes (paths are
 * forward-slash; `assets/` prefix preserved).
 */
export async function unzip(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

  // Locate the End Of Central Directory record (scan last 65 KB).
  let eocd = -1;
  const min = Math.max(0, data.length - 65536);
  for (let i = data.length - 22; i >= min; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip: no EOCD");

  const count = dv.getUint16(eocd + 10, true);
  let ptr = dv.getUint32(eocd + 16, true); // cd_offset (cd_size is at +12)
  const files = new Map<string, Uint8Array>();

  for (let i = 0; i < count; i++) {
    if (dv.getUint32(ptr, true) !== 0x02014b50) break;
    const method = dv.getUint16(ptr + 10, true);
    const compSize = dv.getUint32(ptr + 20, true);
    const nameLen = dv.getUint16(ptr + 28, true);
    const extraLen = dv.getUint16(ptr + 30, true);
    const commentLen = dv.getUint16(ptr + 32, true);
    const name = dec.decode(view.subarray(ptr + 46, ptr + 46 + nameLen));
    const localOff = dv.getUint32(ptr + 42, true);

    // Local header gives the data offset (name length may differ).
    const lNameLen = dv.getUint16(localOff + 26, true);
    const lExtraLen = dv.getUint16(localOff + 28, true);
    const bodyOff = localOff + 30 + lNameLen + lExtraLen;
    const body = view.subarray(bodyOff, bodyOff + compSize);

    if (name.endsWith("/")) continue; // directory
    if (method === 0) {
      files.set(name, new Uint8Array(body));
    } else if (method === 8) {
      files.set(name, await inflateRaw(new Uint8Array(body)));
    }
    // (methods 12/14 = BZIP2/LZMA — not produced by .infopanel export)

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes], { type });
}

/** Filename-safe slug for export file names. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "profile";
}
