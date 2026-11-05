import { useEffect, useMemo, useState } from "react";
import { usePack, type Pack } from "@/looks/pack";

type Fonts = NonNullable<Pack["fonts"]>;

/** The built-in packs' manifests, each its own lazy chunk: only the Theme page reads a font's source and licence from them. */
const manifests = import.meta.glob<{ fonts?: { source?: string; licence?: string }[] }>("../../looks/packs/*/pack.json", { import: "default" });

/** The pack a theme is, with the source and licence of its fonts (a built-in's are read from its manifest here, so the kiosk's pack code carries none). */
export function usePackWithFonts(lookId: string | undefined): Pack | undefined {
  const pack = usePack(lookId);
  const [read, setRead] = useState<{ id: string; fonts: Fonts }>();
  const load = pack && !pack.fonts && lookId ? manifests[`../../looks/packs/${lookId}/pack.json`] : undefined;
  useEffect(() => {
    if (!load || !lookId) return;
    let live = true;
    void load().then(
      (m) => live && setRead({ id: lookId, fonts: (m.fonts ?? []).map((f) => ({ source: f.source, licence: f.licence })) }),
      () => {}
    );
    return () => {
      live = false;
    };
  }, [load, lookId]);
  return useMemo(() => (pack && !pack.fonts && read && read.id === lookId ? { ...pack, fonts: read.fonts } : pack), [pack, read, lookId]);
}
