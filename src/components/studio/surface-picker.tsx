import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { STANDARD_SETTINGS } from "@/modules/standard-settings";
import { lookBox, resolveAccent } from "@/widgets/core/look";
import { SKINS, SURFACES, resolveSurface, textVars } from "@/widgets/core/theme";
import { SegmentedRow, SliderRow } from "./setting-rows";

/** The surface choices of a template widget (Auto, the app's materials, the generic cards). */
const SURFACE_OPTIONS = STANDARD_SETTINGS.find((s) => s.key === "surface")?.options ?? [];

/** The blur steps of the look's `blur` select; "auto" (none set) shows as Off. */
const BLUR_OPTIONS = (STANDARD_SETTINGS.find((s) => s.key === "blur")?.options ?? [])
  .filter((o) => o.value !== "0")
  .map((o) => ({ value: o.value, label: o.value === "auto" ? "Off" : o.value }));

interface CardEffectsProps {
  /** The scope's stored `surfaceOpacity` (0–100) and `blur` (a px option or `auto`). */
  opacity: unknown;
  blur: unknown;
  onOpacity: (value: number) => void;
  onBlur: (value: string) => void;
}

/**
 * Appearance › Theme & surface: how much of the page background (colour,
 * image or video) shows through every widget's card, and how much it is
 * frosted. Both are the global style's look keys, so a widget can still
 * set its own.
 */
export function CardEffects({ opacity, blur, onOpacity, onBlur }: CardEffectsProps) {
  const n = Number(opacity);
  return (
    <div className="space-y-3">
      <SliderRow
        label="Background opacity"
        hint="Lower lets the page background show through the widgets"
        unit="%"
        value={opacity === undefined || opacity === "" || !Number.isFinite(n) ? 100 : n}
        min={0}
        max={100}
        step={5}
        fallback={100}
        onChange={onOpacity}
      />
      <SegmentedRow
        label="Background blur (px)"
        hint="Frosts what shows through; needs opacity under 100%"
        options={BLUR_OPTIONS}
        value={blur === undefined || blur === "" ? "auto" : String(blur)}
        onChange={onBlur}
      />
    </div>
  );
}

/** The value the scope shows: unset = the skin's card when a skin is chosen, else glass (`withSkinSurface`). */
export function shownSurface(surface: unknown, skin: unknown): string {
  if (surface && surface !== "auto") return String(surface);
  return surface === "auto" || (skin && skin !== "auto") ? "auto" : "glass";
}

/** One card material at thumbnail size: its background, edge and text tone, an accent bar. */
function SurfaceSwatch({ name, skin, accent }: { name: string; skin: string; accent: string | undefined }) {
  const surf = name === "auto" ? resolveSurface("auto", skin) : SURFACES[name];
  const style = {
    ...lookBox(surf, undefined),
    ...textVars(surf.tone),
    "--accent": resolveAccent(accent, SKINS[skin] ?? {}, surf.tone),
    color: "var(--w-fg)",
    borderRadius: 8,
  } as CSSProperties;
  return (
    <div className={cn("relative flex h-11 flex-col justify-between overflow-hidden p-1.5", surf.c)} style={style}>
      <span className="text-[11px] font-semibold leading-none tabular-nums">42°</span>
      <span className="h-[3px] w-full rounded-full bg-[color:var(--w-track)]">
        <span className="block h-full w-3/5 rounded-full" style={{ background: "var(--accent)" }} />
      </span>
    </div>
  );
}

interface SurfacePickerProps {
  /** The scope's stored surface and skin (unset = not set at this scope). */
  surface: unknown;
  skin: unknown;
  accent?: string;
  onPick: (surface: string) => void;
}

/**
 * Appearance › Theme & surface: the card every widget draws on, as live
 * swatches. Auto is the skin's own card; any other choice replaces only the
 * card and keeps the skin's type, numerals and graphs.
 */
export function SurfacePicker({ surface, skin, accent, onPick }: SurfacePickerProps) {
  const skinName = skin && skin !== "auto" ? String(skin) : "default";
  const active = shownSurface(surface, skin);
  return (
    <div className="space-y-1.5">
      <div className="text-[12.5px] text-ui-1">Surface</div>
      <div className="grid grid-cols-4 gap-1.5">
        {SURFACE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            title={o.label}
            aria-label={`Surface ${o.label}`}
            aria-pressed={o.value === active}
            className="min-w-0 text-left outline-none"
          >
            <div
              className={cn(
                "rounded-[10px] p-[2px]",
                o.value === active ? "ring-2 ring-ui-accent" : "hover:ring-1 hover:ring-ui-strong"
              )}
            >
              <SurfaceSwatch name={o.value} skin={skinName} accent={accent} />
            </div>
            <div className={cn("mt-1 truncate text-[10.5px]", o.value === active ? "text-ui-1" : "text-ui-3")}>
              {o.value === "auto" ? "Auto" : o.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
