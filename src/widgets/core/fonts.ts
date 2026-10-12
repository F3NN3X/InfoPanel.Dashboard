// Skin fonts: each skin pack lists font catalog ids; they load the first time the skin is used.
import { ensureFont, type FontDocument } from "@/lib/fonts";
import { SKIN_PACKS } from "./theme";

/**
 * Load a skin's fonts through `ensureFont`, which injects each stylesheet once (so this is
 * idempotent). A no-op for an unknown skin and when there is no document (node, tests).
 */
export function ensureSkinFonts(skin: string, doc: FontDocument | undefined = globalThis.document): void {
  if (!doc) return;
  for (const id of SKIN_PACKS.find((p) => p.name === skin)?.fonts ?? []) ensureFont(id, doc);
}
