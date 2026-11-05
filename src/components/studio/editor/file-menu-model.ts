import type { MadeFor } from "@/lib/layout";

/** The two answers (one-editor SPEC §5.1), with what each one does. "InfoPanel too" turns on the Export check, its badges and the On InfoPanel lines. */
export const MADE_FOR: readonly { value: MadeFor; label: string; note: string }[] = [
  { value: "studio", label: "Studio panels", note: "Shows on panels running Studio." },
  { value: "infopanel", label: "InfoPanel too", note: "Also checks what exports to the InfoPanel app." },
];

/** A row of the Export check, as far as the File menu reads it. */
export interface CheckLine {
  path: string;
  name: string;
  status: "ok" | "approx" | "pic" | "out";
}

/** What the page offers for Export .infopanel. */
export interface ExportFacts {
  /** The page holds an InfoPanel profile: it exports as it is. */
  canvas: boolean;
  madeFor: MadeFor | undefined;
  /** The Export check's rows; null while it loads. */
  rows: readonly CheckLine[] | null;
}

export interface ExportState {
  /** Why it can't run now; unset: it can. */
  blocked?: string;
  /** Fix `blocked`: make the screen InfoPanel too. */
  fixMadeFor?: boolean;
  /** It runs, with this part left out, or the part to show when it can't. */
  problem?: CheckLine;
}

/**
 * The File menu's Export .infopanel (rules §6, say why when something can't run). It only stops where there is nothing
 * to export: a screen for Studio panels, or a page with no parts. A part left out does not stop it, as it never has;
 * the line names the part and Show the problem goes to it.
 */
export function exportState({ canvas, madeFor, rows }: ExportFacts): ExportState {
  const problem = rows?.find((r) => r.status === "out");
  if (canvas) return { problem };
  if (madeFor !== "infopanel") return { blocked: "This screen is made for Studio panels", fixMadeFor: true };
  if (rows?.length === 0) return { blocked: "There is nothing on this page to export" };
  return { problem };
}
