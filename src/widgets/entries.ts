// Lookups for plugins whose containers are dynamic (a file, a device serial): the flat data has the keys only.
import { get, has, type Data } from "./kit";

/** The text of the first entry under `prefix` whose id (last key segment) is `id`; placeholders count as none. */
export function entryText(d: Data, prefix: string, id: string): string | undefined {
  const suffix = `.${id}`;
  for (const k in d) {
    if (!k.startsWith(prefix) || !k.endsWith(suffix)) continue;
    const v = get(d, k).trim();
    return has(v) ? v : undefined;
  }
  return undefined;
}

/** The entries under `prefix` grouped by container (the key segment right after the prefix). */
export function containers(d: Data, prefix: string): Map<string, { key: string; text: string }[]> {
  const groups = new Map<string, { key: string; text: string }[]>();
  for (const k in d) {
    if (!k.startsWith(prefix)) continue;
    const id = k.slice(prefix.length).split(".")[0];
    groups.set(id, [...(groups.get(id) ?? []), { key: k, text: get(d, k).trim() }]);
  }
  return groups;
}
