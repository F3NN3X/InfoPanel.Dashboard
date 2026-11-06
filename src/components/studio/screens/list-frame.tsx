/** The frame of Screens' card lists: the card grid, a section heading and the empty state. */
import type { ReactNode } from "react";

/** The cards' grid. */
export const CARD_GRID = "grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3";

/** A section's heading over its own grid ("Saved in your Library"). */
export function ListSection({ title }: { title: string }) {
  return <h2 className="m-0 mt-1 text-body font-medium text-ui-1">{title}</h2>;
}

/** What the page shows when no card is left: nothing matches the search, or nothing exists yet. */
export function ListEmpty({ children }: { children: ReactNode }) {
  return <p className="rounded-ui-lg border border-dashed border-ui-default px-4 py-8 text-center text-body text-ui-4">{children}</p>;
}
