// A block setting that follows an option (Phase 5c): a Repeat's direction, most shown, forecast hours and units, a sparkline's
// history window. The value is the option's own, or a select's choice mapped to it; one the option does not give keeps the default.
import type { FollowOption, Follows } from "./types";

/** Whether a block setting follows an option rather than holding a value. */
export const isFollow = (v: unknown): v is FollowOption<string | number> => !!v && typeof v === "object" && typeof (v as { option?: unknown }).option === "string";

/** A block setting's value for a placement's option values: the fixed value, or the followed option's (through its map), else `fallback`. */
export function followed<T extends string | number>(v: Follows<T> | undefined, values: Record<string, unknown>, ok: (x: unknown) => x is T, fallback: T): T {
  if (v === undefined) return fallback;
  if (!isFollow(v)) return ok(v) ? v : fallback;
  const raw = values[v.option];
  const out = v.map ? v.map[String(raw)] : raw;
  return ok(out) ? out : fallback;
}

/** A whole number from `lo` to `hi`. */
export const wholeIn =
  (lo: number, hi: number) =>
  (x: unknown): x is number =>
    typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi;

/** One of `list`. */
export const oneOf =
  <T extends string>(list: readonly T[]) =>
  (x: unknown): x is T =>
    typeof x === "string" && (list as readonly string[]).includes(x);
