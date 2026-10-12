import type { ReactNode } from "react";

/**
 * A custom card of the inspector (a panel's layout, its widgets, a panel
 * widget's editor, a General card): the inspector renders it inside the
 * section the registry places it in (`inspector-model`'s `special`).
 */
export interface SheetCard {
  id: string;
  title: string;
  hint?: string;
  /** Controls in the section header. */
  actions?: ReactNode;
  /** Span every column of the dock. */
  wide?: boolean;
  /** The card `revealWidgetEditor` scrolls to. */
  editor?: boolean;
  /** Small text after the title (the scope the card edits). */
  badge?: string;
  /** Settings set in this card (the count and Reset). */
  changed?: number;
  onReset?: () => void;
  /** What a search matches this card by (title, labels). */
  terms: string[];
  node: ReactNode;
}

/** Cards under one heading ("Panel", "Selected widget"). */
export interface SheetGroup {
  heading: string;
  cards: SheetCard[];
}
