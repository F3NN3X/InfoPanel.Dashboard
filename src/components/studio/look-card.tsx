import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { type GalleryLook } from "./look-gallery-model";
import { LookThumb } from "./look-thumb";

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent";
/** The card thumbnail's width in the 360 px column (two cards a row). */
const THUMB = 150;

/** One card: the real-render thumbnail, the name and its tags; picking applies it. */
export function Card({ look, selected, onPick }: { look: Pick<GalleryLook, "id" | "name" | "tags" | "preset">; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${look.name}${look.tags.length > 0 ? `, ${look.tags.join(", ")}` : ""}`}
      data-look-card={look.id}
      className={cn(
        "flex min-h-11 flex-col overflow-hidden rounded-lg border bg-ui-panel text-left hover:border-ui-menu",
        FOCUS,
        selected ? "border-ui-accent ring-2 ring-ui-accent/40" : "border-ui-strong"
      )}
    >
      <LookThumb preset={look.preset} width={THUMB} className="w-full" />
      <span className="flex flex-col gap-0.5 px-2.5 pb-2 pt-1.5">
        <span className="flex items-center justify-between gap-1 text-caption font-semibold text-ui-1">
          <span className="truncate">{look.name}</span>
          {selected && <Check className="h-3.5 w-3.5 shrink-0 text-ui-accent-text" aria-hidden />}
        </span>
        {look.tags.length > 0 && <span className="truncate text-micro text-ui-soft">{look.tags.join(" · ")}</span>}
      </span>
    </button>
  );
}
