// The studio's half of a user pack's render check (L94), in a lazy chunk of its own: the candidate worn offscreen in a hidden frame
// of this origin, on the Widget QA page (`?widget-qa&pack-check`, which the server opens for such a frame alone). The pack is not
// stored yet: its files reach the frame by message, through the loader's candidate path (`wearCandidate`). The frame answers with
// what the measures refuse (`pack-render-measures`). Anything else, no answer in time included, refuses the pack: this check
// fails closed. It runs here, in the client, so all a passed check can give the server is a claim (decision log, L94).
import type { PackSource } from "./pack-validate";

export const CHECK_URL = "/?widget-qa&pack-check=1";
const LIMIT_MS = 90_000;
const STUCK = "the render check could not finish, so the pack was not stored";

/** Runs the check. The refusals in words, empty only when the frame answered that it measured the pack and found nothing. */
export function runRenderCheck(src: PackSource, limitMs = LIMIT_MS): Promise<string[]> {
  return new Promise((done) => {
    const frame = document.createElement("iframe");
    frame.title = "Pack render check";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    // on the page's layout, off its screen: `display: none` would leave the widgets nothing to measure
    frame.style.cssText = "position:fixed;left:-20000px;top:0;width:1600px;height:1000px;border:0;pointer-events:none";
    const finish = (refusals: string[]) => {
      clearTimeout(timer);
      window.removeEventListener("message", heard);
      frame.remove();
      done(refusals);
    };
    const timer = setTimeout(() => finish([STUCK]), limitMs);
    const heard = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow || e.origin !== window.location.origin) return;
      if (e.data?.kind === "pack-check-ready") frame.contentWindow?.postMessage({ kind: "pack-check-run", src }, window.location.origin);
      else if (e.data?.kind === "pack-check-done") {
        const list: unknown = e.data.refusals;
        finish(Array.isArray(list) && list.every((r) => typeof r === "string") ? (list as string[]) : [STUCK]);
      }
    };
    window.addEventListener("message", heard);
    frame.src = CHECK_URL;
    document.body.append(frame);
  });
}
