import { useEffect, useMemo, useState } from "react";
import type { IPItem, IPProfile } from "@/lib/ip/types";
import type { SensorMap } from "@/modules/types";
import { sampleBindings } from "@/lib/ip/history";
import { cssColor, renderItem } from "./items";

export interface IPCanvasProps {
  profile: IPProfile;
  sensors: SensorMap;
  /** Static asset base URL, e.g. `/assets/ip/arcv2`. */
  assetBase: string;
  /** 1:1 (kiosk) or scaled (preview). */
  scale?: number;
  /** 1-second clock tick for clock/calendar items. */
  tick?: boolean;
  now?: Date;
  children?: React.ReactNode;
}

/** Flatten the item tree to z-ordered render units (groups splice in place). */
export function flattenItems(items: IPItem[]): IPItem[] {
  const out: IPItem[] = [];
  const walk = (list: IPItem[]) => {
    for (const it of list) {
      if (it.kind === "group") {
        if (!it.hidden) walk(it.children);
      } else {
        if (!it.hidden) out.push(it);
      }
    }
  };
  walk(items);
  return out;
}

export function IPCanvas({ profile, sensors, assetBase, scale = 1, tick = true, now, children }: IPCanvasProps) {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    if (!tick) return;
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Feed the chart history queues once per snapshot.
  useEffect(() => {
    const charts = flattenItems(profile.items).filter((i) => i.kind === "graph" || i.kind === "bar" || i.kind === "donut");
    if (charts.length > 0) {
      sampleBindings(sensors, charts.map((i) => (i.kind === "graph" ? i.sensor : i.kind === "bar" ? i.sensor : i.sensor)));
    }
  }, [sensors, profile.items]);

  const flat = useMemo(() => flattenItems(profile.items), [profile.items]);
  const ctx = useMemo(
    () => ({ profile, sensors, assetBase, now: now ?? t }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, sensors, assetBase, now, t]
  );

  const bg = cssColor(profile.backgroundColor);
  const alpha = bg?.startsWith("rgba") ? parseInt(bg.slice(bg.indexOf(",") + 5), 10) ?? 255 : 255;

  return (
    <div
      style={{
        position: "relative",
        width: profile.width * scale,
        height: profile.height * scale,
        background: alpha === 0 ? "transparent" : bg,
        overflow: "hidden",
      }}
    >
      {scale !== 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: profile.width,
            height: profile.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {flat.map((item) => renderItem(item, ctx))}
        </div>
      )}
      {scale === 1 && flat.map((item) => renderItem(item, ctx))}
      {children}
    </div>
  );
}
