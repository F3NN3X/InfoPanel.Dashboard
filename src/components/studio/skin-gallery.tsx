import { cn } from "@/lib/utils";
import { Widget } from "@/widgets/core/Widget";
import { Num, Spark } from "@/widgets/core/primitives";
import { SKIN_PACKS, SKINS } from "@/widgets/core/theme";

const HISTORY = [38, 44, 41, 52, 48, 61, 57, 66, 59, 63];

/** One skin drawn live: its own card, fonts, numerals and graph at thumbnail size. */
function SkinPreview({ skin }: { skin: string }) {
  return (
    <div className="h-[60px]">
      <Widget skin={skin} surface="auto" radius={Math.min(SKINS[skin]?.radius ?? 16, 12)} showHeader={false}>
        <div className="flex h-full flex-col justify-between">
          <Num className="text-[15px] leading-none">63%</Num>
          <Spark values={HISTORY} min={0} max={100} className="h-4" />
        </div>
      </Widget>
    </div>
  );
}

interface SkinGalleryProps {
  /** The scope's skin (`auto` / unset = the default skin). */
  value: string | undefined;
  /** Pick a skin; the caller also sets the surface to Auto (one undo step). */
  onPick: (skin: string) => void;
}

/**
 * Appearance › Skins: every skin as a live mini widget. A skin sets the type,
 * numerals, graphs, meters, header and its own card; picking one sets the
 * scope's surface to Auto so the skin shows whole.
 */
export function SkinGallery({ value, onPick }: SkinGalleryProps) {
  const active = !value || value === "auto" ? "default" : value;
  return (
    <div className="grid grid-cols-3 gap-2">
      {SKIN_PACKS.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => onPick(p.name)}
          title={p.description}
          aria-label={`Apply skin ${p.name}`}
          aria-pressed={p.name === active}
          className="min-w-0 text-left outline-none"
        >
          <div
            className={cn(
              "rounded-[10px] p-[2px] transition-shadow",
              p.name === active ? "ring-2 ring-ui-accent" : "hover:ring-1 hover:ring-ui-strong"
            )}
          >
            <SkinPreview skin={p.name} />
          </div>
          <div className={cn("mt-[5px] truncate text-[11.5px] capitalize", p.name === active ? "text-ui-1" : "text-[#b4b4bc]")}>
            {p.name}
          </div>
        </button>
      ))}
    </div>
  );
}
