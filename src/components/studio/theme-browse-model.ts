import type { AppearancePreset } from "@/lib/appearance-presets";
import { PACK_IDS } from "@/looks/pack";
import { GALLERY_FILTERS, type GalleryLook } from "./look-gallery-model";

/**
 * Browse themes as data: the gallery's themes, the saved ones and the imported packs as one list of cards in three groups
 * (Yours, Theme packs, Plain themes), and what the filters (kind, tag, search) leave. A pack is a theme whose id is a pack
 * id (it ships scenery, effects or parts; no flag is stored). Pure.
 */

export type BrowseKind = "pack" | "plain" | "saved" | "yours";

export interface BrowseItem {
  /** The card's id: a Look id, or a saved theme's preset id. */
  id: string;
  name: string;
  description: string;
  tags: readonly string[];
  /** What Apply writes (`builtin:look-<id>`, a saved theme's own preset, an imported pack's Look). */
  preset: AppearancePreset;
  kind: BrowseKind;
  /** The Look it draws (a saved theme: the one in its style). */
  lookId?: string;
}

export type BrowseFilter = "all" | "packs" | "plain" | "yours";

export const BROWSE_FILTERS: readonly { id: BrowseFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "packs", label: "Packs" },
  { id: "plain", label: "Plain" },
  { id: "yours", label: "Yours" },
];

/** The tag chips: the gallery's, without All. */
export const TAG_FILTERS = GALLERY_FILTERS.filter((f) => f.id !== "all");

/** Every card: the gallery's themes, the saved themes, the imported packs (`pack` makes the card of a pack that is not built in). */
export function browseItems(
  looks: readonly GalleryLook[],
  saved: readonly AppearancePreset[],
  imported: readonly { id: string; name: string }[],
  pack: (p: { id: string; name: string }) => AppearancePreset,
): BrowseItem[] {
  return [
    ...saved.map((p): BrowseItem => ({ id: p.id, name: p.name, description: p.description, tags: [], preset: p, kind: "saved", lookId: typeof p.style.lookId === "string" ? p.style.lookId : undefined })),
    ...imported.map((p): BrowseItem => ({ id: p.id, name: p.name, description: "Imported pack", tags: ["your pack"], preset: pack(p), kind: "yours", lookId: p.id })),
    ...looks.map((l): BrowseItem => ({ id: l.id, name: l.name, description: l.description, tags: l.tags, preset: l.preset, kind: PACK_IDS.has(l.id) ? "pack" : "plain", lookId: l.id })),
  ];
}

export interface BrowseGroups {
  yours: BrowseItem[];
  packs: BrowseItem[];
  plain: BrowseItem[];
}

/** The groups a kind filter, a tag chip and the search leave (the search matches the name, description and tags). */
export function browseGroups(items: readonly BrowseItem[], filter: BrowseFilter, tag: string | undefined, query: string): BrowseGroups {
  const q = query.trim().toLowerCase();
  const keep = (i: BrowseItem) =>
    (tag === undefined || i.tags.includes(tag)) && (q === "" || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.tags.some((t) => t.includes(q)));
  const group = (kinds: readonly BrowseKind[], on: boolean) => (on ? items.filter((i) => kinds.includes(i.kind) && keep(i)) : []);
  return {
    yours: group(["saved", "yours"], filter === "all" || filter === "yours"),
    packs: group(["pack"], filter === "all" || filter === "packs"),
    plain: group(["plain"], filter === "all" || filter === "plain"),
  };
}

/** The counts the filters and the tab show. */
export function browseCounts(items: readonly BrowseItem[]): Record<BrowseFilter, number> {
  const n = (kinds: readonly BrowseKind[]) => items.filter((i) => kinds.includes(i.kind)).length;
  return { all: items.length, packs: n(["pack"]), plain: n(["plain"]), yours: n(["saved", "yours"]) };
}
