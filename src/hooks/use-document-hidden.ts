import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

const getSnapshot = () => document.visibilityState === "hidden";

const getServerSnapshot = () => false;

/** True while the page is hidden (minimized, another tab, screen off). */
export const useDocumentHidden = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
