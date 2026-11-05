/**
 * Browser-only image work for gauges: recolouring frames through a canvas.
 */
import { assetFile, MIME, type AssetFile } from "../assets/assets.ts";

async function pngOf(canvas: OffscreenCanvas): Promise<Uint8Array> {
  return new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
}

export interface Recolour {
  /** Degrees. */
  hue: number;
  /** Percent; 100 keeps it. */
  saturation: number;
  brightness: number;
}

export const NO_RECOLOUR: Recolour = { hue: 0, saturation: 100, brightness: 100 };

/** The same adjustment as a CSS filter, for previews. */
export const recolourFilter = (r: Recolour) => `hue-rotate(${r.hue}deg) saturate(${r.saturation}%) brightness(${r.brightness}%)`;

/**
 * Recoloured copies of frames, as PNG (`-recoloured` added to the name).
 * Animated files would lose their animation, so they are refused.
 */
export async function recolourFrames(frames: readonly AssetFile[], r: Recolour): Promise<AssetFile[]> {
  const animated = frames.find((f) => f.animated || f.type === "video" || f.type === "svg" || f.type === "other");
  if (animated) throw new Error(`${animated.name} is ${animated.animated ? "animated" : `a ${animated.type} file`}; only still images recolor`);
  const done = new Map<string, AssetFile>();
  const out: AssetFile[] = [];
  for (const f of frames) {
    // A frame used twice is recoloured once.
    const known = done.get(f.hash);
    if (known) {
      out.push(known);
      continue;
    }
    const bitmap = await createImageBitmap(new Blob([f.bytes.slice()], { type: MIME[f.type] }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d")!;
    ctx.filter = recolourFilter(r);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const stem = f.name.replace(/\.[^.]*$/, "");
    const file = await assetFile(`${stem}-recoloured.png`, await pngOf(canvas), "added");
    done.set(f.hash, file);
    out.push(file);
  }
  return out;
}
