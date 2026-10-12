import { createContext, useContext, type ReactNode } from "react";
import { GENERAL_DEFAULTS, type ResolvedGeneral } from "@/lib/general";

const GeneralContext = createContext<ResolvedGeneral>(GENERAL_DEFAULTS);

/**
 * The dashboard's general settings (font, clock, locale, motion, cursor)
 * for everything below — the kiosk page and the studio. Outside a
 * provider the defaults apply.
 */
export function GeneralProvider({ value, children }: { value: ResolvedGeneral; children: ReactNode }) {
  return <GeneralContext.Provider value={value}>{children}</GeneralContext.Provider>;
}

/** The resolved general settings (see `resolveGeneral`). */
export const useGeneral = (): ResolvedGeneral => useContext(GeneralContext);
