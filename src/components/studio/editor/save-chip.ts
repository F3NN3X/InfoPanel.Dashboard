import type { StatusTone } from "@/components/ui/status-chip";

export interface SaveFacts {
  /** Edits the server does not have yet. */
  pending: boolean;
  /** The last push could not reach the server; edits stay in this browser. */
  offline: boolean;
  /** A newer version saved the server copy: nothing is pushed until a reload. */
  refused: boolean;
  /** The server takes edits from its own computer only. */
  readOnly: boolean;
  /** Displays showing this screen now. */
  displays: number;
}

export interface SaveChip {
  tone: StatusTone;
  text: string;
  /** The reason, with the way out. */
  tip: string;
}

const NOW = "Ctrl+S saves now";

/**
 * The top bar's saved state (P-1): the autosave's answer, worst first, so a refusal is never hidden behind Saved.
 * Green only while something is live on a display (rules §1, the live LED).
 */
export function saveChip({ pending, offline, refused, readOnly, displays }: SaveFacts): SaveChip {
  if (refused) return { tone: "danger", text: "Not saved · newer config", tip: "A newer version of the app saved this dashboard, so edits here are not sent. Reload to keep editing." };
  if (readOnly) return { tone: "warn", text: "Read only · edits refused", tip: "This server takes edits from its own computer only. Change it in Settings › Server." };
  if (offline) return { tone: "warn", text: "Offline · edits kept locally", tip: `The server can't be reached. Edits stay here and go out when it is back. ${NOW}` };
  if (pending) return { tone: "warn", text: "Unsaved changes", tip: `Saving to the dashboard server. ${NOW}` };
  if (displays > 0) return { tone: "ok", text: `Saved · live on ${displays} ${displays === 1 ? "display" : "displays"}`, tip: `All changes saved. ${NOW}` };
  return { tone: "neutral", text: "Saved", tip: `All changes saved. ${NOW}` };
}
