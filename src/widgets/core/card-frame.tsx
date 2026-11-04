// What the shell draws over a card only when a skin or Look asks: a frame, an ornament, a tab band. Each is an absolute,
// click-through child, so none of them changes the card's padding or the rows a widget fits.
import type { ComponentType } from "react";
import { mix } from "./tokens";
import type { SkinTokens } from "./types";

const HUD_CORNERS = ["left-1.5 top-1.5 border-l border-t", "right-1.5 top-1.5 border-r border-t", "left-1.5 bottom-1.5 border-l border-b", "right-1.5 bottom-1.5 border-r border-b"];

/** `inset`: a thin border set in from the edge (tui). `corners`: four brackets (hud). */
export function CardFrame({ kind }: { kind: NonNullable<SkinTokens["frame"]> }) {
  if (kind === "inset") return <div className="pointer-events-none absolute inset-[5px] rounded-[4px] border" style={{ borderColor: mix(45, "#3f3f46") }} />;
  return HUD_CORNERS.map((c) => <span key={c} className={`pointer-events-none absolute h-2.5 w-2.5 ${c}`} style={{ borderColor: "var(--w-accent)" }} />);
}

/** A Look's ornament or tab band: `Slot` in a click-through layer over the card, hidden from assistive tech. */
export function CardLayer({ part, Slot }: { part: "ornament" | "tab-band"; Slot: ComponentType }) {
  return (
    <div aria-hidden data-wp-layer={part} className="pointer-events-none absolute inset-0">
      <Slot />
    </div>
  );
}
