/** A list of names stored in one value: a JSON array of strings, or a comma list ("Discord, Steam"). */
export function parseNameList(raw: string): string[] {
  try {
    const list: unknown = JSON.parse(raw);
    if (Array.isArray(list)) return list.filter((s): s is string => typeof s === "string");
  } catch {
    // Not JSON: a plain list.
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
