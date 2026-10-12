import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useConfigHistory } from "@/hooks/use-config-history";
import { SourcesPanel } from "./sources-panel";
import { defaultConfig, resolveProfile, type DashboardConfig, type MonitorProfile } from "@/lib/layout";
import { resolveBackground } from "@/lib/appearance";
import { useSensorCatalog } from "@/lib/catalog";
import { appearanceOf } from "@/lib/style-resolve";
import { resolveTheme, themeVars } from "@/lib/theme";
import * as actions from "./studio-actions";
import { CommandPalette } from "./command-palette";
import { exportConfigFile, importConfigFile } from "./config-file";
import { useDocumentProps } from "./use-document-props";
import { StudioCanvas } from "./studio-canvas";
import { StudioTopBar } from "./studio-top-bar";
import { LeftRail } from "./left-rail";
import { StudioDrawer } from "./studio-drawers";
import { StudioInspector } from "./studio-inspector";
import { StudioShell } from "./studio-shell";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { placementTitle } from "./studio-modules";
import { DockToggle } from "./dock-toggle";
import { useStudioCommands } from "./use-studio-commands";
import { useStudioMutations } from "./use-studio-mutations";
import { useStudioSelection } from "./use-studio-selection";
import { useInspectorFollowsSelection, useStudioUi } from "./use-studio-ui";
import { ZoneToolbar } from "./zone-toolbar";
import { widgetName } from "./widget-kinds";
import { WidgetPickerDialog } from "./widget-picker-dialog";
import { ZoomToolbar } from "./zoom-toolbar";

interface StudioViewProps {
  config: DashboardConfig;
  /** The resolved (active) grid profile being edited. */
  profile: MonitorProfile;
  setConfig: Dispatch<SetStateAction<DashboardConfig>>;
  windowWidth: number;
  windowHeight: number;
  onExitStudio: () => void;
  /** Flush the config to the server and force the kiosk view to refresh. */
  onSave: (config: DashboardConfig) => void;
}

/**
 * The studio: a top bar (profile, Design | Sources, undo/redo, save, "⋯"
 * config actions), left icon rail + drawer (add, layers, profiles), a
 * center grid canvas where zones are drawn, selected (Shift / Ctrl-click
 * for several), moved and resized (biome-style, no overlap) with a
 * toolbar on the primary zone, and a right panel (zone inspector, or the
 * theme editor). Every edit goes through the undo history; keyboard
 * shortcuts and the Ctrl+K command palette reach the same actions as the
 * mouse. The state lives in the `use-studio-*` hooks; this composes them.
 */
export function StudioView({
  config,
  profile,
  setConfig: setConfigState,
  windowWidth,
  windowHeight,
  onExitStudio,
  onSave,
}: StudioViewProps) {
  const history = useConfigHistory(config, setConfigState);
  const setConfig = history.set;
  const ui = useStudioUi(config, profile, onSave);
  const sel = useStudioSelection(profile);
  const { selected, selectedWidget, selectedWidgetId } = sel;
  useInspectorFollowsSelection(ui, sel.primaryId, selectedWidgetId);
  const edit = useStudioMutations({
    config,
    profile,
    setConfig,
    sel,
    onPresetSaved: () => ui.setPresetNaming(false),
    windowSize: { width: windowWidth, height: windowHeight },
  });
  const { props: documentProps, setScopeStyle, appearancePresets } = useDocumentProps(
    config,
    profile,
    setConfig,
    edit.updateProfile
  );
  /** The global style the zones render under. */
  const appearance = appearanceOf(config, profile);
  const { runCommand, commands, focusZone } = useStudioCommands({
    config,
    profile,
    setConfig,
    history,
    ui,
    sel,
    edit,
    appearance,
    appearancePresets,
  });
  /** Sensor names for widget names (toolbar crumb, palette). */
  const catalog = useSensorCatalog();
  const { docked, studioLayout, showSources, drawer } = ui;

  /** The profile's own theme, scoped to the canvas (the chrome keeps the dashboard's). */
  const ownTheme = profile.theme !== undefined || profile.radius !== undefined;
  const canvasTheme = ownTheme ? resolveTheme(config, profile) : null;
  const themeScope = canvasTheme ? (themeVars(canvasTheme.tokens, canvasTheme.radius) as CSSProperties) : undefined;

  const inspectorAside = (
    <StudioInspector
      config={config}
      profile={profile}
      appearance={appearance}
      ui={ui}
      sel={sel}
      edit={edit}
      documentProps={documentProps}
      setScopeStyle={setScopeStyle}
    />
  );

  const drawerEl = drawer && (
    <StudioDrawer
      drawer={drawer}
      docked={docked}
      onClose={() => ui.setDrawer(null)}
      insert={{
        placements: profile.placements,
        savedPanels: config.panelPresets,
        onAddModule: edit.addPlacement,
        onAddPreset: edit.addPanelPreset,
        onRenamePreset: edit.renameSavedPanel,
        onDeletePreset: edit.deleteSavedPanel,
      }}
      layers={{
        placements: profile.placements,
        selectedIds: sel.selectedIds,
        onSelect: (id, toggle) => (toggle ? sel.select(id, "toggle") : focusZone(id)),
        onToggle: edit.toggleVisible,
        onRemove: edit.removePlacement,
      }}
      profiles={{
        profiles: config.profiles,
        activeProfile: config.activeProfile,
        profile,
        autoProfileId: resolveProfile({ ...config, activeProfile: "auto" }, windowWidth, windowHeight).id,
        onActivate: edit.activateProfile,
        onAddProfile: edit.addProfile,
        onRemoveProfile: edit.removeProfile,
        onProfileChange: (patch) =>
          edit.updateProfile((p) => ({ ...p, ...patch }), `profile:${Object.keys(patch).join()}`),
        onCols: (delta) => edit.updateProfile((p) => actions.changeCols(p, delta)),
        onRows: (delta) => edit.updateProfile((p) => actions.changeRows(p, delta)),
      }}
    />
  );

  const mainEl = showSources ? (
    <div className="min-h-0 flex-1 overflow-hidden bg-background/40">
      <SourcesPanel
        config={config}
        setConfig={setConfig}
        profile={profile}
        onOpenZone={(id) => {
          ui.setMode("design");
          focusZone(id);
        }}
      />
    </div>
  ) : (
    <StudioCanvas
      profile={profile}
      background={resolveBackground(config, profile)}
      appearance={appearance}
      themeScope={themeScope}
      zoom={ui.zoom}
      showGrid={ui.showGrid}
      scrollRef={ui.scrollRef}
      attachScroll={ui.attachScroll}
      selectedIds={sel.selectedIds}
      onSelect={sel.select}
      selectedWidgetId={selectedWidgetId}
      onSelectWidget={sel.selectWidget}
      onDrawZone={edit.addDrawnZone}
      onZoneRect={(id, rect) => edit.setZoneRect(id, rect, `zone-drag:${id}`)}
      onZoneRects={(id, rects) => edit.setZoneRects(rects, `zone-drag:${id}`)}
      onPickWidget={(id) => {
        sel.select(id);
        ui.setPickerFor(id);
      }}
      onAddModule={edit.addPlacement}
      onAddPreset={edit.addPanelPresetById}
      onOpenAdd={() => ui.setDrawer("add")}
      zoneToolbar={
        selected && (
          <ZoneToolbar
            placement={selected}
            count={sel.selection.length}
            anyVisible={sel.selection.some((p) => p.visible)}
            widgetLabel={selectedWidget ? widgetName(selectedWidget, catalog) : undefined}
            onPickWidget={() => ui.setPickerFor(selected.id)}
            canResize={(size) => edit.resizeSelected(size) !== null}
            onResize={(size) => {
              const rect = edit.resizeSelected(size);
              if (rect) edit.setZoneRect(selected.id, rect);
            }}
            onToggleVisible={edit.toggleSelectionVisible}
            onDuplicate={edit.duplicateSelection}
            onRemove={edit.removeSelection}
            onStyle={() => ui.jumpInspector("colors")}
            onDeselect={() => sel.select(null)}
          />
        )
      }
    />
  );

  const bar = showSources ? null : (
    <ZoomToolbar
      zoom={ui.zoom}
      showGrid={ui.showGrid}
      onToggleGrid={() => ui.setShowGrid((s) => !s)}
      onZoomStep={ui.zoomStep}
      onZoomReset={() => ui.setZoom(1)}
      onFit={ui.fitZoom}
      profile={profile}
      layoutMode={studioLayout.mode}
      placement={studioLayout.layout.placement}
      onLayoutMode={studioLayout.setMode}
      leading={
        docked && (
          <DockToggle
            collapsed={studioLayout.collapsed}
            onToggle={studioLayout.toggleCollapsed}
            summary={selected ? placementTitle(selected) : "Appearance · Background · General · Connection"}
          />
        )
      }
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <StudioTopBar
        profiles={config.profiles}
        activeProfile={config.activeProfile}
        profile={profile}
        onActivate={edit.activateProfile}
        mode={ui.mode}
        onMode={ui.setMode}
        saved={ui.saved}
        onSave={ui.handleSave}
        onExitStudio={onExitStudio}
        onExport={() => exportConfigFile(config)}
        onImport={() => ui.importRef.current?.click()}
        onReset={() => setConfig(defaultConfig())}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onPalette={() => ui.setPaletteOpen(true)}
        onShortcuts={() => ui.setShortcutsOpen(true)}
      />
      <StudioShell
        layout={studioLayout}
        rail={<LeftRail active={showSources ? "sources" : drawer} onSelect={ui.onRail} />}
        drawer={!showSources && drawer && drawerEl}
        main={mainEl}
        bar={bar}
        inspector={inspectorAside}
      />

      <WidgetPickerDialog
        placement={profile.placements.find((p) => p.id === ui.pickerFor) ?? null}
        placements={profile.placements}
        savedPanels={config.panelPresets}
        onRenamePreset={edit.renameSavedPanel}
        onDeletePreset={edit.deleteSavedPanel}
        onPick={(value) => {
          if (ui.pickerFor) edit.assignWidget(ui.pickerFor, value);
          ui.setPickerFor(null);
        }}
        onClose={() => ui.setPickerFor(null)}
      />
      <CommandPalette
        open={ui.paletteOpen}
        onOpenChange={ui.setPaletteOpen}
        commands={commands}
        onRun={(command) => runCommand(command.action)}
      />
      <ShortcutsDialog open={ui.shortcutsOpen} onOpenChange={ui.setShortcutsOpen} />
      <input
        ref={ui.importRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importConfigFile(file, setConfig);
          e.target.value = "";
        }}
      />
    </div>
  );
}
