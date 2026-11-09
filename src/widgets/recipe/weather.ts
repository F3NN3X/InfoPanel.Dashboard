// Weather by place on the page (Phase 5c): a Repeat item's fields from the server's readings (`weather.place.<id>.*`, ips-server
// weather.rs) or from the recipe's sample items, in the units and hours the placement asks for. A place's id is its coordinates
// rounded to 0.01 degree, worked out exactly as the server does (`place_id`), so the page reads the keys the server writes.
import { get, num } from "../core/data";
import type { Data } from "../core/types";
import type { Place, WeatherUnits } from "./types";

/** The readings' prefix: `weather.place.<id>.`. */
export const WEATHER_PREFIX = "weather.place.";
/** The provider's credit (CC BY 4.0), drawn under the data by the renderer whenever weather by place is shown. */
export const ATTRIBUTION = "Weather data by Open-Meteo.com";
export const LICENCE = "CC BY 4.0";
/** Forecast hours an item carries by default, and at most (the server sends 24). */
export const HOURS_DEFAULT = 8;
export const HOURS_MAX = 24;

/** Hundredths of a degree, a half rounded away from zero (Rust's `f64::round`, which the server uses). */
const hundredths = (x: number): number => Math.sign(x) * Math.round(Math.abs(x * 100));

/** A place's id: `n`/`s` and its latitude in hundredths, `e`/`w` and its longitude (`n5991e1075`). */
export function placeId(lat: number, lon: number): string {
  const la = hundredths(lat);
  const lo = hundredths(lon);
  return `${la < 0 ? "s" : "n"}${Math.abs(la)}${lo < 0 ? "w" : "e"}${Math.abs(lo)}`;
}

/** The prefix of a place's readings. */
export const placePrefix = (p: Pick<Place, "lat" | "lon">): string => `${WEATHER_PREFIX}${placeId(p.lat, p.lon)}.`;

/** One field set of a Repeat's item. */
export type Item = Record<string, string | number | number[]>;

const toF = (c: number): number => Math.round((c * 9) / 5 + 32);
const toMph = (kmh: number): number => Math.round(kmh / 1.609344);
const TEMPS = ["temp", "high", "low"];

/** An item in the units asked for, its hourly list cut to `hours` (sample items hold metric, as the server does). */
export function inUnits(item: Item, hours: number, units: WeatherUnits): Item {
  const out: Item = { ...item };
  const hourly = Array.isArray(item.hourly) ? item.hourly.slice(0, hours) : undefined;
  if (hourly) out.hourly = units === "imperial" ? hourly.map(toF) : hourly;
  if (units === "imperial") {
    for (const k of TEMPS) if (typeof item[k] === "number") out[k] = toF(item[k] as number);
    if (typeof item.wind === "number") out.wind = toMph(item.wind);
  }
  return out;
}

/** What the server says of a place now: its status (`ok`, `stale`, `error`, `waiting`, or "" with no readings) and the data's age in minutes. */
export function placeState(data: Data | undefined, place: Place): { status: string; age: number } {
  const p = placePrefix(place);
  return { status: get(data, `${p}status`), age: num(get(data, `${p}age`)) };
}

/** A place's item from the server's readings: the fields it has (none but the name before the first answer). */
export function liveItem(data: Data | undefined, place: Place, hours: number, units: WeatherUnits): Item {
  const p = placePrefix(place);
  const item: Item = { name: place.name };
  for (const k of ["temp", "high", "low", "precip", "wind", "code"]) {
    const v = num(get(data, p + k));
    if (Number.isFinite(v)) item[k] = v;
  }
  const condition = get(data, `${p}condition`);
  if (condition) item.condition = condition;
  const hourly: number[] = [];
  for (let n = 0; n < Math.min(hours, HOURS_MAX); n++) {
    const v = num(get(data, `${p}hourly.${n}.temp`));
    if (!Number.isFinite(v)) break;
    hourly.push(v);
  }
  if (hourly.length) item.hourly = hourly;
  return inUnits(item, hours, units);
}
