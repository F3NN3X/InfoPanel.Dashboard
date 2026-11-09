// A place list's editor (Phase 5c): the builder's Options tab (a recipe's default places) and a recipe placement's Content tab (its
// own). Places are found by name through the dashboard server's place search, which asks the weather provider and nothing else; the
// line under the search says so. A place can move up or down or go; "Use this PC's location first" puts the place this PC is at
// first, picked once by name (never looked up by IP).
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, MapPin, Search, X } from "lucide-react";
import { FOCUS_RING } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type { Place } from "@/widgets/recipe/types";
import { ITEMS_MAX } from "@/widgets/recipe/validate";
import { addPlace, type FoundPlace, herePlace, movePlace, placeOf, rememberHere, searchPlaces, usesHere, withHere } from "./place-search";

export interface PlaceListEditorProps {
  places: readonly Place[];
  onChange: (places: Place[]) => void;
  /** The list's heading ("Default places", "Locations"). */
  label: string;
}

const INPUT = cn("h-8 w-full min-w-0 rounded-ui-md border border-ui-strong bg-ui-app pl-7 pr-2.5 text-body text-ui-1 outline-none hover:border-ui-hover-edge focus:border-ui-accent", FOCUS_RING);
const ICON_BUTTON = "rounded-ui-sm p-0.5 text-ui-3 hover:text-ui-1 disabled:opacity-30";

/** Where a hit is, to tell two places of one name apart. */
const whereOf = (f: FoundPlace): string => [f.admin1, f.country].filter(Boolean).join(", ");

/** The search box and its hits; `onPick` takes the one clicked. */
function PlaceSearch({ label, onPick, disabled }: { label: string; onPick: (f: FoundPlace) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ found: FoundPlace[]; error?: string; busy?: boolean }>({ found: [] });
  const asked = useRef(0);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setState({ found: [] });
    const n = ++asked.current;
    setState((s) => ({ ...s, busy: true }));
    // one search a pause in the typing, not one a key: the server caps them
    const timer = setTimeout(() => void searchPlaces(q).then((r) => n === asked.current && setState(r)), 350);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <div className="flex flex-col gap-1">
      <span className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-ui-3" aria-hidden />
        <input aria-label={label} placeholder={label} value={query} disabled={disabled} onChange={(e) => setQuery(e.target.value.slice(0, 60))} className={INPUT} />
      </span>
      {state.error && <span className="text-micro text-ui-danger">{state.error}</span>}
      {query.trim().length >= 2 && !state.busy && !state.error && state.found.length === 0 && <span className="text-micro text-ui-3">No place of that name</span>}
      {state.found.map((f) => (
        <button
          key={`${f.lat},${f.lon}`}
          type="button"
          onClick={() => {
            onPick(f);
            setQuery("");
          }}
          className="flex items-baseline gap-2 rounded-ui-md px-2 py-1 text-left hover:bg-ui-hover"
        >
          <span className="text-body text-ui-1">{f.name}</span>
          <span className="min-w-0 truncate text-micro text-ui-3">{whereOf(f)}</span>
        </button>
      ))}
    </div>
  );
}

export function PlaceListEditor({ places, onChange, label }: PlaceListEditorProps) {
  const [pickingHere, setPickingHere] = useState(false);
  const here = usesHere(places);
  const full = places.length >= ITEMS_MAX;
  const turnHere = (on: boolean) => {
    if (!on) return onChange(withHere(places, undefined));
    const known = herePlace();
    if (known) onChange(withHere(places, known));
    else setPickingHere(true);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption text-ui-3">{label}</span>
      {places.map((p, k) => (
        <div key={`${p.lat},${p.lon},${k}`} className="flex h-9 items-center gap-2 rounded-ui-md border border-ui-subtle bg-ui-app px-2.5">
          <MapPin className={cn("h-3.5 w-3.5", p.here ? "text-ui-accent" : "text-ui-hint")} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-body text-ui-1">
            {p.name}
            {p.here && <span className="ml-1.5 text-micro text-ui-3">this PC</span>}
          </span>
          <span className="font-ui-mono text-micro text-ui-3">
            {p.lat.toFixed(2)}, {p.lon.toFixed(2)}
          </span>
          <button type="button" aria-label={`Move ${p.name} up`} disabled={k === 0 || (here && k === 1) || p.here} onClick={() => onChange(movePlace(places, k, k - 1))} className={ICON_BUTTON}>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={`Move ${p.name} down`} disabled={k === places.length - 1 || p.here} onClick={() => onChange(movePlace(places, k, k + 1))} className={ICON_BUTTON}>
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(places.filter((_, i) => i !== k))} className={ICON_BUTTON}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {places.length === 0 && <span className="text-caption text-ui-3">No places yet: search for one below</span>}
      <PlaceSearch label={full ? `At most ${ITEMS_MAX} places` : "Add a place: search by name"} disabled={full} onPick={(f) => onChange(addPlace(places, placeOf(f)))} />
      <div className="flex min-h-9 items-center justify-between gap-3">
        <span className="text-body text-ui-2" title="You pick the place once; it is never looked up from your connection">
          Use this PC's location first
        </span>
        <Toggle label="Use this PC's location first" checked={here || pickingHere} onChange={(on) => (pickingHere && !on ? setPickingHere(false) : turnHere(on))} />
      </div>
      {pickingHere && (
        <PlaceSearch
          label="Where is this PC? Search by name"
          onPick={(f) => {
            rememberHere(placeOf(f));
            setPickingHere(false);
            onChange(withHere(places, placeOf(f)));
          }}
        />
      )}
      <span className="text-micro text-ui-hint">Place names and coordinates go only to Open-Meteo, the weather provider, through this dashboard's server.</span>
    </div>
  );
}
