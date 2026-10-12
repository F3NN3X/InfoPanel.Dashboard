import { useSensorCatalog } from "@/lib/catalog";
import { CARDS_ID, PANEL_ID, type Placement, type StylePreset, type Widget } from "@/lib/layout";
import { panelLegacyLook, panelOwnSettings } from "@/lib/panel-model";
import { followsGlobal, resolveStyle, type Appearance } from "@/lib/style-resolve";
import { modules } from "@/modules";
import {
  CARD_SETTINGS,
  PANEL_SETTINGS,
  PROFILE_STYLE_KEYS,
  replaceStyle,
  styleOf,
} from "@/modules/standard-settings";
import {
  settingKeys,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
} from "@/modules/types";
import { usePanelSheet } from "./panel-sheet";
import { HeaderSlot, InspectorHeader, useInspectorLayout } from "./inspector-layout";
import { CategorySheet, type CardExtra } from "./category-sheet";
import { categorize, filterCategories, withGeneral } from "./inspector-categories";
import { ToggleRow } from "./setting-rows";
import { dropKeys, matchesQuery } from "./settings-model";
import type { AppearanceTarget } from "./appearance-panel";
import { withStyleMode } from "./appearance-actions";
import { StyleModeBar } from "./style-mode-bar";
import { StyleTools } from "./style-tools";
import { placementTitle } from "./studio-modules";
import { widgetName } from "./widget-kinds";
import { ZONE_FRAME_TERMS, ZoneFrameFields, zoneFrameSet } from "./zone-design-section";
import type { ZoneRect } from "./zone-geometry";
import { SettingsSearch, WidgetPicker, ZoneBoxFields, ZoneHeader } from "./zone-inspector-parts";

interface ZoneInspectorProps {
  placement: Placement;
  /** Grid size of the profile (zone box input limits). */
  cols: number;
  rows: number;
  /** The global style (dashboard + profile, forced or not) the widget inherits. */
  appearance: Appearance;
  stylePresets: StylePreset[];
  /** Scroll to a card (the toolbar's Style button, the palette) whenever `seq` changes. */
  jumpTo?: { id: string; seq: number };
  /** The style copied with "Copy" (session only, survives reselection). */
  styleClipboard: ModuleSettings | null;
  onCopyStyle: (style: ModuleSettings) => void;
  /** A panel widget copied with "Copy" (session only, survives reselection). */
  widgetClipboard: Widget | null;
  onCopyWidget: (widget: Widget) => void;
  /** A panel's selected widget (kept by the studio; the canvas selects too). */
  selectedWidgetId: string | null;
  onSelectWidget: (id: string | null) => void;
  /** Bring the selected widget's editor into view (its breadcrumb). */
  onShowWidget: () => void;
  /** The settings search (kept by the studio: "Go to setting" fills it). */
  query: string;
  onQuery: (query: string) => void;
  onClose: () => void;
  /** Mutate the placement; changes with the same `key` coalesce in undo. */
  update: (fn: (p: Placement) => Placement, key?: string) => void;
  onZoneBox: (patch: Partial<ZoneRect>) => void;
  /** Open the widget picker for this zone. */
  onPickWidget: () => void;
  /** Make the widget's style the global style of every profile, or of this one. */
  onUseAsGlobal: (target: AppearanceTarget, style: ModuleSettings) => void;
  onSavePreset: (name: string, settings: ModuleSettings) => void;
  onDeletePreset: (id: string) => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** A panel's "Save as panel preset" name input is open (the palette opens it too). */
  presetNaming: boolean;
  onPresetNaming: (open: boolean) => void;
  /** Save this panel zone to My panels. */
  onSavePanelPreset: (name: string) => void;
}

/** Search text of what the zone adds to a card, by card id. */
const EXTRA_TERMS: Record<string, string[]> = {
  widget: ["Widget", "Type", "Change", "Pick", "Visible"],
  colors: ["Follow global", "Custom", "Style", "Copy style", "Paste style", "Preset"],
  effects: ZONE_FRAME_TERMS,
};

/**
 * Right panel for the selected zone: a fixed header (title, actions, zone
 * box, search), then one sheet of cards: the general ones (Widget, Size &
 * alignment, Typography, Spacing & shape, Colors & surface, Border &
 * effects with the zone frame, Advanced), the widget's own, and for a
 * panel its editors. A search filters cards and rows across the sheet.
 */
export function ZoneInspector({
  placement: selected,
  cols,
  rows,
  appearance,
  stylePresets,
  jumpTo,
  styleClipboard,
  onCopyStyle,
  widgetClipboard,
  onCopyWidget,
  selectedWidgetId,
  onSelectWidget,
  onShowWidget,
  query,
  onQuery: setQuery,
  onClose,
  update,
  onZoneBox,
  onPickWidget,
  onUseAsGlobal,
  onSavePreset,
  onDeletePreset,
  onToggleVisible,
  onDuplicate,
  onRemove,
  presetNaming,
  onPresetNaming,
  onSavePanelPreset,
}: ZoneInspectorProps) {
  const dock = useInspectorLayout() === "dock";
  const catalog = useSensorCatalog();
  const selectedMod = modules.find((m) => m.id === selected.module);
  const selectedSensors = selectedMod
    ? Object.keys(catalog.sensors).filter((k) =>
        selectedMod.prefixes.some((p) => k.startsWith(p))
      ).length
    : 0;
  // Panels edit their widgets in the PanelInspector; their look is settings.
  const defs = selected.panel
    ? PANEL_SETTINGS
    : selected.module === CARDS_ID
      ? CARD_SETTINGS
      : (selectedMod?.settings ?? []);
  const selectedStyleKeys = new Set(defs.flatMap(settingKeys));
  const selectedWidget = selected.panel?.widgets.find((w) => w.id === selectedWidgetId);
  const panelSheet = usePanelSheet({
    placement: selected,
    update,
    selectedWidgetId,
    onSelectWidget,
    widgetClipboard,
    onCopyWidget,
    presetNaming,
    onPresetNaming,
    onSavePreset: onSavePanelPreset,
  });

  /** Replace the widget's style (see `replaceStyle`). */
  const applyStyle = (next: ModuleSettings) =>
    update((p) => ({
      ...p,
      settings: replaceStyle(p.settings, next, selectedStyleKeys),
    }));

  // What the widget inherits: a panel's legacy accent / card (no dot), then
  // the dashboard and profile style. Following (or forced): look rows locked.
  const inherited = resolveStyle({
    moduleDefaults: selected.panel ? panelLegacyLook(selected) : undefined,
    dashboard: appearance.dashboard,
    profile: appearance.profile,
  });
  const follows = followsGlobal(selected.styleMode, appearance.enforce);
  const hasLook = defs.some((d) => PROFILE_STYLE_KEYS.has(d.key));

  const settingsProps = {
    // A panel's legacy title shows until set here.
    value: selected.panel ? panelOwnSettings(selected) : selected.settings,
    inherited: inherited.settings,
    inheritedFrom: inherited.source,
    locked: follows ? (def: ModuleSetting) => PROFILE_STYLE_KEYS.has(def.key) : undefined,
    onChange: (key: string, v: ModuleSettingValue) =>
      update((p) => ({ ...p, settings: { ...p.settings, [key]: v } }), `setting:${key}`),
    onPatch: (patch: ModuleSettings) =>
      update((p) => ({ ...p, settings: { ...p.settings, ...patch } }), `setting:${Object.keys(patch).join()}`),
    onClear: (keys: string[]) =>
      update((p) => ({ ...p, settings: dropKeys(p.settings, new Set(keys)) })),
  };
  const searching = query.trim() !== "";
  const base = categorize(defs);
  const termsMatch = (id: string) => !searching || matchesQuery(EXTRA_TERMS[id] ?? [], query);

  const extras: Record<string, CardExtra> = {
    widget: {
      top: <WidgetPicker placement={selected} onPickWidget={onPickWidget} />,
      bottom: <ToggleRow label="Visible" value={selected.visible} onChange={onToggleVisible} />,
    },
    ...(hasLook
      ? {
          colors: {
            top: (
              <StyleModeBar
                mode={selected.styleMode}
                enforced={appearance.enforce}
                onMode={(mode) => update((p) => withStyleMode(p, mode), "style-mode")}
              />
            ),
            actions: (
              <StyleTools
                canPaste={styleClipboard !== null}
                presets={stylePresets}
                onCopy={() => onCopyStyle(styleOf(selected.settings))}
                onPaste={() => styleClipboard && applyStyle(styleClipboard)}
                onUseAsGlobal={(target) => onUseAsGlobal(target, styleOf(selected.settings))}
                onSavePreset={(name) => onSavePreset(name, styleOf(selected.settings))}
                onApplyPreset={(id) => {
                  const preset = stylePresets.find((p) => p.id === id);
                  if (preset) applyStyle(preset.settings);
                }}
                onDeletePreset={onDeletePreset}
              />
            ),
          },
        }
      : {}),
    effects: {
      // A panel draws its own card (Colors & surface › Surface): no second one around it.
      bottom: (
        <ZoneFrameFields
          design={selected.design}
          onChange={(fn) => update((p) => ({ ...p, design: fn(p.design) }), "design")}
          showBackground={!selected.panel}
        />
      ),
      changed: zoneFrameSet(selected.design, !selected.panel),
      onReset: () => update((p) => ({ ...p, design: undefined })),
    },
  };
  const categories = withGeneral(
    searching ? filterCategories(base, query) : base,
    Object.keys(extras).filter(termsMatch)
  );
  // A card keeps its additions while searching only when they match (the style bar stays with its card).
  const shown = Object.fromEntries(
    Object.entries(extras).filter(
      ([id]) => categories.some((c) => c.id === id) && (termsMatch(id) || id === "colors")
    )
  );

  const panelGroups = (panelSheet ?? [])
    .map((g) => ({ ...g, cards: searching ? g.cards.filter((c) => matchesQuery(c.terms, query)) : g.cards }))
    .filter((g) => g.cards.length > 0);

  const sheet = (
    <CategorySheet
      categories={categories}
      moduleTitle={selectedMod?.title ?? placementTitle(selected)}
      openAll={searching}
      extras={shown}
      jumpTo={jumpTo}
      groups={panelGroups}
      {...settingsProps}
    />
  );

  return (
    <section className={dock ? "flex h-full min-h-0 flex-col" : undefined}>
      <InspectorHeader inspectorHeader side="sticky top-0 z-10 space-y-2.5 border-b bg-popover p-3">
        <HeaderSlot className="w-72 shrink-0">
        <ZoneHeader
          title={placementTitle(selected)}
          widget={selectedWidget && widgetName(selectedWidget, catalog)}
          onZoneCrumb={() => onSelectWidget(null)}
          onWidgetCrumb={onShowWidget}
          sensors={
            selected.module !== CARDS_ID && selected.module !== PANEL_ID
              ? selectedSensors
              : undefined
          }
          visible={selected.visible}
          onToggleVisible={onToggleVisible}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          onClose={onClose}
        />
        </HeaderSlot>
        <HeaderSlot className="w-72 shrink-0">
          <ZoneBoxFields placement={selected} cols={cols} rows={rows} onZoneBox={onZoneBox} />
        </HeaderSlot>
        <HeaderSlot className="w-56 shrink-0">
          <SettingsSearch query={query} onQuery={setQuery} />
        </HeaderSlot>
      </InspectorHeader>

      {dock ? sheet : <div className="p-4">{sheet}</div>}
    </section>
  );
}
