import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useConfigHistory } from "@/hooks/use-config-history";
import { modules } from "@/modules";
import type { ModuleSettings } from "@/modules/types";
import { SourcesPanel } from "./sources-panel";
import {
  BLANK_MODULE,
  PANEL_ID,
  defaultConfig,
  newProfile,
  resolveProfile,
  uid,
  type DashboardConfig,
  type MonitorProfile,
  type Placement,
  type Widget,
} from "@/lib/layout";
import { resolveBackground } from "@/lib/appearance";
import { useSensorCatalog } from "@/lib/catalog";
import { appearanceOf } from "@/lib/style-resolve";
import { findPanelPreset, type PanelPreset } from "@/lib/panelPresets";
import { resolveTheme, themeVars } from "@/lib/theme";
import * as actions from "./studio-actions";
import { followAll, toggleEnforce } from "./appearance-actions";
import { CommandPalette } from "./command-palette";
import { buildCommands, type CommandAction } from "./commands";
import { copyProfileJson, exportConfigFile, importConfigFile } from "./config-file";
import { DOCUMENT_CARD, DocumentInspector } from "./document-inspector";
import { useDocumentProps } from "./use-document-props";
import { StudioCanvas } from "./studio-canvas";
import { StudioTopBar } from "./studio-top-bar";
import { insertables } from "./insert-panel";
import { LeftRail, useStoredDrawer, type RailItem } from "./left-rail";
import { StudioDrawer } from "./studio-drawers";
import { StudioShell } from "./studio-shell";
import { deletePanelPreset, renamePanelPreset, savePanelPreset } from "./panel-preset-actions";
import { panelWidgetActions } from "./panel-widget-actions";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { moduleMinSize, placementTitle } from "./studio-modules";
import { useCanvasZoom } from "./use-canvas-zoom";
import { cn } from "@/lib/utils";
import { DockToggle } from "./dock-toggle";
import { InspectorLayoutProvider } from "./inspector-layout";
import { revealWidgetEditor, scrollInspectorToTop } from "./inspector-scroll";
import { DRAWER_WIDTH, RAIL_WIDTH, pageSize, useStudioLayout } from "./use-studio-layout";
import { useStudioShortcuts, type ShortcutAction } from "./use-studio-shortcuts";
import { fitZoneRect, nudgeZone, resizeZone, type ZoneRect } from "./zone-geometry";
import { ZoneInspector } from "./zone-inspector";
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
 * center grid canvas where zones are drawn, moved and resized (biome-style,
 * no overlap) with a toolbar on the selected zone, and a right panel (zone
 * inspector, or the theme editor). Every edit goes through the undo
 * history; keyboard shortcuts and the Ctrl+K command palette reach the
 * same actions as the mouse.
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** A request to scroll the zone inspector to a card (`seq` makes repeats count). */
  const [inspectorJump, setInspectorJump] = useState<{ id: string; seq: number }>();
  const jumpInspector = (id: string) => setInspectorJump((j) => ({ id, seq: (j?.seq ?? 0) + 1 }));
  /** The zone inspector's settings search ("Go to setting" fills it). */
  const [inspectorQuery, setInspectorQuery] = useState("");
  const [showGrid, setShowGrid] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const [drawer, setDrawer] = useStoredDrawer();
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  /** The zone the widget picker dialog is open for. */
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const page = pageSize(profile);
  const { zoom, setZoom, zoomStep, fitZoom, scrollRef, attachScroll } = useCanvasZoom(page);
  const studioLayout = useStudioLayout({
    page,
    rail: RAIL_WIDTH,
    drawer: !showSources && drawer ? DRAWER_WIDTH : 0,
    forceSide: showSources,
  });
  const docked = studioLayout.layout.placement === "bottom";
  /** Sensor names for widget names (toolbar crumb, palette). */
  const catalog = useSensorCatalog();
  /** The panel inspector's "Save as panel preset" name input is open. */
  const [presetNaming, setPresetNaming] = useState(false);

  const handleSave = () => {
    onSave(config);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  // Deselect when switching profiles.
  useEffect(() => setSelectedId(null), [profile.id]);

  // A new selection starts the inspector at the top (no preset name input).
  useEffect(() => {
    scrollInspectorToTop(inspectorRef.current);
    setPresetNaming(false);
  }, [selectedId]);

  const selected = profile.placements.find((p) => p.id === selectedId) ?? null;

  // Selecting a zone brings a collapsed dock back (its inspector is the point).
  useEffect(() => {
    if (selectedId !== null && studioLayout.collapsed) studioLayout.setCollapsed(false);
  }, [selectedId]);

  // An undo/redo (or any edit) can remove the selected zone: deselect.
  useEffect(() => {
    if (selectedId !== null && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  /**
   * The selected panel widget, tied to its zone: it only counts while that
   * zone is selected and still holds it (another zone, an undo or a delete
   * drops it).
   */
  const [widgetSel, setWidgetSel] = useState<{ zoneId: string; widgetId: string } | null>(null);
  const selectedWidget =
    (widgetSel &&
      widgetSel.zoneId === selected?.id &&
      selected.panel?.widgets.find((w) => w.id === widgetSel.widgetId)) ||
    null;
  const selectedWidgetId = selectedWidget?.id ?? null;
  useEffect(() => {
    if (widgetSel !== null && !selectedWidget) setWidgetSel(null);
  }, [widgetSel, selectedWidget]);

  /** Select a zone's widget (null = the panel itself). */
  const selectWidget = (zoneId: string, widgetId: string | null) => {
    setSelectedId(zoneId);
    setWidgetSel(widgetId === null ? null : { zoneId, widgetId });
  };

  /** Canvas / palette pick (the editor is revealed by the effect below). */
  const showWidget = selectWidget;

  const revealEditor = () => revealWidgetEditor(inspectorRef.current);

  // A newly selected widget brings its editor into view.
  useEffect(() => {
    if (selectedWidgetId !== null) revealEditor();
  }, [selectedWidgetId]);

  /** The style copied with "Copy" in the inspector (session only). */
  const [styleClipboard, setStyleClipboard] = useState<ModuleSettings | null>(null);
  /** The panel widget copied with "Copy" in the layers list (session only). */
  const [widgetClipboard, setWidgetClipboard] = useState<Widget | null>(null);

  /* ---------------- profile + placement mutations ---------------- */

  /** Mutate the active profile; same-`key` changes coalesce in undo. */
  const updateProfile = (fn: (p: MonitorProfile) => MonitorProfile, key?: string) => {
    setConfig(
      (c) => ({
        ...c,
        profiles: c.profiles.map((p) => (p.id === profile.id ? fn(p) : p)),
      }),
      key
    );
  };

  /** Generic placement mutation (settings, design, ...). */
  const updatePlacement = (id: string, fn: (p: Placement) => Placement, key?: string) =>
    updateProfile((p) => actions.updatePlacement(p, id, fn), key);

  const addPlacement = (module: string) => {
    const id = uid(module);
    updateProfile((p) =>
      actions.addModulePlacement(p, id, module, moduleMinSize(module))
    );
    setSelectedId(id);
  };

  /** Add a pre-designed panel (a group of widgets) from a preset. */
  const addPanelPreset = (preset: PanelPreset) => {
    const id = uid(PANEL_ID);
    updateProfile((p) => actions.addPresetPlacement(p, id, preset));
    setSelectedId(id);
  };

  /** Add a panel preset (built in, starter or saved) by id. */
  const addPanelPresetById = (presetId: string) => {
    const preset = findPanelPreset(presetId, config.panelPresets);
    if (preset) addPanelPreset(preset);
  };

  /** Save the selected panel zone to My panels (one undo step). */
  const savePanelAsPreset = (name: string) => {
    if (selected?.panel) setConfig((c) => savePanelPreset(c, selected, uid("panelpreset"), name));
    setPresetNaming(false);
  };

  const renameSavedPanel = (id: string, name: string) => setConfig((c) => renamePanelPreset(c, id, name));
  const deleteSavedPanel = (id: string) => setConfig((c) => deletePanelPreset(c, id));

  /** A zone drawn on the canvas becomes a blank zone, then is selected. */
  const addDrawnZone = (rect: ZoneRect) => {
    const id = uid(BLANK_MODULE);
    updateProfile((p) => actions.addBlankZone(p, id, rect));
    setSelectedId(id);
  };

  /** Select a zone (Layers drawer) and bring it into view on the canvas. */
  const focusZone = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() =>
      scrollRef.current
        ?.querySelector(`[data-zone-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
    );
  };

  /**
   * Rail click: Sources toggles the full-width sources mode (the drawer
   * stays remembered underneath); a drawer icon opens that drawer, or
   * collapses it when it is already open.
   */
  const onRail = (item: RailItem) => {
    if (item === "sources") {
      setShowSources((v) => !v);
      return;
    }
    if (showSources) {
      setShowSources(false);
      studioLayout.setCollapsed(false);
      setDrawer(item);
      return;
    }
    if (drawer !== item) studioLayout.setCollapsed(false);
    setDrawer(drawer === item ? null : item);
  };

  const toggleVisible = (id: string) =>
    updateProfile((p) => actions.toggleVisible(p, id));

  const removePlacement = (id: string) => {
    updateProfile((p) => actions.removePlacement(p, id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicatePlacement = (id: string) =>
    updateProfile((p) => actions.duplicatePlacement(p, id));

  /** Set a zone's box; `key` makes a drag or key repeat one undo step. */
  const setZoneRect = (id: string, rect: ZoneRect, key?: string) => {
    const zone = profile.placements.find((p) => p.id === id);
    const same =
      zone !== undefined &&
      zone.colStart === rect.col &&
      zone.rowStart === rect.row &&
      zone.colSpan === rect.cols &&
      zone.rowSpan === rect.rows;
    if (!same) updateProfile((p) => actions.setZoneRect(p, id, rect), key);
  };

  /**
   * Set the selected zone's box (inspector inputs), clamped + no overlap;
   * a box that can't be placed keeps the old one.
   */
  const setZoneBox = (patch: Partial<ZoneRect>) => {
    if (!selected) return;
    const next: ZoneRect = {
      col: selected.colStart,
      row: selected.rowStart,
      cols: selected.colSpan,
      rows: selected.rowSpan,
      ...patch,
    };
    const clamped = fitZoneRect(
      next,
      profile.placements,
      profile.cols,
      profile.rows,
      selected.id
    );
    if (clamped) setZoneRect(selected.id, clamped, `zone-box:${selected.id}`);
  };

  /** The selected zone at a new size (toolbar steps); null = blocked. */
  const resizeSelected = (size: { cols: number; rows: number }) =>
    selected
      ? resizeZone(selected, size, profile.placements, profile.cols, profile.rows)
      : null;

  /** Assign a widget to a zone (blank, module, or preset panel). */
  const assignWidget = (id: string, value: string) => {
    if (value === "blank") {
      updateProfile((p) => actions.clearWidget(p, id));
    } else if (value.startsWith("module:")) {
      const module = value.slice("module:".length);
      updateProfile((p) =>
        actions.assignModule(p, id, module, moduleMinSize(module))
      );
    } else if (value.startsWith("preset:")) {
      const preset = findPanelPreset(value.slice("preset:".length), config.panelPresets);
      if (preset) updateProfile((p) => actions.assignPreset(p, id, preset));
    }
  };

  /** Open the widget picker for a zone (selecting it). */
  const pickWidget = (id: string) => {
    setSelectedId(id);
    setPickerFor(id);
  };

  const { props: documentProps, setScopeStyle, appearancePresets } = useDocumentProps(
    config,
    profile,
    setConfig,
    updateProfile
  );

  const addProfile = () => {
    const np = newProfile(
      `${windowWidth}×${windowHeight}`,
      windowWidth,
      windowHeight
    );
    setConfig((c) => ({
      ...c,
      profiles: [...c.profiles, np],
      activeProfile: np.id,
    }));
  };

  const removeProfile = () => {
    if (config.profiles.length <= 1) return;
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.filter((p) => p.id !== profile.id),
      activeProfile: "auto",
    }));
  };

  const activateProfile = (id: string) => setConfig((c) => ({ ...c, activeProfile: id }));

  /** The profile's own theme, scoped to the canvas (the chrome keeps the dashboard's). */
  const ownTheme = profile.theme !== undefined || profile.radius !== undefined;
  const canvasTheme = ownTheme ? resolveTheme(config, profile) : null;
  const themeScope = canvasTheme ? (themeVars(canvasTheme.tokens, canvasTheme.radius) as CSSProperties) : undefined;

  /* ---------------- keyboard shortcuts + command palette ---------------- */

  /** Esc: clear the settings search, else step out (widget → zone → none), else close the drawer. */
  const escape = () => {
    if (inspectorQuery !== "") setInspectorQuery("");
    else if (selectedWidget) setWidgetSel(null);
    else if (selectedId !== null) setSelectedId(null);
    else if (!showSources && drawer) setDrawer(null);
  };

  /** Arrow keys: move (or Shift: resize) the selected zone one cell. */
  const stepSelected = (kind: "nudge" | "resize", delta: { cols: number; rows: number }) => {
    if (!selected) return;
    const rect =
      kind === "nudge"
        ? nudgeZone(selected, delta, profile.placements, profile.cols, profile.rows)
        : resizeSelected({ cols: selected.colSpan + delta.cols, rows: selected.rowSpan + delta.rows });
    if (rect) setZoneRect(selected.id, rect, `zone-${kind}:${selected.id}`);
  };

  /** Mutate the selected zone; keyed edits coalesce per zone. */
  const updateSelected = (fn: (p: Placement) => Placement, key?: string) => {
    if (selected) updatePlacement(selected.id, fn, key && `${selected.id}:${key}`);
  };

  /** The selected panel's widget edits (inspector, canvas keys, palette). */
  const widgetActions = selected?.panel
    ? panelWidgetActions({
        placement: selected,
        update: updateSelected,
        selectedWidgetId,
        onSelectWidget: (id) => selectWidget(selected.id, id),
        widgetClipboard,
        onCopyWidget: setWidgetClipboard,
      })
    : null;

  useStudioShortcuts((action: ShortcutAction) => {
    switch (action.type) {
      case "nudge":
      case "resize":
        return stepSelected(action.type, action);
      case "escape":
        return escape();
      case "palette":
        return setPaletteOpen(true);
      case "cheatsheet":
        return setShortcutsOpen(true);
      default:
        return runCommand(action);
    }
  }, selectedWidget !== null);

  /** Carry out a command palette entry (or a shortcut with the same action). */
  const runCommand = (action: CommandAction) => {
    switch (action.type) {
      case "add-module":
        setShowSources(false);
        return addPlacement(action.id);
      case "add-preset":
        setShowSources(false);
        return addPanelPresetById(action.id);
      case "profile":
        return activateProfile(action.id);
      case "drawer":
        setShowSources(false);
        studioLayout.setCollapsed(false);
        return setDrawer(action.drawer);
      case "layout":
        return studioLayout.setMode(action.mode);
      case "toggle-dock":
        return docked && studioLayout.toggleCollapsed();
      case "sources":
        return setShowSources((v) => !v);
      case "toggle-grid":
        return setShowGrid((s) => !s);
      case "zoom-fit":
        return fitZoom();
      case "zoom-in":
        return zoomStep(1);
      case "zoom-out":
        return zoomStep(-1);
      case "save":
        return handleSave();
      case "export":
        return exportConfigFile(config);
      case "import":
        return importRef.current?.click();
      case "copy-profile":
        copyProfileJson(profile).catch(() => {});
        return;
      case "undo":
        return history.undo();
      case "redo":
        return history.redo();
      case "shortcuts":
        return setShortcutsOpen(true);
      case "select":
        setShowSources(false);
        return focusZone(action.id);
      case "goto-card":
        setInspectorQuery("");
        return jumpInspector(action.id);
      case "goto-setting":
        return setInspectorQuery(action.label);
      case "document-tab":
        setShowSources(false);
        setSelectedId(null);
        // The sheet mounts first; then it scrolls to the card.
        return void requestAnimationFrame(() => jumpInspector(DOCUMENT_CARD[action.tab]));
      case "follow-all":
        return updateProfile(followAll);
      case "toggle-enforce":
        return setConfig((c) => toggleEnforce(c, profile));
      case "apply-appearance": {
        const preset = appearancePresets.presets.find((p) => p.id === action.id);
        return preset && appearancePresets.apply(preset, "all");
      }
    }
    if (!selected) return;
    switch (action.type) {
      case "duplicate":
        return duplicatePlacement(selected.id);
      case "toggle-visible":
        return toggleVisible(selected.id);
      case "remove":
        return removePlacement(selected.id);
      case "pick-widget":
        return setPickerFor(selected.id);
      case "save-panel-preset":
        setShowSources(false);
        setInspectorQuery("");
        jumpInspector("panel");
        return setPresetNaming(true);
      case "select-widget":
        return showWidget(selected.id, action.id);
    }
    if (!widgetActions || !selectedWidget) return;
    const id = selectedWidget.id;
    switch (action.type) {
      case "widget-remove":
        return widgetActions.remove(id);
      case "widget-duplicate":
        return widgetActions.duplicate(id);
      case "widget-copy":
        return widgetActions.copy(id);
      case "widget-paste":
        return widgetActions.paste(id);
      case "widget-move":
        return widgetActions.step(id, action.delta);
    }
  };

  const selectedModule =
    selected && !selected.panel ? modules.find((m) => m.id === selected.module) : undefined;
  /** The global style the zones render under. */
  const appearance = appearanceOf(config, profile);
  const commands = paletteOpen
    ? buildCommands({
        insertables: insertables(config.panelPresets),
        profiles: config.profiles,
        placements: profile.placements,
        selected,
        settings: selectedModule?.settings ?? [],
        widget: selectedWidget,
        canPasteWidget: widgetClipboard !== null,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        showGrid,
        showSources,
        layoutMode: studioLayout.mode,
        enforced: appearance.enforce,
        appearancePresets: appearancePresets.presets,
      })
    : [];

  const inspectorAside = (
        <aside
          ref={inspectorRef}
          className={cn(
            "flex flex-col bg-popover/40",
            docked ? "h-full min-w-0 flex-1 overflow-hidden" : "w-72 shrink-0 overflow-y-auto border-l"
          )}
        >
          <InspectorLayoutProvider value={docked ? "dock" : "side"}>
          {selected ? (
            <ZoneInspector
              placement={selected}
              cols={profile.cols}
              rows={profile.rows}
              appearance={appearance}
              stylePresets={config.stylePresets ?? []}
              jumpTo={inspectorJump}
              styleClipboard={styleClipboard}
              onCopyStyle={setStyleClipboard}
              widgetClipboard={widgetClipboard}
              onCopyWidget={setWidgetClipboard}
              selectedWidgetId={selectedWidgetId}
              onSelectWidget={(id) => selectWidget(selected.id, id)}
              onShowWidget={() => {
                setInspectorQuery("");
                requestAnimationFrame(revealEditor);
              }}
              query={inspectorQuery}
              onQuery={setInspectorQuery}
              onClose={() => setSelectedId(null)}
              update={updateSelected}
              onZoneBox={setZoneBox}
              onPickWidget={() => setPickerFor(selected.id)}
              onUseAsGlobal={(target, style) => setScopeStyle(target, () => style)}
              onSavePreset={(name, settings) =>
                setConfig((c) => ({
                  ...c,
                  stylePresets: [
                    ...(c.stylePresets ?? []),
                    { id: uid("style"), name, settings },
                  ],
                }))
              }
              onDeletePreset={(id) =>
                setConfig((c) => ({
                  ...c,
                  stylePresets: c.stylePresets?.filter((p) => p.id !== id),
                }))
              }
              onToggleVisible={() => toggleVisible(selected.id)}
              onDuplicate={() => duplicatePlacement(selected.id)}
              onRemove={() => removePlacement(selected.id)}
              presetNaming={presetNaming}
              onPresetNaming={setPresetNaming}
              onSavePanelPreset={savePanelAsPreset}
            />
          ) : (
            <DocumentInspector jumpTo={inspectorJump} {...documentProps} />
          )}
          </InspectorLayoutProvider>
        </aside>
  );

  const drawerEl = drawer && (
    <StudioDrawer
      drawer={drawer}
      docked={docked}
      onClose={() => setDrawer(null)}
      insert={{
        placements: profile.placements,
        savedPanels: config.panelPresets,
        onAddModule: addPlacement,
        onAddPreset: addPanelPreset,
        onRenamePreset: renameSavedPanel,
        onDeletePreset: deleteSavedPanel,
      }}
      layers={{
        placements: profile.placements,
        selectedId,
        onSelect: focusZone,
        onToggle: toggleVisible,
        onRemove: removePlacement,
      }}
      profiles={{
        profiles: config.profiles,
        activeProfile: config.activeProfile,
        profile,
        autoProfileId: resolveProfile({ ...config, activeProfile: "auto" }, windowWidth, windowHeight).id,
        onActivate: activateProfile,
        onAddProfile: addProfile,
        onRemoveProfile: removeProfile,
        onProfileChange: (patch) =>
          updateProfile((p) => ({ ...p, ...patch }), `profile:${Object.keys(patch).join()}`),
        onCols: (delta) => updateProfile((p) => actions.changeCols(p, delta)),
        onRows: (delta) => updateProfile((p) => actions.changeRows(p, delta)),
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
          setShowSources(false);
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
      zoom={zoom}
      showGrid={showGrid}
      scrollRef={scrollRef}
      attachScroll={attachScroll}
      selectedId={selectedId}
      onSelect={setSelectedId}
      selectedWidgetId={selectedWidgetId}
      onSelectWidget={showWidget}
      onDrawZone={addDrawnZone}
      onZoneRect={(id, rect) => setZoneRect(id, rect, `zone-drag:${id}`)}
      onPickWidget={pickWidget}
      onAddModule={addPlacement}
      onAddPreset={addPanelPresetById}
      onOpenAdd={() => setDrawer("add")}
      zoneToolbar={
        selected && (
          <ZoneToolbar
            placement={selected}
            widgetLabel={selectedWidget ? widgetName(selectedWidget, catalog) : undefined}
            onPickWidget={() => setPickerFor(selected.id)}
            canResize={(size) => resizeSelected(size) !== null}
            onResize={(size) => {
              const rect = resizeSelected(size);
              if (rect) setZoneRect(selected.id, rect);
            }}
            onToggleVisible={() => toggleVisible(selected.id)}
            onDuplicate={() => duplicatePlacement(selected.id)}
            onRemove={() => removePlacement(selected.id)}
            onStyle={() => jumpInspector("colors")}
            onDeselect={() => setSelectedId(null)}
          />
        )
      }
    />
  );

  const bar = showSources ? null : (
    <ZoomToolbar
      zoom={zoom}
      showGrid={showGrid}
      onToggleGrid={() => setShowGrid((s) => !s)}
      onZoomStep={zoomStep}
      onZoomReset={() => setZoom(1)}
      onFit={fitZoom}
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
        onActivate={activateProfile}
        mode={showSources ? "sources" : "design"}
        onMode={(mode) => setShowSources(mode === "sources")}
        saved={saved}
        onSave={handleSave}
        onExitStudio={onExitStudio}
        onExport={() => exportConfigFile(config)}
        onImport={() => importRef.current?.click()}
        onReset={() => setConfig(defaultConfig())}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onPalette={() => setPaletteOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
      />
      <StudioShell
        layout={studioLayout}
        rail={<LeftRail active={showSources ? "sources" : drawer} onSelect={onRail} />}
        drawer={!showSources && drawer && drawerEl}
        main={mainEl}
        bar={bar}
        inspector={inspectorAside}
      />

      <WidgetPickerDialog
        placement={profile.placements.find((p) => p.id === pickerFor) ?? null}
        placements={profile.placements}
        savedPanels={config.panelPresets}
        onRenamePreset={renameSavedPanel}
        onDeletePreset={deleteSavedPanel}
        onPick={(value) => {
          if (pickerFor) assignWidget(pickerFor, value);
          setPickerFor(null);
        }}
        onClose={() => setPickerFor(null)}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        onRun={(command) => runCommand(command.action)}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <input
        ref={importRef}
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
