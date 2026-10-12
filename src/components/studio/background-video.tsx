import { Segmented } from "@/components/ui/segmented";
import type { PageBackground } from "@/lib/appearance";
import { cn } from "@/lib/utils";
import { MediaField } from "./media-field";

const RATES = ["0.5", "0.75", "1", "1.25", "1.5", "2"].map((r) => ({ value: r, label: `${r}×` }));

interface VideoFieldsProps {
  value: PageBackground;
  onPatch: (p: Partial<PageBackground>) => void;
}

/** A video background's source, poster and playback, with a performance hint. */
export function VideoFields({ value, onPatch }: VideoFieldsProps) {
  const rate = String(value.rate ?? 1);
  return (
    <>
      <MediaField label="Video" kind="video" value={value.src} fill={value.color} onChange={(src) => onPatch({ src })} />
      <MediaField
        label="Poster image"
        kind="image"
        value={value.poster}
        fill={value.color}
        onChange={(poster) => onPatch({ poster })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Toggle label="Loop" on={value.loop ?? true} onChange={(loop) => onPatch({ loop })} />
        <Toggle label="Muted" on={value.muted ?? true} onChange={(muted) => onPatch({ muted })} />
      </div>
      <div>
        <div className="mb-1 text-xs text-muted-foreground">Speed</div>
        <Segmented
          options={RATES.some((r) => r.value === rate) ? RATES : [...RATES, { value: rate, label: `${rate}×` }]}
          value={rate}
          onChange={(r) => onPatch({ rate: Number(r) })}
          className="w-full *:flex-1"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground/70">
        The poster shows until the video plays, and in its place on reduced motion. The kiosk plays this
        around the clock: use H.264 MP4 or VP9 WebM at the display&apos;s resolution and 24–30 fps. Blur
        over a video re-composites every frame, so keep it low or off. With sound on, the browser may
        still start it muted.
      </p>
    </>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("relative h-4 w-7 rounded-full transition-colors", on ? "bg-ring" : "bg-muted-foreground/30")}>
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
            on ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}
