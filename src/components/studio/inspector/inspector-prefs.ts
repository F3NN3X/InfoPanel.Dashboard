import { useSyncExternalStore } from "react";

/**
 * The inspector's remembered preferences (README §5.9): the Advanced
 * toggle and the open tab of each context ("widget", "panel",
 * "dashboard"). localStorage, read and written defensively: private mode or
 * a full quota keeps the session state.
 */

const ADVANCED_KEY = "studio.inspectorAdvanced";
const TABS_KEY = "studio.inspectorTabs";

/** The stored Advanced toggle: off unless it was turned on. */
export const parseAdvanced = (raw: string | null): boolean => raw === "true";

/** The stored tab per context; anything malformed reads as empty. */
export function parseTabs(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  } catch {
    return {};
  }
}

/** The tab to show: the remembered one while the context still has it, else the first. */
export function pickTab<T extends string>(stored: string | undefined, tabs: readonly T[]): T | undefined {
  return tabs.find((t) => t === stored) ?? tabs[0];
}

/** One localStorage value shared by every subscriber. */
function storedValue<T>(key: string, parse: (raw: string | null) => T, serialize: (value: T) => string) {
  let cache: { value: T } | null = null;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (cache === null) {
      try {
        cache = { value: parse(localStorage.getItem(key)) };
      } catch {
        cache = { value: parse(null) };
      }
    }
    return cache.value;
  };
  const write = (value: T) => {
    cache = { value };
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // Storage unavailable: keep the session state.
    }
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return { read, write, subscribe };
}

const advancedStore = storedValue(ADVANCED_KEY, parseAdvanced, String);
const tabsStore = storedValue(TABS_KEY, parseTabs, JSON.stringify);

/** "Advanced settings" (off by default, remembered). */
export function useInspectorAdvanced(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(advancedStore.subscribe, advancedStore.read), advancedStore.write];
}

/** Remember a context's tab (also from outside it: "Edit global theme" opens the dashboard's Appearance). */
export function setInspectorTab(contextKey: string, tab: string) {
  tabsStore.write({ ...tabsStore.read(), [contextKey]: tab });
}

/** A context's remembered tab (undefined until one was picked). */
export function useInspectorTab(contextKey: string): [string | undefined, (tab: string) => void] {
  const tabs = useSyncExternalStore(tabsStore.subscribe, tabsStore.read);
  return [tabs[contextKey], (tab) => setInspectorTab(contextKey, tab)];
}
