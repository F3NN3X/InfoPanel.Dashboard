// The theme pack entry (P9): what the kiosk and studio entries carry of the pack system. A pack is code and assets in a chunk
// of its own, loaded with import() the first time a screen wears its Look (pack-load.ts, where G4 is enforced); Classic, the
// skins and the sample Looks are not packs and load nothing. This file holds the types, the id list and the two thin readers.
import { useEffect, useState, type ComponentType } from "react";
import type { IconGlyph } from "@/widgets/core/types";
import type { Look } from "./look";

/** One page layer under the grid: a fill (a colour or gradient) and/or an image from the pack's own folder (`base` + `image`). */
export interface StageLayer {
  fill?: string;
  image?: string;
  opacity?: number;
}

/** What a pack draws behind (up to 3 layers) and over (one overlay) the page. */
export interface PackStageSpec {
  layers: StageLayer[];
  overlay?: ComponentType;
}

/** The parts of a Look a pack carries beyond look.json values: component slots on the widget card and an icon set. */
export interface PackSlots {
  ornament?: ComponentType;
  tabBand?: ComponentType;
  icons?: Record<string, IconGlyph>;
}

/** The component that draws a stage (`PackStageLayers`, pack-stage.tsx); the loader puts it on the pack, so the entry holds no lazy boundary for it. */
export type StageView = ComponentType<{ stage: PackStageSpec; packId?: string; base?: string; className?: string; overlayClassName?: string }>;

/** A loaded pack. Its Look's T3 values reach the widgets (`<Widget t3>`), its slots the card, its stage the page. */
export interface Pack {
  id: string;
  look: Look;
  /** Where the pack's files are served from (a URL ending in `/`); `image` paths are relative to it. */
  base?: string;
  /** Pack CSS (paint only); refused unless `packCssIssues` finds nothing. */
  css?: string;
  /** Every file the pack names, relative to `base`; refused unless each is pack-relative. */
  assets?: string[];
  slots?: PackSlots;
  stage?: PackStageSpec;
  /** Set by the loader. */
  Stage?: StageView;
}

const ids = new Set<string>();
/** The Looks that are packs. Keep in step with `BUILTIN` in pack-load.ts (a test pins it); none ships yet. */
export const PACK_IDS: ReadonlySet<string> = ids;
/** Adds or removes a pack id (`registerPack` and `unregisterPack`, pack-load.ts). */
export function setPackId(id: string, on: boolean): void {
  if (on) ids.add(id);
  else ids.delete(id);
}

/** The pack a Look is (undefined for Classic, a skin, a sample Look, or while it loads or when the loader refused it). */
export function usePack(lookId: string | undefined): Pack | undefined {
  const [loaded, setLoaded] = useState<{ id: string; pack?: Pack }>();
  useEffect(() => {
    if (!lookId || !PACK_IDS.has(lookId)) return;
    let live = true;
    let off = () => {};
    // A result lands only while this is still the Look asked for, and with its CSS in the page (one shared load per pack).
    import("./pack-load")
      .then(async (m) => {
        const pack = await m.sharedPack(lookId);
        if (!live) return;
        if (pack) off = m.mountPackCss(pack);
        setLoaded({ id: lookId, pack });
      })
      .catch(() => live && setLoaded({ id: lookId }));
    return () => {
      live = false;
      off();
      // its CSS is out: a later switch back to this Look must not return the old result before the CSS is mounted again
      setLoaded((now) => (now?.id === lookId ? undefined : now));
    };
  }, [lookId]);
  return loaded?.id === lookId ? loaded?.pack : undefined;
}

/** A pack with a stage draws a page background of its own (the page keeps no `bg-background` under it). */
export const packBackground = (pack: Pack | undefined): boolean => !!pack?.stage?.layers.length;

/** The pack's page layers (`className` places them, as `PageBackground`'s; `overlayClassName` the overlay); nothing without a pack stage. */
export function PackStage({ pack, className, overlayClassName }: { pack: Pack | undefined; className?: string; overlayClassName?: string }) {
  const View = pack?.Stage;
  return pack?.stage && View ? <View stage={pack.stage} packId={pack.id} base={pack.base} className={className} overlayClassName={overlayClassName} /> : null;
}
