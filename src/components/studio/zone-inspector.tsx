import { Segmented } from "@/components/ui/segmented";
import { useSensorCatalog } from "@/lib/catalog";
import { CARDS_ID, PANEL_ID, type Placement, type StylePreset } from "@/lib/layout";
import { modules } from "@/modules";
import { replaceStyle, styleOf } from "@/modules/standard-settings";
import type { ModuleSetting, ModuleSettingValue, ModuleSettings } from "@/modules/types";
import { PanelInspector } from "./panel-inspector";
import { SettingsPanel } from "./settings-panel";
import {
  dropKeys,
  filterSettings,
  isStyleSetting,
  matchesQuery,
  splitSettings,
} from "./settings-model";
import { StyleTools } from "./style-tools";
import { placementTitle } from "./studio-modules";
import { ZONE_FRAME_TERMS, ZoneDesignSection } from "./zone-design-section";
import type { ZoneRect } from "./zone-geometry";
import { SettingsSearch, WidgetPicker, ZoneBoxFields, ZoneHeader } from "./zone-inspector-parts";

export type InspectorTab = "content" | "style";

interface ZoneInspectorProps {
  placement: Placement;
  /** Grid size of the profile (zone box input limits). */
  cols: number;
  rows: number;
  /** The profile's style (inherited by the widget's settings). */
  profileStyle: ModuleSettings | undefined;
  /** The theme's accent token (zone accent fallback). */
  themeAccent: string;
  stylePresets: StylePreset[];
  /** The open tab (kept by the studio so it survives reselection). */
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  /** The style copied with "Copy" (session only, survives reselection). */
  styleClipboard: ModuleSettings | null;
  onCopyStyle: (style: ModuleSettings) => void;
  /** The settings search (kept by the studio: "Go to setting" fills it). */
  query: string;
  onQuery: (query: string) => void;
  onClose: () => void;
  /** Mutate the placement; changes with the same `key` coalesce in undo. */
  update: (fn: (p: Placement) => Placement, key?: string) => void;
  onZoneBox: (patch: Partial<ZoneRect>) => void;
  /** Open the widget picker for this zone. */
  onPickWidget: () => void;
  onUseForProfile: (style: ModuleSettings) => void;
  onSavePreset: (name: string, settings: ModuleSettings) => void;
  onDeletePreset: (id: string) => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const TABS = [
  { value: "content" as const, label: "Content" },
  { value: "style" as const, label: "Style" },
];

/** "Content › Thresholds" — where a search result lives. */
function breadcrumb(def: ModuleSetting): string {
  const tab = isStyleSetting(def) ? "Style" : "Content";
  return def.group ? `${tab} › ${def.group}` : tab;
}

/**
 * Right panel for the selected zone: a fixed header (title, actions, zone
 * box, search), then Content (widget + its settings) and Style (the look
 * and the zone frame) tabs. A search shows matches from both tabs flat.
 */
export function ZoneInspector({
  placement: selected,
  cols,
  rows,
  profileStyle,
  themeAccent,
  stylePresets,
  tab,
  onTabChange,
  styleClipboard,
  onCopyStyle,
  query,
  onQuery: setQuery,
  onClose,
  update,
  onZoneBox,
  onPickWidget,
  onUseForProfile,
  onSavePreset,
  onDeletePreset,
  onToggleVisible,
  onDuplicate,
  onRemove,
}: ZoneInspectorProps) {
  const catalog = useSensorCatalog();
  const selectedMod = modules.find((m) => m.id === selected.module);
  const selectedSensors = selectedMod
    ? Object.keys(catalog.sensors).filter((k) =>
        selectedMod.prefixes.some((p) => k.startsWith(p))
      ).length
    : 0;
  // Panels edit their widgets in the PanelInspector, not via settings.
  const defs = selected.panel ? [] : (selectedMod?.settings ?? []);
  const selectedStyleKeys = new Set(defs.map((d) => d.key));
  const { content, style } = splitSettings(defs);

  /** Replace the widget's style (see `replaceStyle`). */
  const applyStyle = (next: ModuleSettings) =>
    update((p) => ({
      ...p,
      settings: replaceStyle(p.settings, next, selectedStyleKeys),
    }));

  const settingsProps = {
    value: selected.settings,
    inherited: profileStyle,
    onChange: (key: string, v: ModuleSettingValue) =>
      update((p) => ({ ...p, settings: { ...p.settings, [key]: v } }), `setting:${key}`),
    onClear: (key: string) =>
      update((p) => ({ ...p, settings: dropKeys(p.settings, new Set([key])) })),
  };
  /** Reset just the given settings (one tab's), keeping the others. */
  const resetDefs = (list: ModuleSetting[]) => () =>
    update((p) => ({
      ...p,
      settings: dropKeys(p.settings, new Set(list.map((d) => d.key))),
    }));

  const zoneFrame = (forceOpen?: boolean) => (
    <ZoneDesignSection
      design={selected.design}
      themeAccent={themeAccent}
      onChange={(fn) => update((p) => ({ ...p, design: fn(p.design) }), "design")}
      forceOpen={forceOpen}
    />
  );

  const searching = query.trim() !== "";
  const matches = searching ? [...filterSettings(content, query), ...filterSettings(style, query)] : [];
  const frameMatches = searching && matchesQuery(ZONE_FRAME_TERMS, query);

  return (
    <section>
      <div className="sticky top-0 z-10 space-y-2.5 border-b bg-popover p-3">
        <ZoneHeader
          title={placementTitle(selected)}
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
        <ZoneBoxFields placement={selected} cols={cols} rows={rows} onZoneBox={onZoneBox} />
        <SettingsSearch query={query} onQuery={setQuery} />
        {!searching && (
          <Segmented options={TABS} value={tab} onChange={onTabChange} className="w-full *:flex-1" />
        )}
      </div>

      <div className="space-y-4 p-4">
        {searching ? (
          <>
            <SettingsPanel title="Results" defs={matches} breadcrumb={breadcrumb} {...settingsProps} />
            {frameMatches && (
              <div>
                <div className="mb-1 pl-3.5 text-[10px] text-muted-foreground/60">Style › Zone frame</div>
                {zoneFrame(true)}
              </div>
            )}
            {matches.length === 0 && !frameMatches && (
              <div className="py-6 text-center text-xs text-muted-foreground/70">No settings match</div>
            )}
          </>
        ) : tab === "content" ? (
          <>
            <WidgetPicker placement={selected} onPickWidget={onPickWidget} />
            {selected.panel && <PanelInspector placement={selected} update={(fn) => update(fn, "panel")} />}
            <SettingsPanel defs={content} onReset={resetDefs(content)} {...settingsProps} />
          </>
        ) : (
          <>
            <SettingsPanel
              title="Style"
              defs={style}
              onReset={resetDefs(style)}
              actions={
                <StyleTools
                  canPaste={styleClipboard !== null}
                  presets={stylePresets}
                  onCopy={() => onCopyStyle(styleOf(selected.settings))}
                  onPaste={() => styleClipboard && applyStyle(styleClipboard)}
                  onUseForProfile={() => onUseForProfile(styleOf(selected.settings))}
                  onSavePreset={(name) => onSavePreset(name, styleOf(selected.settings))}
                  onApplyPreset={(id) => {
                    const preset = stylePresets.find((p) => p.id === id);
                    if (preset) applyStyle(preset.settings);
                  }}
                  onDeletePreset={onDeletePreset}
                />
              }
              {...settingsProps}
            />
            {zoneFrame()}
          </>
        )}
      </div>
    </section>
  );
}
