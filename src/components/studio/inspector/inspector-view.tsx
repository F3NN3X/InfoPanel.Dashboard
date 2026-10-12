import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { useSensorCatalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { ModuleSetting } from "@/modules/types";
import { HeaderSlot, INSPECTOR_SCROLL, InspectorHeader, useInspectorLayout } from "../inspector-layout";
import {
  allSections,
  applyAdvanced,
  changedCount,
  extraMatches,
  inspectorTabs,
  jumpTarget,
  resetKeysOfSection,
  searchAll,
  visibleSections,
  type InspectorContext,
  type InspectorSection,
  type TabId,
} from "../inspector-model";
import { SETTING_CARD, SettingSection, sectionStateId } from "../setting-card";
import { SettingField, type FieldsApi } from "../settings-panel";
import { useSectionState } from "../use-section-state";
import { SettingsSearch } from "../zone-inspector-parts";
import { pickTab, useInspectorAdvanced, useInspectorTab } from "./inspector-prefs";
import { DotLegend } from "./source-dot";

/** What a context adds to one of its sections around the schema's rows. */
export interface SectionParts {
  /** Above the rows (the widget picker, Follow / Custom). */
  top?: ReactNode;
  /** The custom UI of a special section, after any rows. */
  body?: ReactNode;
  /** Below the rows (Visible, the zone frame). */
  bottom?: ReactNode;
  /** Header controls before Reset (the style tools). */
  actions?: ReactNode;
  badge?: string;
  /** Changed fields the custom UI holds (added to the rows'). */
  changed?: number;
  /** Reset the custom UI's fields (the section's Reset also clears its rows). */
  onReset?: () => void;
  /** Span every dock column. */
  wide?: boolean;
  /** The section `revealWidgetEditor` scrolls to. */
  editor?: boolean;
}

interface InspectorViewProps {
  context: InspectorContext;
  /** The remembered-tab key ("widget", "panel", "dashboard"). */
  contextKey: string;
  /** The header (title, actions, placement row); the search follows it. */
  header: ReactNode;
  fields: FieldsApi;
  /** Whether a setting shows for the current values (`visibleIf`). */
  visible?: (def: ModuleSetting) => boolean;
  /** Whether a section has anything to show (a custom card its zone lacks drops it). */
  present?: (section: InspectorSection) => boolean;
  /** The custom UI of a section (no hooks: called while rendering). */
  parts: (section: InspectorSection) => SectionParts;
  /** The notes and banners above a tab's sections (or a context without tabs). */
  notes?: (tab: TabId | undefined) => ReactNode;
  query: string;
  onQuery: (query: string) => void;
  /** Open, reveal and outline a section whenever `seq` changes. */
  jumpTo?: { id: string; seq: number };
}

/** How long a jumped-to section stays outlined. */
const FLASH_MS = 1200;

const always = () => true;

/** A note or banner (README §4.6). */
export function InspectorNote({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 mt-3 break-inside-avoid rounded-lg border border-ui-default bg-ui-raised px-3 py-2.5 text-[12px] leading-snug text-ui-2">
      {children}
    </div>
  );
}

/** Underline tabs with a changed-count pill each. */
function Tabs({
  tabs,
  active,
  counts,
  onTab,
}: {
  tabs: { id: TabId; label: string }[];
  active: TabId | undefined;
  counts: Partial<Record<TabId, number>>;
  onTab: (tab: TabId) => void;
}) {
  return (
    <div role="tablist" className="flex shrink-0 gap-4 border-b border-ui-subtle px-4">
      {tabs.map((t) => {
        const selected = t.id === active;
        const n = counts[t.id] ?? 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onTab(t.id)}
            className={cn(
              "-mb-px flex h-9 items-center gap-1.5 border-b-2 text-[12.5px] font-medium transition-colors",
              selected ? "border-ui-1 text-ui-1" : "border-transparent text-ui-4 hover:text-ui-2"
            )}
          >
            {t.label}
            {n > 0 && (
              <span className="rounded-full bg-ui-accent-soft px-1.5 font-ui-mono text-[10px] leading-4 text-ui-accent-text">
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The footer: the dot legend and the Advanced settings switch. */
function Footer({ advanced, onAdvanced }: { advanced: boolean; onAdvanced: (on: boolean) => void }) {
  return (
    <footer className="flex h-10 shrink-0 items-center gap-2 border-t border-ui-subtle px-4">
      <Popover
        trigger={<CircleHelp className="h-4 w-4" />}
        triggerLabel="What the dots mean"
        triggerClassName="flex h-6 w-6 items-center justify-center rounded-md text-ui-4 hover:bg-ui-hover hover:text-ui-1"
        side="top"
        className="w-64"
      >
        <DotLegend />
      </Popover>
      <span className="flex-1 text-[12px] text-ui-3">Advanced settings</span>
      <Toggle checked={advanced} onChange={onAdvanced} label="Advanced settings" />
    </footer>
  );
}

/**
 * The registry-driven inspector body shared by every context: search
 * across tabs, the tabs with their changed counts, the notes, collapsible
 * sections of field rows (with the context's custom UI), the hidden
 * advanced count and the footer. Beside the canvas the sections stack; in
 * the bottom dock they flow, whole, into 300 px columns that scroll sideways.
 */
export function InspectorView({
  context,
  contextKey,
  header,
  fields,
  visible = always,
  present = always,
  parts,
  notes,
  query,
  onQuery,
  jumpTo,
}: InspectorViewProps) {
  const dock = useInspectorLayout() === "dock";
  const { sources } = useSensorCatalog();
  const [advanced, setAdvanced] = useInspectorAdvanced();
  const [storedTab, setTab] = useInspectorTab(contextKey);
  const { setOpen } = useSectionState();
  const root = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const tabs = inspectorTabs(context);
  const tab = pickTab(storedTab, tabs.map((t) => t.id));
  const searching = query.trim() !== "";
  const all = visibleSections(allSections(context), visible).filter(present);
  const full = new Map(all.map((s) => [s.id, s] as const));

  const changedOf = (s: InspectorSection) => changedCount(s, fields.values) + (parts(s).changed ?? 0);
  const counts: Partial<Record<TabId, number>> = {};
  for (const s of all) counts[s.tab] = (counts[s.tab] ?? 0) + changedOf(s);

  // While searching: every tab's matches, each section labelled with its tab.
  const result = searching ? searchAll(context, query) : null;
  const listed = result
    ? visibleSections(
        result.groups.map((g) => ({ ...g.section, extras: g.section.extras.filter((e) => extraMatches(e, query)) })),
        visible
      ).filter(present)
    : tabs.length > 0
      ? all.filter((s) => s.tab === tab)
      : all;
  const { sections, hiddenCount } = applyAdvanced(listed, advanced);
  const tabLabel = (s: InspectorSection) =>
    result ? (result.groups.find((g) => g.section.id === s.id)?.tabLabel ?? "") : "";

  const lastJump = useRef(jumpTo?.seq);
  useEffect(() => {
    if (!jumpTo || jumpTo.seq === lastJump.current) return;
    lastJump.current = jumpTo.seq;
    const target = jumpTarget(all, jumpTo.id);
    if (!target) return;
    if (target.advanced && !advanced) setAdvanced(true);
    if (tabs.length > 0) setTab(target.tab);
    setOpen(sectionStateId(target.id), true);
    // The tab renders first, then the section scrolls into view.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        root.current
          ?.querySelector(`[${SETTING_CARD}="${CSS.escape(target.id)}"]`)
          ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
      )
    );
    setFlash(target.id);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), FLASH_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo?.seq]);

  /** In the dock each block is one unbreakable column cell (a wide section takes two). */
  const cell = (key: string, node: ReactNode, wide = false) =>
    node && dock ? (
      <div key={key} className={cn("shrink-0 border-r border-ui-subtle", wide ? "w-[600px]" : "w-[300px]")}>
        {node}
      </div>
    ) : (
      node
    );

  const pad = (node: ReactNode) => node && <div className="space-y-2 px-4 py-1.5">{node}</div>;

  const renderSection = (s: InspectorSection) => {
    const p = parts(s);
    const whole = full.get(s.id) ?? s;
    return cell(
      s.id,
      <SettingSection
        key={s.id}
        id={s.id}
        title={s.title}
        hint={s.hint}
        tabLabel={tabLabel(s) || undefined}
        badge={p.badge}
        changed={changedOf(whole)}
        actions={p.actions}
        onReset={() => {
          const keys = resetKeysOfSection(whole, fields.values);
          if (keys.length > 0) fields.onClear(keys);
          parts(whole).onReset?.();
        }}
        forceOpen={searching}
        wide={p.wide}
        editor={p.editor}
        flash={flash === s.id}
      >
        {pad(p.top)}
        {s.settings.map((def) => (
          <SettingField key={def.key} def={def} fields={fields} sources={sources} />
        ))}
        {pad(p.body)}
        {pad(p.bottom)}
      </SettingSection>,
      p.wide
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorHeader>
        {header}
        <HeaderSlot className="w-56 shrink-0">
          <SettingsSearch query={query} onQuery={onQuery} />
        </HeaderSlot>
      </InspectorHeader>
      {!searching && tabs.length > 0 && <Tabs tabs={tabs} active={tab} counts={counts} onTab={setTab} />}
      <div
        {...{ [INSPECTOR_SCROLL]: "" }}
        ref={root}
        className={cn("min-h-0 flex-1", dock ? "overflow-auto" : "overflow-y-auto")}
      >
        <div
          className={cn(
            // Columns of whole sections: a flex column that wraps never splits an item (CSS
            // columns do when one is taller than the dock); a taller one scrolls the dock.
            dock && "flex h-full flex-col flex-wrap content-start"
          )}
        >
          {cell(
            "lead",
            searching ? (
              <p className="px-4 pb-1 pt-3 text-[11px] text-ui-4">
                {result && result.total > 0
                  ? `${result.total} setting${result.total === 1 ? "" : "s"} across all tabs`
                  : `No settings match '${query.trim()}'.`}
              </p>
            ) : (
              notes?.(tab)
            )
          )}
          {sections.map(renderSection)}
          {hiddenCount > 0 &&
            cell(
              "advanced",
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setAdvanced(true)}
                  className="w-full rounded-lg border border-dashed border-ui-strong py-2 text-[12px] text-ui-3 hover:border-ui-accent hover:text-ui-1"
                >
                  Show {hiddenCount} advanced setting{hiddenCount === 1 ? "" : "s"}
                </button>
              </div>
            )}
        </div>
      </div>
      <Footer advanced={advanced} onAdvanced={setAdvanced} />
    </div>
  );
}
