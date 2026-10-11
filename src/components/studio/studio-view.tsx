import {
  useEffect,
  useRef,
  useState,
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
} from "@/lib/layout";
import { panelPresets, type PanelPreset } from "@/lib/panelPresets";
import { THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import * as actions from "./studio-actions";
import { CommandPalette } from "./command-palette";
import { buildCommands, type CommandAction } from "./commands";
import { copyProfileJson, exportConfigFile, importConfigFile } from "./config-file";
import { DocumentInspector, type DocumentTab } from "./document-inspector";
import { StudioCanvas } from "./studio-canvas";
import { StudioTopBar } from "./studio-top-bar";
import { INSERTABLES, InsertPanel } from "./insert-panel";
import { LayersPanel } from "./layers-panel";
import { DRAWER_TITLES, LeftDrawer, LeftRail, useStoredDrawer, type RailItem } from "./left-rail";
import { ProfilesPanel } from "./profiles-panel";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { moduleMinSize } from "./studio-modules";
import { useCanvasZoom } from "./use-canvas-zoom";
import { useStudioShortcuts, type ShortcutAction } from "./use-studio-shortcuts";
import { fitZoneRect, nudgeZone, resizeZone, type ZoneRect } from "./zone-geometry";
import { ZoneInspector, type InspectorTab } from "./zone-inspector";
import { ZoneToolbar } from "./zone-toolbar";
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
  /** The zone inspector's open tab, kept across selections. */
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  /** The zone inspector's settings search ("Go to setting" fills it). */
  const [inspectorQuery, setInspectorQuery] = useState("");
  /** The document inspector's open tab (nothing selected). */
  const [documentTab, setDocumentTab] = useState<DocumentTab>("theme");
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
  const { zoom, setZoom, zoomStep, fitZoom, scrollRef, attachScroll } =
    useCanvasZoom(profile.width);

  const handleSave = () => {
    onSave(config);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  // Deselect when switching profiles.
  useEffect(() => setSelectedId(null), [profile.id]);

  // A new selection starts the inspector at the top.
  useEffect(() => {
    inspectorRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);

  const selected = profile.placements.find((p) => p.id === selectedId) ?? null;

  // An undo/redo (or any edit) can remove the selected zone: deselect.
  useEffect(() => {
    if (selectedId !== null && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  /** The style copied with "Copy" in the inspector (session only). */
  const [styleClipboard, setStyleClipboard] = useState<ModuleSettings | null>(null);

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
      setDrawer(item);
      return;
    }
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
      const preset = panelPresets.find(
        (x) => x.id === value.slice("preset:".length)
      );
      if (preset) updateProfile((p) => actions.assignPreset(p, id, preset));
    }
  };

  /** Open the widget picker for a zone (selecting it). */
  const pickWidget = (id: string) => {
    setSelectedId(id);
    setPickerFor(id);
  };

  const setProfileStyle = (fn: (style: ModuleSettings) => ModuleSettings) =>
    updateProfile((p) => actions.setProfileStyle(p, fn), "profile-style");

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

  const applyPreset = (name: string) => {
    const preset = THEME_PRESETS.find((p) => p.name === name);
    if (preset) setConfig((c) => ({ ...c, theme: { ...preset.tokens } }));
  };

  /* ---------------- keyboard shortcuts + command palette ---------------- */

  /** Esc: clear the settings search, else deselect, else close the drawer. */
  const escape = () => {
    if (inspectorQuery !== "") setInspectorQuery("");
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
  });

  /** Carry out a command palette entry (or a shortcut with the same action). */
  const runCommand = (action: CommandAction) => {
    switch (action.type) {
      case "add-module":
        setShowSources(false);
        return addPlacement(action.id);
      case "add-preset": {
        const preset = panelPresets.find((p) => p.id === action.id);
        setShowSources(false);
        if (preset) addPanelPreset(preset);
        return;
      }
      case "profile":
        return activateProfile(action.id);
      case "drawer":
        setShowSources(false);
        return setDrawer(action.drawer);
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
      case "tab":
        setInspectorQuery("");
        return setInspectorTab(action.tab);
      case "goto-setting":
        setInspectorTab(action.tab);
        return setInspectorQuery(action.label);
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
    }
  };

  const selectedModule =
    selected && !selected.panel ? modules.find((m) => m.id === selected.module) : undefined;
  const commands = paletteOpen
    ? buildCommands({
        insertables: INSERTABLES,
        profiles: config.profiles,
        placements: profile.placements,
        selected,
        settings: selectedModule?.settings ?? [],
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        showGrid,
        showSources,
      })
    : [];

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
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <LeftRail active={showSources ? "sources" : drawer} onSelect={onRail} />
        {!showSources && drawer && (
          <LeftDrawer title={DRAWER_TITLES[drawer]}>
            {drawer === "add" && (
              <InsertPanel
                placements={profile.placements}
                onAddModule={addPlacement}
                onAddPreset={addPanelPreset}
              />
            )}
            {drawer === "layers" && (
              <LayersPanel
                placements={profile.placements}
                selectedId={selectedId}
                onSelect={focusZone}
                onToggle={toggleVisible}
                onRemove={removePlacement}
              />
            )}
            {drawer === "profiles" && (
              <ProfilesPanel
                profiles={config.profiles}
                activeProfile={config.activeProfile}
                profile={profile}
                autoProfileId={
                  resolveProfile({ ...config, activeProfile: "auto" }, windowWidth, windowHeight).id
                }
                onActivate={activateProfile}
                onAddProfile={addProfile}
                onRemoveProfile={removeProfile}
                onProfileChange={(patch) =>
                  updateProfile((p) => ({ ...p, ...patch }), `profile:${Object.keys(patch).join()}`)
                }
                onCols={(delta) => updateProfile((p) => actions.changeCols(p, delta))}
                onRows={(delta) => updateProfile((p) => actions.changeRows(p, delta))}
              />
            )}
          </LeftDrawer>
        )}

        <main className="flex min-w-[420px] flex-1 flex-col">

          {showSources ? (
            <div className="min-h-0 flex-1 overflow-hidden bg-background/40">
              <SourcesPanel
                sourcePrefs={config.sourcePrefs}
                onPrefsChange={(key, pref) =>
                  setConfig(
                    (c) => ({
                      ...c,
                      sourcePrefs: {
                        ...c.sourcePrefs,
                        [key]: { ...c.sourcePrefs?.[key], ...pref },
                      },
                    }),
                    `source-pref:${key}`
                  )
                }
                placements={profile.placements}
                onBind={(placementId, container) =>
                  updatePlacement(placementId, (p) => ({
                    ...p,
                    settings: { ...p.settings, source: container },
                  }))
                }
                onUnbind={(placementId) =>
                  updatePlacement(placementId, (p) => {
                    const settings = { ...p.settings };
                    delete settings.source;
                    return { ...p, settings };
                  })
                }
              />
            </div>
          ) : (
            <StudioCanvas
              profile={profile}
              zoom={zoom}
              showGrid={showGrid}
              scrollRef={scrollRef}
              attachScroll={attachScroll}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDrawZone={addDrawnZone}
              onZoneRect={(id, rect) => setZoneRect(id, rect, `zone-drag:${id}`)}
              onPickWidget={pickWidget}
              onAddModule={addPlacement}
              onAddPreset={addPanelPreset}
              onOpenAdd={() => setDrawer("add")}
              zoneToolbar={
                selected && (
                  <ZoneToolbar
                    placement={selected}
                    onPickWidget={() => setPickerFor(selected.id)}
                    canResize={(size) => resizeSelected(size) !== null}
                    onResize={(size) => {
                      const rect = resizeSelected(size);
                      if (rect) setZoneRect(selected.id, rect);
                    }}
                    onToggleVisible={() => toggleVisible(selected.id)}
                    onDuplicate={() => duplicatePlacement(selected.id)}
                    onRemove={() => removePlacement(selected.id)}
                    onStyle={() => setInspectorTab("style")}
                  />
                )
              }
              overlay={
                <ZoomToolbar
                  zoom={zoom}
                  showGrid={showGrid}
                  onToggleGrid={() => setShowGrid((s) => !s)}
                  onZoomStep={zoomStep}
                  onZoomReset={() => setZoom(1)}
                  onFit={fitZoom}
                  profile={profile}
                />
              }
            />
          )}
        </main>

        <aside
          ref={inspectorRef}
          className="flex w-72 shrink-0 flex-col overflow-y-auto border-l bg-popover/40"
        >
          {selected ? (
            <ZoneInspector
              placement={selected}
              cols={profile.cols}
              rows={profile.rows}
              profileStyle={profile.style}
              themeAccent={config.theme.accent}
              stylePresets={config.stylePresets ?? []}
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              styleClipboard={styleClipboard}
              onCopyStyle={setStyleClipboard}
              query={inspectorQuery}
              onQuery={setInspectorQuery}
              onClose={() => setSelectedId(null)}
              update={(fn, key) =>
                updatePlacement(selected.id, fn, key && `${selected.id}:${key}`)
              }
              onZoneBox={setZoneBox}
              onPickWidget={() => setPickerFor(selected.id)}
              onUseForProfile={(style) => setProfileStyle(() => style)}
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
            />
          ) : (
            <DocumentInspector
              tab={documentTab}
              onTabChange={setDocumentTab}
              theme={config.theme}
              radius={config.radius}
              onToken={(key, value) =>
                setConfig(
                  (c) => ({ ...c, theme: { ...c.theme, [key]: value } as ThemeTokens }),
                  `theme:${key}`
                )
              }
              onRadius={(radius) => setConfig((c) => ({ ...c, radius }), "radius")}
              onThemePreset={applyPreset}
              profileStyle={profile.style}
              onProfileStyle={setProfileStyle}
              dataApiUrl={config.dataApiUrl}
              onDataApiUrl={(dataApiUrl) =>
                setConfig((c) => ({ ...c, dataApiUrl }), "data-api-url")
              }
            />
          )}
        </aside>
      </div>

      <WidgetPickerDialog
        placement={profile.placements.find((p) => p.id === pickerFor) ?? null}
        placements={profile.placements}
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
