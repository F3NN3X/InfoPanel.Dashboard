import { uid } from "../layout";
import type { IPGroupItem, IPItem, IPItemKind, IPProfile } from "./types";
import { createIPItem } from "./defaults";

/**
 * Pure item-tree operations for the free-canvas editor. All functions
 * return a new profile (immutable) so undo/redo is a snapshot stack.
 * Z-order = list order (index 0 = bottom).
 */

/** Find an item anywhere in the tree. */
export function findItem(items: IPItem[], id: string): IPItem | null {
  for (const it of items) {
    if (it.id === id) return it;
    if (it.kind === "group") {
      const f = findItem(it.children, id);
      if (f) return f;
    }
  }
  return null;
}

/**
 * Apply `fn` to the list that directly contains `id` (top-level or a
 * group's children; nested groups are searched recursively).
 */
export function mapInList(
  items: IPItem[],
  id: string,
  fn: (list: IPItem[]) => IPItem[]
): IPItem[] {
  const contains = (l: IPItem[]): boolean =>
    l.some(
      (c) =>
        c.id === id ||
        (c.kind === "group" && contains((c as IPGroupItem).children))
    );
  let changed = false;
  const visit = (list: IPItem[]): IPItem[] => {
    if (contains(list)) {
      changed = true;
      return fn(list);
    }
    return list.map((it) =>
      it.kind === "group"
        ? ({ ...it, children: visit((it as IPGroupItem).children) } as IPGroupItem)
        : it
    );
  };
  const out = visit(items);
  return changed ? out : items;
}

/** Patch an item's fields anywhere in the tree. */
export function updateItem(
  p: IPProfile,
  id: string,
  patch: Partial<Record<string, unknown>>
): IPProfile {
  return {
    ...p,
    items: mapInList(p.items, id, (list) =>
      list.map((it) => (it.id === id ? ({ ...it, ...patch } as IPItem) : it))
    ),
  };
}

/** Remove an item (or a whole group) from its containing list. */
export function removeItem(p: IPProfile, id: string): IPProfile {
  return {
    ...p,
    items: mapInList(p.items, id, (list) => list.filter((it) => it.id !== id)),
  };
}

/** New item ids (InfoPanel regenerates the [XmlIgnore] Guid on save). */
export function newIPId(): string {
  return uid("ip");
}

/** Clone `it` with a fresh id (and recursive group ids), offset. */
function cloneItem(it: IPItem, dx: number, dy: number): IPItem {
  const c: IPItem = JSON.parse(JSON.stringify(it));
  const walk = (x: IPItem) => {
      x.id = newIPId();
      x.x = x.x + dx;
      x.y = x.y + dy;
      if (x.kind === "group") x.children.forEach(walk);
    };
  walk(c);
  return c;
}

/** Duplicate an item (offset +20/+20, inserted directly above it in Z). */
export function duplicateItem(p: IPProfile, id: string): IPProfile {
  const src = findItem(p.items, id);
  if (!src) return p;
  const copy = cloneItem(src, 20, 20);
  return {
    ...p,
    items: mapInList(p.items, id, (list) => {
      const l = [...list];
      const i = l.findIndex((x) => x.id === id);
      l.splice(i + 1, 0, copy);
      return l;
    }),
  };
}

/** Z-order: front/back = list ends; forward/backward = one step. */
export function zOrderItem(
  p: IPProfile,
  id: string,
  op: "front" | "back" | "forward" | "backward"
): IPProfile {
  return {
    ...p,
    items: mapInList(p.items, id, (list) => {
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return list;
      const l = [...list];
      const [it] = l.splice(i, 1);
      switch (op) {
        case "front":
          l.push(it);
          break;
        case "back":
          l.unshift(it);
          break;
        case "forward":
          l.splice(Math.min(i + 1, l.length), 0, it);
          break;
        case "backward":
          l.splice(Math.max(0, i - 1), 0, it);
          break;
      }
      return l;
    }),
  };
}

/**
 * Group the selected items into a new GroupDisplayItem: children keep
 * their absolute coordinates (the group draws nothing) and the group
 * enters at the top of the Z-order.
 */
export function groupItems(p: IPProfile, ids: string[]): IPProfile {
  const picked: IPItem[] = [];
  for (const id of ids) {
    const f = findItem(p.items, id);
    if (f && f.kind !== "group") picked.push(f);
  }
  if (picked.length < 2) return p;
  let next = p;
  for (const id of picked.map((x) => x.id)) {
    next = removeItem(next, id);
  }
  const group: IPGroupItem = {
    id: newIPId(),
    kind: "group",
    name: "Group",
    x: 0,
    y: 0,
    rotation: 0,
    hidden: false,
    locked: false,
    children: picked,
  };
  return { ...next, items: [...next.items, group] };
}

/** Splice a group's children back into its parent at the group's Z slot. */
export function ungroupItem(p: IPProfile, id: string): IPProfile {
  const group = findItem(p.items, id);
  if (!group || group.kind !== "group") return p;
  return {
    ...p,
    items: mapInList(p.items, id, (list) => {
      const l = [...list];
      const i = l.findIndex((x) => x.id === id);
      l.splice(i, 1, ...group.children);
      return l;
    }),
  };
}

/** Create + append a new item (top of Z-order) with the profile defaults. */
export function addItem(p: IPProfile, kind: IPItemKind, x?: number, y?: number): IPProfile {
  const item = createIPItem(kind);
  if (x !== undefined) item.x = x;
  if (y !== undefined) item.y = y;
  return { ...p, items: [...p.items, item] };
}

/** A blank free-canvas profile (InfoPanel defaults: transparent, Barlow). */
export function newIPProfile(name: string): IPProfile {
  return {
    id: newIPId().replace("ip-", "ip-"),
    name,
    width: 1920,
    height: 550,
    backgroundColor: "#00FFFFFF",
    font: "Barlow",
    fontSize: 26,
    fontScale: 1,
    color: "#FFFFFFFF",
    showFps: false,
    drag: true,
    resize: false,
    active: true,
    topmost: true,
    windowX: 0,
    windowY: 0,
    strictWindowMatching: false,
    items: [],
  };
}

/** Move an item (free placement, no snap — the canvas snaps). */
export function moveItem(p: IPProfile, id: string, x: number, y: number): IPProfile {
  return updateItem(p, id, { x, y });
}
