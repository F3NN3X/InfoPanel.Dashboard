import { createContext, useContext } from "react";
import type { InspectorMode, SheetSnap } from "./studio-layout";

/** The bottom sheet's state, for the inspector inside it. */
export interface SheetChrome {
  snap: SheetSnap;
  setSnap: (snap: SheetSnap) => void;
  /** The strip's tool: "quick" or a section id. */
  tool: string;
  setTool: (tool: string) => void;
}

/**
 * Where the inspector is shown and how it is dismissed: docked beside the
 * canvas (no close), floating over it (closes), or the phone's bottom sheet
 * (collapses to its half height, with taller rows for touch). The inspector
 * parts read it for the header's close button and the row heights.
 */
export interface InspectorChrome {
  mode: InspectorMode;
  /** The header's close (floating) or collapse (sheet) button; none when docked. */
  onClose?: () => void;
  /** Sheet mode: below full height the inspector shows the tool strip instead. */
  sheet?: SheetChrome;
}

const InspectorChromeContext = createContext<InspectorChrome | null>(null);

export const InspectorChromeProvider = InspectorChromeContext.Provider;

/** The inspector's chrome; docked outside it (the left panels, the dialogs). */
export function useInspectorChrome(): InspectorChrome {
  return useContext(InspectorChromeContext) ?? { mode: "docked" };
}

/** Whether a row is inside the inspector (not a left panel): its compact one-line forms apply. */
export function useInInspector(): boolean {
  return useContext(InspectorChromeContext) !== null;
}

/** The scrolling element of the inspector (its sections, under the header). */
export const INSPECTOR_SCROLL = "data-inspector-scroll";
