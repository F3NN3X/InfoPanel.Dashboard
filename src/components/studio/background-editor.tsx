import { Segmented } from "@/components/ui/segmented";
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
import { CollapsibleSection } from "./collapsible-section";
import { MediaField } from "./media-field";

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
    <div className="space-y-3">
      <Segmented
        options={types.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
        value={value.type}
        onChange={(type) => onChange(withBackgroundType(value, type))}
        className="w-full *:flex-1"
      />

      {value.type === "color" && (
        <ColorField label="Color" value={value.color} fallback={BACKGROUND_DEFAULTS.color} onChange={(color) => patch({ color })} />
      )}

      {value.type === "gradient" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="From" value={gradient.from} onChange={(from) => patch({ gradient: { ...gradient, from } })} />
            <ColorField label="To" value={gradient.to} onChange={(to) => patch({ gradient: { ...gradient, to } })} />
          </div>
          <RangeField
            label="Angle"
            value={gradient.angle}
            max={359}
            unit="°"
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
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Fit</div>
            <Segmented
              options={value.type === "video" ? VIDEO_FITS : FITS}
              value={fit}
              onChange={(f) => patch({ fit: f })}
              className="w-full *:flex-1"
            />
          </div>
          {fit !== "stretch" && (
            <div className="break-inside-avoid">
              <div className="mb-1 text-xs text-muted-foreground">Position</div>
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
            </div>
          )}
          <ColorField
            label={`Fill (behind the ${noun})`}
            value={value.color}
            fallback={BACKGROUND_DEFAULTS.color}
            onChange={(color) => patch({ color })}
          />
        </>
      )}

      {(value.type === "gradient" || isMedia) && <EffectsSection value={value} onPatch={patch} />}
    </div>
  );
}

/** Dim, tint and blur over the media. */
function EffectsSection({ value, onPatch }: { value: PageBackground; onPatch: (p: Partial<PageBackground>) => void }) {
  const set = [value.dim, value.tintOpacity, value.blur].filter((v) => (v ?? 0) > 0).length;
  return (
    <CollapsibleSection id="background:Effects" title="Effects" aside={set > 0 ? `${set} set` : ""} defaultOpen>
      <RangeField label="Dim" value={value.dim ?? 0} max={100} unit="%" onChange={(dim) => onPatch({ dim })} />
      <ColorField
        label="Tint"
        value={value.tint}
        fallback={BACKGROUND_DEFAULTS.tint}
        onChange={(tint) => onPatch({ tint, tintOpacity: value.tintOpacity || 30 })}
      />
      <RangeField
        label="Tint opacity"
        value={value.tintOpacity ?? 0}
        max={100}
        unit="%"
        onChange={(tintOpacity) => onPatch({ tintOpacity })}
      />
      <RangeField label="Blur" value={value.blur ?? 0} max={MAX_BLUR} unit="px" onChange={(blur) => onPatch({ blur })} />
    </CollapsibleSection>
  );
}

/** A 6-digit hex for the native picker (it can't show other syntaxes). */
function pickerHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : "#000000";
}

function ColorField({
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
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={pickerHex(shown)}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <span className="text-xs tabular-nums text-muted-foreground">{shown}</span>
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-ring"
      />
    </div>
  );
}
