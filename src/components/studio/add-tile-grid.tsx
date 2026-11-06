import type { DragEvent } from "react";
import { cn } from "@/lib/utils";
import { PALETTE_DRAG_MIME, tileStyles, type AddTile, type TileSection } from "./add-tiles";
import { DND_MIME, DND_MIME_PANEL, DND_MIME_SETTINGS } from "./studio-modules";

/**
 * The Add list (02b, Edit v3 SPEC §9.2, §9.4): section headers, category sub-headers, and a row per tile (icon, name,
 * one line of what it is, how many styles it holds, its export status). The panel owns the highlight, the keys and the
 * details card; this draws the rows and reports the pointer.
 */

/** The DOM id of a tile (the search box's active descendant). */
export const tileId = (tile: AddTile): string => `add-tile-${tile.key.replace(/[^A-Za-z0-9_-]/g, "_")}`;

/** What a tile's drag carries: a widget's id (and its view's settings), or an item's or element's palette id. */
export function startTileDrag(e: DragEvent, tile: AddTile) {
  const w = tile.widget;
  if (w) {
    e.dataTransfer.setData(w.drop.kind === "panel" ? DND_MIME_PANEL : DND_MIME, w.drop.id);
    if (w.drop.settings) e.dataTransfer.setData(DND_MIME_SETTINGS, JSON.stringify(w.drop.settings));
  } else if (tile.data) e.dataTransfer.setData(PALETTE_DRAG_MIME, tile.data);
  e.dataTransfer.effectAllowed = "copy";
}

interface AddTileGridProps {
  sections: readonly TileSection[];
  /** The highlighted tile (hover or keys). */
  highlighted?: string;
  /** The tile just added: highlighted for 1.5 s. */
  justAdded?: string;
  /** Tiles that can't fill the selected blank zone (dimmed). */
  dimmed?: (tile: AddTile) => boolean;
  onAdd: (tile: AddTile) => void;
  onHover: (tile: AddTile, el: HTMLElement) => void;
  onDragStart: () => void;
}

export function AddTileGrid({ sections, highlighted, justAdded, dimmed, onAdd, onHover, onDragStart }: AddTileGridProps) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} aria-label={s.title ?? "Matches"}>
          {s.title && (
            <div className="flex h-7 items-end px-1 pb-[5px] text-caption font-medium text-ui-3">
              {s.title}
            </div>
          )}
          {s.groups.map((g, gi) => (
            <div key={`${g.sub ?? ""}:${gi}`}>
              {g.sub && <div className="flex h-[22px] items-center px-1 text-micro text-ui-hint">{g.sub}</div>}
              <div data-add-grid="" className="grid gap-0.5 pb-1" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
                {g.tiles.map((tile) => (
                  <Tile
                    key={tile.key}
                    tile={tile}
                    highlighted={highlighted === tile.key}
                    added={justAdded === tile.key}
                    dim={dimmed?.(tile) ?? false}
                    onAdd={() => onAdd(tile)}
                    onHover={(el) => onHover(tile, el)}
                    onDragStart={(e) => {
                      startTileDrag(e, tile);
                      onDragStart();
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

interface TileProps {
  tile: AddTile;
  highlighted: boolean;
  added: boolean;
  dim: boolean;
  onAdd: () => void;
  onHover: (el: HTMLElement) => void;
  onDragStart: (e: DragEvent) => void;
}

function Tile({ tile, highlighted, added, dim, onAdd, onHover, onDragStart }: TileProps) {
  const Icon = tile.icon;
  const styles = tileStyles(tile);
  return (
    <div
      id={tileId(tile)}
      role="option"
      aria-selected={highlighted}
      aria-label={tile.name}
      data-testid="add-tile"
      data-kind={tile.kind}
      draggable
      onDragStart={onDragStart}
      onClick={onAdd}
      onMouseEnter={(e) => onHover(e.currentTarget)}
      className={cn(
        "flex h-12 cursor-pointer select-none items-center gap-2.5 rounded-ui-md border px-1.5",
        added ? "border-ui-accent/60 bg-ui-accent/14" : highlighted ? "border-ui-edge bg-s-nav-on" : "border-transparent hover:bg-ui-hover",
        dim && "opacity-40",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-sm bg-ui-tile">
        <Icon className={cn("h-4 w-4", tile.kind === "widget" ? "text-ui-accent" : "text-ui-3")} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-ui-1">{tile.name}</span>
        <span className="block truncate text-caption text-ui-3">{tile.widget?.blurb ?? tile.description}</span>
      </span>
      {styles && <span className="shrink-0 rounded-ui-sm border border-ui-strong px-1.5 py-px text-micro text-ui-3">{styles} styles</span>}
    </div>
  );
}
