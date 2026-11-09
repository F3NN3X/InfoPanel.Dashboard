// Place search and place lists for Weather by place (Phase 5c): the studio asks the dashboard server (`GET /api/weather/places`,
// ips-server weather.rs), which asks Open-Meteo's geocoding; the studio never calls the provider itself, and a place goes nowhere
// else. "Use this PC's location first" puts a place the person picked once at the top of a list (marked `here`), never one found by
// IP; the pick is kept in this browser so the next list that turns it on does not ask again.
import type { Place } from "@/widgets/recipe/types";
import { ITEMS_MAX, placesOf } from "@/widgets/recipe/validate";

const ROUTE = "/api/weather/places";
/** Where this PC's place is kept once picked. */
export const HERE_KEY = "studio.weather.here";

/** A place search's hit: the place and where it is, to tell two of one name apart. */
export interface FoundPlace {
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
}

/** The places for `query`, or why there are none (the server's words: off, too many searches, the provider failed). */
export async function searchPlaces(query: string, lang = "en"): Promise<{ found: FoundPlace[]; error?: string }> {
  const q = query.trim();
  if (q.length < 2) return { found: [] };
  try {
    const res = await fetch(`${ROUTE}?q=${encodeURIComponent(q.slice(0, 60))}&lang=${encodeURIComponent(lang)}`, { cache: "no-store" });
    if (!res.ok) return { found: [], error: res.headers.get("X-Weather") === "off" ? "Weather by place is off on this server" : (await res.text()) || `the server said ${res.status}` };
    const raw: unknown = await res.json();
    const found = (Array.isArray(raw) ? raw : []).flatMap((r): FoundPlace[] =>
      r && typeof r.name === "string" && typeof r.lat === "number" && typeof r.lon === "number" ? [{ name: r.name.slice(0, 60), admin1: String(r.admin1 ?? ""), country: String(r.country ?? ""), lat: r.lat, lon: r.lon }] : [],
    );
    return { found };
  } catch {
    return { found: [], error: "the dashboard server did not answer" };
  }
}

/** What a hit is stored as in a list: its name and its coordinates to 0.01 degree (the server's cache key, about 1 km). */
export const placeOf = (f: Pick<FoundPlace, "name" | "lat" | "lon">): Place => ({ name: f.name.slice(0, 60), lat: Math.round(f.lat * 100) / 100, lon: Math.round(f.lon * 100) / 100 });

/** A stored place list (JSON text or a list) as places; anything else is none. */
export function placeList(value: unknown): Place[] {
  const v = placesOf(value);
  return Array.isArray(v) ? v.filter((p): p is Place => !!p && typeof p.name === "string" && typeof p.lat === "number" && typeof p.lon === "number") : [];
}

/** `list` with `place` added at the end, unless it is full or already holds that spot. */
export function addPlace(list: readonly Place[], place: Place): Place[] {
  if (list.length >= ITEMS_MAX || list.some((p) => p.lat === place.lat && p.lon === place.lon)) return [...list];
  return [...list, place];
}

/** `list` with the entry at `from` moved to `to`. */
export function movePlace(list: readonly Place[], from: number, to: number): Place[] {
  if (to < 0 || to >= list.length || from === to) return [...list];
  const next = [...list];
  const [p] = next.splice(from, 1);
  next.splice(to, 0, p);
  return next;
}

/** Whether the list starts with this PC's place. */
export const usesHere = (list: readonly Place[]): boolean => list[0]?.here === true;

/** "Use this PC's location first" turned on (`here` the picked place) or off (`undefined`): the marked place first, or none. */
export function withHere(list: readonly Place[], here: Place | undefined): Place[] {
  const rest = list.filter((p) => p.here !== true);
  return here ? [{ ...placeOf(here), here: true as const }, ...rest].slice(0, ITEMS_MAX) : rest;
}

/** This PC's place as picked before, if it was. */
export function herePlace(): Place | undefined {
  try {
    const p = placeList(`[${localStorage.getItem(HERE_KEY) ?? ""}]`)[0];
    return p && placeOf(p);
  } catch {
    return undefined;
  }
}

/** Keeps this PC's place for the next list that asks for it. */
export function rememberHere(place: Place): void {
  try {
    localStorage.setItem(HERE_KEY, JSON.stringify(placeOf(place)));
  } catch {
    // private mode: the next list asks again
  }
}
