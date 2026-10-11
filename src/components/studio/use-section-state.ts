import { useSyncExternalStore } from "react";

/** localStorage key holding which inspector sections are open. */
const STORAGE_KEY = "studio.sections";

type SectionMap = Record<string, boolean>;

/** The stored section map; anything malformed reads as empty. */
export function parseSections(raw: string | null): SectionMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
    );
  } catch {
    return {};
  }
}

// One shared store so every inspector section sees the same state.
let cache: SectionMap | null = null;
const listeners = new Set<() => void>();

function read(): SectionMap {
  if (cache === null) {
    try {
      cache = parseSections(localStorage.getItem(STORAGE_KEY));
    } catch {
      cache = {};
    }
  }
  return cache;
}

function write(next: SectionMap) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): keep the session state.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Open / closed state of the inspector's collapsible sections, remembered
 * across reloads (localStorage `studio.sections`). Sections are closed
 * until opened unless a `fallback` says otherwise.
 */
export function useSectionState() {
  const sections = useSyncExternalStore(subscribe, read);
  return {
    isOpen: (id: string, fallback = false): boolean => sections[id] ?? fallback,
    setOpen: (id: string, open: boolean) => write({ ...read(), [id]: open }),
  };
}
