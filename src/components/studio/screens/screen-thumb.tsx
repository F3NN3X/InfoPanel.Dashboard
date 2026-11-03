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
 */
export function ScreenThumb({ profile }: { profile: MonitorProfile }) {
  const shot = useShot(profile.id);
  // The last image that finished loading stays up until the next one has, so a re-capture never drops back to the schematic.
  const [loaded, setLoaded] = useState<string | null>(null);
  const canvas = screenKind(profile) === "infopanel" ? profile.pages[0]?.placements.find((z) => z.module === CANVAS_ID && z.canvas)?.canvas : undefined;
  if (canvas) return <CanvasThumb canvas={canvas} />;
  return (
    <div className="relative h-full w-full">
      <PageMap profile={profile} page={profile.pages[0]} />
      {loaded && loaded !== shot?.dataUrl && <img src={loaded} alt="" draggable={false} className="absolute inset-0 h-full w-full object-contain" />}
      {shot && (
        <img
          src={shot.dataUrl}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(shot.dataUrl)}
          className={cn("absolute inset-0 h-full w-full object-contain transition-opacity duration-[120ms]", loaded === shot.dataUrl ? "opacity-100" : "opacity-0")}
        />
      )}
    </div>
  );
}
