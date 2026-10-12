"use client";

import { useSyncExternalStore } from "react";
import { useGeneral } from "./use-general";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {
      // Nothing to unsubscribe on the server.
    };
  }
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => {
    media.removeEventListener("change", onChange);
  };
};

const getSnapshot = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.(QUERY).matches);

const getServerSnapshot = () => false;

/**
 * True when motion should be reduced: the OS setting, unless General ›
 * Motion overrides it ("reduce" / "full" beat the OS).
 */
export const useReducedMotion = (): boolean => {
  const system = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { motion } = useGeneral();
  return motion === "system" ? system : motion === "reduce";
};
