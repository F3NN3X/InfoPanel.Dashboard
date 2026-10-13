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
  resumeOnGesture(shared);
  return shared;
};

/** What the page shows while the browser holds the context suspended (autoplay policy). */
export const GESTURE_HINT = "Click or tap the dashboard once to start capture";

/**
 * Browsers start an AudioContext suspended until the page gets a user gesture (autoplay policy), and
 * `resume()` stays pending until then. The first click, tap or key press anywhere on the page resumes
 * it, so a kiosk needs one tap after granting the microphone.
 */
function resumeOnGesture(ctx: AudioContext): void {
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const resume = () => {
    void ctx.resume().catch(() => undefined);
    if (ctx.state === "running") stop();
  };
  const stop = () => events.forEach((e) => window.removeEventListener(e, resume, true));
  events.forEach((e) => window.addEventListener(e, resume, true));
  ctx.addEventListener("statechange", () => {
    if (ctx.state === "running") stop();
  });
}
