/**
 * A CSS grid track list ("48px minmax(0, 1fr) auto") as separate tracks,
 * splitting on top-level whitespace only (functions keep their spaces).
 */
export function splitTracks(template: string | undefined): string[] {
  const tracks: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of template ?? "") {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (current) tracks.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) tracks.push(current);
  return tracks;
}

/** Tracks back to a template (`undefined` when there are none). */
export function joinTracks(tracks: string[]): string | undefined {
  const kept = tracks.map((t) => t.trim()).filter((t) => t !== "");
  return kept.length > 0 ? kept.join(" ") : undefined;
}
