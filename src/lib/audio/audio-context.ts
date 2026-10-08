/**
 * One shared `AudioContext` for the dashboard's live capture. The browser caps
 * the number of concurrent `AudioContext`s, and several widgets can each want
 * to capture a device, so they all feed off a single context. Created lazily
 * on first use (so a page with no live capture never spins one up).
 */
let shared: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export const getSharedAudioContext = (): AudioContext | null => {
  if (shared) return shared;
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  shared = new Ctor();
  return shared;
};
