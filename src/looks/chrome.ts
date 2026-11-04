// The colours a worn pack gives the page's chrome, the island's pill and the alerts' cards (L25): the pack's own surface, text and edge,
// so a light pack does not carry a black pill. No blur: the page's 8 backdrop layers reserve one each for the island and an alert layer.
import { resolveT1 } from "./look";
import type { Pack } from "./pack";

export interface PackChrome {
  fill: string;
  ink: string;
  edge: string;
}

/** A pack's chrome from its Look's first supported mode; undefined without a pack (Classic, a skin or a sample keep the app's own). */
export function packChrome(pack: Pack | undefined): PackChrome | undefined {
  if (!pack) return undefined;
  const t1 = resolveT1(pack.look, pack.look.modes.supported[0]);
  return { fill: t1.surface, ink: t1.fg, edge: t1.border };
}
