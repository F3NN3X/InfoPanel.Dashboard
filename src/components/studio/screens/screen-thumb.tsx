import { useState } from "react";
import { CanvasThumb } from "@/components/infopanel/profile-thumb";
import { CANVAS_ID, type MonitorProfile } from "@/lib/layout";
import { screenKind } from "@/lib/screens/list";
import { cn } from "@/lib/utils";
import { useShot } from "../profile-shot-store";
import { PageMap } from "./page-map";

/**
 * A screen's thumbnail: its first page as a schematic at once, replaced by its kept screenshot (a dashboard screen is
 * captured by `ProfileShots`, so it fills in a moment after an edit) with a short fade, or, for a screen that is one
 * InfoPanel profile, the profile drawn live.
 *
 * `still` is the frozen kind for a card that appears once per display (Live on displays): never a renderer, so an
 * InfoPanel screen is its schematic, and the kept screenshot (a picture of the first page) shows only on the first page. It
 * shows `pageId` when that page exists.
 */
export function ScreenThumb({ profile, pageId, still = false }: { profile: MonitorProfile; pageId?: string; still?: boolean }) {
  const shot = useShot(profile.id);
  // The last image that finished loading stays up until the next one has, so a re-capture never drops back to the schematic.
  const [loaded, setLoaded] = useState<string | null>(null);
  const canvas = !still && screenKind(profile) === "infopanel" ? profile.pages[0]?.placements.find((z) => z.module === CANVAS_ID && z.canvas)?.canvas : undefined;
  if (canvas) return <CanvasThumb canvas={canvas} />;
  const page = profile.pages.find((p) => p.id === pageId) ?? profile.pages[0];
  // The screenshot is of the first page; another page is its schematic.
  const first = page === profile.pages[0];
  const shown = first ? shot : undefined;
  return (
    <div className="relative h-full w-full">
      <PageMap profile={profile} page={page} />
      {first && loaded && loaded !== shown?.dataUrl && <img src={loaded} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />}
      {shown && (
        <img
          src={shown.dataUrl}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(shown.dataUrl)}
          className={cn("absolute inset-0 h-full w-full object-contain transition-opacity duration-[120ms]", loaded === shown.dataUrl ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}
