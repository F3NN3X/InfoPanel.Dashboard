import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { MotionOverride } from "@/hooks/use-performance";
import { FrozenSensorsContext } from "@/hooks/use-preview-data";
import { presetTokens, type AppearancePreset } from "@/lib/appearance-presets";
import { CONFIG_VERSION, type DashboardConfig, type MonitorProfile, type Placement } from "@/lib/layout";
import { mainPage } from "@/lib/pages";
import { previewSnapshot } from "@/lib/preview-data";
import { cn } from "@/lib/utils";
import { ProfilePage } from "./profile-page";

/**
 * A Look's thumbnail drawn by the real renderer (investigation 7 F4): three real widgets on a small screen that wears
 * the preset's colours, corners, background and widget style, so a skin's header, rings and numerals and a card's
 * glow show as they do on the canvas. Mounted only once scrolled into view, one per frame, on the frozen snapshot
 * (no stream per thumbnail) with reduced motion; nothing in it is interactive.
 */

/** The thumbnail screen's size (px); the card scales it down. */
export const THUMB_W = 480;
export const THUMB_H = 300;

const zone = (id: string, module: string, colStart: number, rowStart: number, colSpan: number, rowSpan: number): Placement => ({
  id,
  module,
  colStart,
  rowStart,
  colSpan,
  rowSpan,
  visible: true,
});

/** The three widgets every thumbnail shows: a CPU card with its graph, a clock and the GPU rings. */
const ZONES: readonly Placement[] = [zone("thumb-cpu", "CpuMonitor", 1, 1, 2, 2), zone("thumb-clock", "Clock", 3, 1, 1, 1), zone("thumb-gpu", "GpuRings", 3, 2, 1, 1)];

/** The small screen a preset is drawn on. */
export function thumbProfile(preset: AppearancePreset): MonitorProfile {
  return {
    id: "look-thumb",
    name: preset.name,
    width: THUMB_W,
    height: THUMB_H,
    cols: 3,
    rows: 2,
    fit: "fill",
    gap: 10,
    padding: 10,
    pages: [mainPage([...ZONES])],
    widgetTheme: { values: { ...preset.style } },
    theme: presetTokens(preset),
    radius: preset.radius,
    ...(preset.background ? { background: preset.background } : {}),
  };
}

// One thumbnail mounts per frame, in the order they came into view.
const queue: (() => void)[] = [];
let busy = false;
function pump(): void {
  if (busy) return;
  const next = queue.shift();
  if (!next) return;
  busy = true;
  next();
  requestAnimationFrame(() => {
    busy = false;
    pump();
  });
}

/** Whether the element has come into view (and its turn in the queue); stays true after. */
function useShown(ref: RefObject<HTMLElement | null>): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    let live = true;
    const run = () => live && setShown(true);
    if (typeof IntersectionObserver === "undefined") {
      queue.push(run);
      pump();
      return () => void (live = false);
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      queue.push(run);
      pump();
    });
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [ref, shown]);
  return shown;
}

export interface LookThumbProps {
  preset: AppearancePreset;
  /** The drawn width in px (the height follows the screen's 8:5). */
  width: number;
  className?: string;
}

/** A preset drawn small by the real renderer, once in view. */
export function LookThumb({ preset, width, className }: LookThumbProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useShown(ref);
  const profile = useMemo(() => thumbProfile(preset), [preset]);
  const dashboard = useMemo<DashboardConfig>(() => ({ version: CONFIG_VERSION, activeProfile: "auto", profiles: [profile] }), [profile]);
  const scale = width / THUMB_W;
  useEffect(() => {
    if (shown && previewSnapshot.getState().takenAt === null) void previewSnapshot.take();
  }, [shown]);
  return (
    <div
      ref={ref}
      aria-hidden
      data-look-thumb={preset.id}
      className={cn("relative shrink-0 overflow-hidden bg-s-well", className)}
      style={{ width, height: THUMB_H * scale }}
    >
      {shown && (
        <div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ scale: String(scale) }} inert>
          <FrozenSensorsContext.Provider value={previewSnapshot}>
            <MotionOverride reduce>
              <ProfilePage profile={profile} dashboard={dashboard} />
            </MotionOverride>
          </FrozenSensorsContext.Provider>
        </div>
      )}
    </div>
  );
}
