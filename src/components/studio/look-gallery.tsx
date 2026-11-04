import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Search } from "lucide-react";
import type { AppearancePreset } from "@/lib/appearance-presets";
import { onRovingKeyDown } from "@/lib/roving";
import { SAMPLE_PRESET_GROUPS } from "@/lib/screen-templates/sample-presets";
import { cn } from "@/lib/utils";
import { loadLook } from "@/looks";
import type { Look } from "@/looks/look";
import { filterLooks, GALLERY_FILTERS, GALLERY_IDS, galleryLooks, type GalleryLook } from "./look-gallery-model";
import { LookThumb } from "./look-thumb";
import { getKeepBackground, setKeepBackground } from "./theme-keep-background";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent";
const HEADING = "font-ui-mono text-nano uppercase tracking-[0.08em] text-ui-hint";
/** The card thumbnail's width in the 360 px column (two cards a row). */
const THUMB = 150;

export interface LookGalleryProps {
  /** The Look the level shows (its card is ringed when no saved look is applied). */
  currentLookId: string;
  /** The applied snapshot's id (a saved look's card is ringed). */
  currentPresetId?: string;
  /** The saved looks, as cards after the Looks. */
  saved: readonly AppearancePreset[];
  /** Apply a card: a Look (`look`, it keeps the level's own values) or a saved look. */
  onPick: (preset: AppearancePreset, keepBackground: boolean, look: boolean) => void;
  /** Saved looks and template looks, with their actions; its count line. */
  onMore: () => void;
  moreCount: string;
}

const SAMPLES = SAMPLE_PRESET_GROUPS.flatMap((g) => g.presets);

/** One card: the real-render thumbnail, the name and its tags; picking applies it. */
function Card({ look, selected, onPick }: { look: Pick<GalleryLook, "id" | "name" | "tags" | "preset">; selected: boolean; onPick: () => void }) {
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

/**
 * The Look gallery (D14, investigation 7 F5; mockup `docs/look-system/mockups/Gallery.html`): filter chips and a
 * search, the Looks as cards drawn by the real renderer, then the saved looks; one click applies. Keep my background
 * and the template looks (with the saved looks' actions) sit under the cards.
 */
export function LookGallery({ currentLookId, currentPresetId, saved, onPick, onMore, moreCount }: LookGalleryProps) {
  const [looks, setLooks] = useState<readonly Look[]>();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [keep, setKeep] = useState(getKeepBackground);
  useEffect(() => {
    let live = true;
    void Promise.all(GALLERY_IDS.map(loadLook)).then((all) => live && setLooks(all.filter((l): l is Look => l !== undefined)));
    return () => void (live = false);
  }, []);
  const list = useMemo(() => (looks ? galleryLooks(looks, SAMPLES) : []), [looks]);
  const shown = filterLooks(list, filter, query);
  const savedShown = filter === "all" ? saved.filter((p) => query.trim() === "" || p.name.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const savedApplied = saved.some((p) => p.id === currentPresetId);
  const pick = (preset: AppearancePreset, look = false) => onPick(preset, keep, look);
  return (
    <section aria-label="Look gallery" data-nav-section="gallery" className="flex flex-col gap-3 border-t border-ui-subtle px-4 pb-4 pt-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-ui-1">Choose a Look</h2>
        <span className="text-micro text-ui-hint">{looks ? `${list.length} Looks` : "Loading…"}</span>
      </div>
      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-ui-strong bg-ui-app px-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ui-accent">
        <Search className="h-4 w-4 shrink-0 text-ui-hint" aria-hidden />
        <span className="sr-only">Search Looks</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search Looks"
          className="min-w-0 flex-1 bg-transparent text-body text-ui-1 outline-none placeholder:text-ui-hint"
        />
      </label>
      <div role="radiogroup" aria-label="Filter Looks" onKeyDown={(e) => onRovingKeyDown(e, "[role=radio]")} className="flex flex-wrap gap-1.5">
        {GALLERY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filter === f.id}
            tabIndex={filter === f.id ? 0 : -1}
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-11 rounded-full border px-3 text-caption",
              FOCUS,
              filter === f.id ? "border-ui-accent bg-ui-blue-bg text-ui-blue-text" : "border-ui-strong text-ui-soft hover:text-ui-1"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {shown.map((l) => (
          <Card key={l.id} look={l} selected={!savedApplied && l.id === currentLookId} onPick={() => pick(l.preset, true)} />
        ))}
      </div>
      {looks && shown.length === 0 && <p className="text-caption text-ui-hint">No Look matches.</p>}
      {savedShown.length > 0 && (
        <>
          <h3 className={cn(HEADING, "pt-1")}>Saved looks · {savedShown.length}</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {savedShown.map((p) => (
              <Card key={p.id} look={{ id: p.id, name: p.name, tags: ["saved"], preset: p }} selected={p.id === currentPresetId} onPick={() => pick(p)} />
            ))}
          </div>
        </>
      )}
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-body text-ui-1">
        <input
          type="checkbox"
          checked={keep}
          onChange={(e) => {
            setKeepBackground(e.currentTarget.checked);
            setKeep(e.currentTarget.checked);
          }}
          className="h-4 w-4 accent-ui-blue"
        />
        Keep my background
      </label>
      <button
        type="button"
        onClick={onMore}
        data-nav-section="start"
        className={cn("flex min-h-11 w-full items-center gap-2 rounded-lg border border-ui-strong px-3 text-left text-body text-ui-1 hover:bg-ui-hover", FOCUS)}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">Saved and template looks</span>
          <span className="truncate text-micro text-ui-hint">{moreCount}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ui-hint" aria-hidden />
      </button>
    </section>
  );
}

export default LookGallery;
