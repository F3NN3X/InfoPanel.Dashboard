import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSensorCatalog } from "@/lib/catalog";
import type { StyleSource } from "@/lib/style-resolve";
import { cn } from "@/lib/utils";
import type { ModuleSetting, ModuleSettingValue, ModuleSettings } from "@/modules/types";
import { type InspectorCategory } from "./inspector-categories";
import { INSPECTOR_SCROLL, useInspectorLayout } from "./inspector-layout";
import { SETTING_CARD, SettingCard } from "./setting-card";
import { changedDefs, navSections, pairRows, resetKeysOf } from "./setting-card-model";
import { SettingField } from "./settings-panel";
import { useSectionState } from "./use-section-state";

/** What the zone adds to a general card around the schema's rows. */
export interface CardExtra {
  /** Above the rows. */
  top?: ReactNode;
  /** Below the rows. */
  bottom?: ReactNode;
  /** Header controls before Reset. */
  actions?: ReactNode;
  /** Extra changed settings (counted with the rows'). */
  changed?: number;
  /** Reset those extras (the card's Reset calls it with the rows' clear). */
  onReset?: () => void;
}

/** A card the zone adds after the schema's (a panel's layout, its widgets). */
export interface SheetCard {
  id: string;
  title: string;
  hint?: string;
  /** Controls on a row above the content. */
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

/** Cards under their own header in the category list ("Panel", "Selected widget"). */
export interface SheetGroup {
  heading: string;
  cards: SheetCard[];
}

interface CategorySheetProps {
  categories: InspectorCategory[];
  /** The widget's name: the header over its own categories in the list. */
  moduleTitle: string;
  /** The saved settings (undefined = all defaults). */
  value?: ModuleSettings;
  inherited?: ModuleSettings;
  inheritedFrom?: Record<string, StyleSource>;
  /** Rows shown read-only (the widget follows the global style). */
  locked?: (def: ModuleSetting) => boolean;
  onChange: (key: string, value: ModuleSettingValue) => void;
  onPatch: (patch: ModuleSettings) => void;
  /** Drop settings' own values (fall back to the inherited / default ones). */
  onClear: (keys: string[]) => void;
  /** Open every card (e.g. while searching). */
  openAll?: boolean;
  /** Per-card additions, by category id. */
  extras?: Readonly<Record<string, CardExtra>>;
  /** Cards before / after the categories, each group with its own list header. */
  leading?: SheetGroup[];
  groups?: SheetGroup[];
  /** The list header over the general categories (default "General"). */
  generalTitle?: string;
  /** Small text after every category card's title (e.g. the scope it edits). */
  badge?: string;
  /** Open every category card until the user closes it (default: the Widget and the widget's own). */
  openByDefault?: boolean;
  /** Scroll to a card (and open it) whenever `seq` changes. */
  jumpTo?: { id: string; seq: number };
}

/** A group's list section. */
const groupNav = (g: SheetGroup) => ({
  id: g.heading,
  title: g.heading,
  items: g.cards.map((c) => ({ id: c.id, title: c.title, changed: c.changed ?? 0 })),
});

/** How long a jumped-to card stays outlined. */
const FLASH_MS = 1200;

/**
 * Every category as a card. In the dock a category list sits on the left
 * (changed counts; a click scrolls to the card and outlines it) and the
 * cards flow in fixed-width columns; beside the canvas the cards just
 * stack, collapsible.
 */
export function CategorySheet({
  categories,
  moduleTitle,
  value,
  inherited,
  inheritedFrom,
  locked,
  onChange,
  onPatch,
  onClear,
  openAll = false,
  extras = {},
  leading = [],
  groups = [],
  generalTitle,
  badge,
  openByDefault = false,
  jumpTo,
}: CategorySheetProps) {
  const dock = useInspectorLayout() === "dock";
  const { sources } = useSensorCatalog();
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { setOpen } = useSectionState();
  const changed = (c: InspectorCategory) =>
    changedDefs(c.defs, value, inherited, inheritedFrom, locked).length + (extras[c.id]?.changed ?? 0);
  const counts = Object.fromEntries(categories.map((c) => [c.id, changed(c)]));

  const jump = (id: string) => {
    // A collapsed card (beside the canvas) opens first, then scrolls once it has its height.
    setOpen(`card:${id}`, true);
    requestAnimationFrame(() =>
      root.current
        ?.querySelector(`[${SETTING_CARD}="${id}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
    setFlash(id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };

  const lastJump = useRef(jumpTo?.seq);
  useEffect(() => {
    if (jumpTo && jumpTo.seq !== lastJump.current) jump(jumpTo.id);
    lastJump.current = jumpTo?.seq;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.seq]);

  const field = (def: ModuleSetting) => (
    <SettingField
      key={def.key}
      def={def}
      value={locked?.(def) ? undefined : value}
      inherited={inherited}
      inheritedFrom={inheritedFrom}
      locked={locked?.(def) ?? false}
      onChange={onChange}
      onPatch={onPatch}
      onClear={onClear}
      sources={sources}
    />
  );

  const cards = categories.map((c) => {
    const extra = extras[c.id];
    return (
    <SettingCard
      key={c.id}
      id={c.id}
      title={c.title}
      hint={c.hint}
      changed={counts[c.id]}
      actions={extra?.actions}
      onReset={() => {
        onClear(resetKeysOf(c.defs, value, inherited, inheritedFrom, locked));
        extra?.onReset?.();
      }}
      collapsible
      badge={badge}
      defaultOpen={openByDefault || !c.general || c.id === "widget"}
      forceOpen={openAll}
      flash={flash === c.id}
    >
      {extra?.top}
      {pairRows(c.defs).map((row) =>
        row.length === 1 ? (
          field(row[0])
        ) : (
          <div key={row[0].key} className="grid grid-cols-2 gap-x-3">
            {row.map(field)}
          </div>
        )
      )}
      {extra?.bottom}
    </SettingCard>
    );
  });
  const cardsOf = (list: SheetGroup[]) =>
    list.flatMap((g) =>
      g.cards.map((c) => (
        <SettingCard
          key={c.id}
          id={c.id}
          title={c.title}
          hint={c.hint}
          badge={c.badge}
          changed={c.changed ?? 0}
          onReset={c.onReset}
          actions={c.actions}
          wide={c.wide}
          editor={c.editor}
          collapsible
          defaultOpen
          forceOpen={openAll}
          flash={flash === c.id}
        >
          {c.node}
        </SettingCard>
      ))
    );
  const leadingCards = cardsOf(leading);
  const groupCards = cardsOf(groups);
  const empty = categories.length === 0 && leadingCards.length + groupCards.length === 0 && (
    <div className="py-6 text-center text-xs text-muted-foreground/70">No settings match</div>
  );

  if (!dock) {
    return (
      <div ref={root} className="space-y-2">
        {leadingCards}
        {cards}
        {groupCards}
        {empty}
      </div>
    );
  }
  return (
    <div ref={root} className="flex min-h-0 flex-1">
      <nav aria-label="Categories" className="w-44 shrink-0 space-y-3 overflow-y-auto border-r p-2">
        {[
          ...leading.map(groupNav),
          ...navSections(categories, counts, moduleTitle, generalTitle),
          ...groups.map(groupNav),
        ].map((section) => (
          <div key={section.id}>
            <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </div>
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jump(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent/60",
                  flash === item.id ? "bg-accent text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="truncate">{item.title}</span>
                {item.changed > 0 && (
                  <span className="rounded-full bg-ring/20 px-1.5 text-[10px] tabular-nums text-foreground">
                    {item.changed}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div {...{ [INSPECTOR_SCROLL]: "" }} className="min-w-0 flex-1 overflow-y-auto p-3">
        <div className="columns-[300px] gap-x-4 [&>*]:mb-3">
          {leadingCards}
          {cards}
          {groupCards}
        </div>
        {empty}
      </div>
    </div>
  );
}
