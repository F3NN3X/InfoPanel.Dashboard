import {
  BACKGROUND_DEFAULTS,
  MAX_BLUR,
  type BackgroundFit,
  type BackgroundType,
  type PageBackground,
  withBackgroundType,
} from "@/lib/appearance";
import { AlignGrid } from "./align-grid";
import { VideoFields } from "./background-video";
import { MediaField } from "./media-field";
import { InlineRow, SegmentedRow, SliderRow, StackRow } from "./setting-rows";

const TYPE_LABELS: Record<BackgroundType, string> = {
  none: "None",
  color: "Color",
  gradient: "Gradient",
  image: "Image",
  video: "Video",
};

const FITS: { value: BackgroundFit; label: string; title: string }[] = [
  { value: "cover", label: "Cover", title: "Fill the page, cropping the image" },
  { value: "contain", label: "Contain", title: "Show the whole image, letterboxed" },
  { value: "stretch", label: "Stretch", title: "Stretch to the page size" },
  { value: "center", label: "Center", title: "Natural size" },
  { value: "tile", label: "Tile", title: "Repeat at natural size" },
];
// A video can't repeat.
const VIDEO_FITS = FITS.filter((f) => f.value !== "tile");

interface BackgroundEditorProps {
  value: PageBackground;
  /** The types offered (a profile's own background has no "None" here). */
  types: BackgroundType[];
  onChange: (bg: PageBackground) => void;
}

/** The fields of one background: type, then that type's options and effects. */
export function BackgroundEditor({ value, types, onChange }: BackgroundEditorProps) {
  const patch = (p: Partial<PageBackground>) => onChange({ ...value, ...p });
  const gradient = value.gradient ?? BACKGROUND_DEFAULTS.gradient;
  const position = value.position ?? BACKGROUND_DEFAULTS.position;
  const fit = value.fit ?? BACKGROUND_DEFAULTS.fit;
  const isMedia = value.type === "image" || value.type === "video";
  const noun = value.type === "video" ? "video" : "image";
  return (
    <div className="space-y-2">
      <SegmentedRow
        label="Type"
        options={types.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
        value={value.type}
        onChange={(type) => onChange(withBackgroundType(value, type as BackgroundType))}
      />

      {value.type === "color" && (
        <ColorRow label="Color" value={value.color} fallback={BACKGROUND_DEFAULTS.color} onChange={(color) => patch({ color })} />
      )}

      {value.type === "gradient" && (
        <>
          <ColorRow label="From" value={gradient.from} onChange={(from) => patch({ gradient: { ...gradient, from } })} />
          <ColorRow label="To" value={gradient.to} onChange={(to) => patch({ gradient: { ...gradient, to } })} />
          <SliderRow
            label="Angle (°)"
            value={gradient.angle}
            min={0}
            max={359}
            fallback={0}
            onChange={(angle) => patch({ gradient: { ...gradient, angle } })}
          />
        </>
      )}

      {value.type === "image" && (
        <MediaField label="Image" kind="image" value={value.src} fill={value.color} onChange={(src) => patch({ src })} />
      )}
      {value.type === "video" && <VideoFields value={value} onPatch={patch} />}

      {isMedia && (
        <>
          <SegmentedRow
            label="Fit"
            options={value.type === "video" ? VIDEO_FITS : FITS}
            value={fit}
            onChange={(f) => patch({ fit: f as BackgroundFit })}
          />
          {fit !== "stretch" && (
            <StackRow label="Position">
              <AlignGrid
                label={`${noun === "video" ? "Video" : "Image"} position`}
                x={position.x}
                y={position.y}
                onChange={(x, y) =>
                  patch({
                    position: {
                      x: (x ?? "center") as "start" | "center" | "end",
                      y: (y ?? "center") as "start" | "center" | "end",
                    },
                  })
                }
              />
            </StackRow>
          )}
          <ColorRow
            label={`Fill (behind the ${noun})`}
            value={value.color}
            fallback={BACKGROUND_DEFAULTS.color}
            onChange={(color) => patch({ color })}
          />
        </>
      )}

      {(value.type === "gradient" || isMedia) && <Effects value={value} onPatch={patch} />}
    </div>
  );
}

/** Dim, tint and blur over the media. */
function Effects({ value, onPatch }: { value: PageBackground; onPatch: (p: Partial<PageBackground>) => void }) {
  const set = [value.dim, value.tintOpacity, value.blur].filter((v) => (v ?? 0) > 0).length;
  return (
    <div className="space-y-2 border-t border-ui-subtle pt-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-semibold text-ui-1">Effects</span>
        {set > 0 && <span className="font-ui-mono text-[10px] text-ui-accent-text">{set} set</span>}
      </div>
      <SliderRow label="Dim (%)" value={value.dim ?? 0} min={0} max={100} fallback={0} onChange={(dim) => onPatch({ dim })} />
      <ColorRow
        label="Tint"
        value={value.tint}
        fallback={BACKGROUND_DEFAULTS.tint}
        onChange={(tint) => onPatch({ tint, tintOpacity: value.tintOpacity || 30 })}
      />
      <SliderRow
        label="Tint opacity (%)"
        value={value.tintOpacity ?? 0}
        min={0}
        max={100}
        fallback={0}
        onChange={(tintOpacity) => onPatch({ tintOpacity })}
      />
      <SliderRow label="Blur (px)" value={value.blur ?? 0} min={0} max={MAX_BLUR} fallback={0} onChange={(blur) => onPatch({ blur })} />
    </div>
  );
}

/** A 6-digit hex for the native picker (it can't show other syntaxes). */
function pickerHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : "#000000";
}

function ColorRow({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  /** Shown (and picked from) while unset. */
  fallback?: string;
  onChange: (color: string) => void;
}) {
  const shown = value ?? fallback ?? "#000000";
  return (
    <InlineRow label={label}>
      <span className="flex items-center gap-1.5">
        <span className="font-ui-mono text-[11.5px] text-ui-2">{shown}</span>
        <label
          className="relative h-[22px] w-[22px] shrink-0 cursor-pointer overflow-hidden rounded-md border border-ui-strong"
          style={{ backgroundColor: shown }}
        >
          <input
            type="color"
            aria-label={label}
            value={pickerHex(shown)}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </span>
    </InlineRow>
  );
}
