import { useEffect, useRef, useState } from "react";
import type { DashboardConfig, MonitorProfile, Widget } from "@/lib/layout";
import type { InspectorTab, ModuleSettings } from "@/modules/types";
import { useStoredDrawer, type Drawer, type RailItem } from "./left-rail";
import { revealWidgetEditor, scrollInspectorToTop } from "./inspector-scroll";
import { useCanvasZoom } from "./use-canvas-zoom";
import { useStoredFlag } from "./use-stored-flag";
import type { StudioMode } from "./studio-top-bar";
import { DRAWER_WIDTH, RAIL_WIDTH, pageSize, useStudioLayout } from "./use-studio-layout";

/**
 * The studio's view state, apart from the selection: Design | Sources,
 * the rail drawer, the dock layout and zoom, toggles (grid and rulers are
 * remembered), open dialogs, the
 * inspector's search and jump target, and the session clipboards.
 */
export function useStudioUi(config: DashboardConfig, profile: MonitorProfile, onSave: (config: DashboardConfig) => void) {
  const [mode, setMode] = useState<StudioMode>("design");
  const showSources = mode === "sources";
  const toggleSources = () => setMode((m) => (m === "sources" ? "design" : "sources"));
  const [drawer, setDrawer] = useStoredDrawer();
  const [showGrid, setShowGrid] = useStoredFlag("studio.grid", true);
  const [showRulers, setShowRulers] = useStoredFlag("studio.rulers", true);
  /** The panel the rail last had open, for the zoom bar's left-panel toggle. */
  const lastDrawer = useRef<Drawer>(drawer ?? "add");
  if (drawer) lastDrawer.current = drawer;

  /** A request to scroll the zone inspector to a card (`seq` makes repeats count). */
  const [inspectorJump, setInspectorJump] = useState<{ id: string; seq: number }>();
  const jumpInspector = (id: string) => setInspectorJump((j) => ({ id, seq: (j?.seq ?? 0) + 1 }));
  /**
   * A request to show a zone inspector tab. `picker` also opens the Data tab's bind picker;
   * `seq` makes repeats count.
   */
  const [inspectorRequest, setInspectorRequest] = useState<{
    tab: InspectorTab;
    picker: boolean;
    seq: number;
  }>();
  const requestInspectorTab = (tab: InspectorTab, picker = false) =>
    setInspectorRequest((r) => ({ tab, picker, seq: (r?.seq ?? 0) + 1 }));
  /** A request for a Dashboard inspector tab (`seq` makes repeats count): the inspector shows it while nothing is selected. */
  const [documentTabRequest, setDocumentTabRequest] = useState<{ tab: string; seq: number }>();
  const openDocumentTab = (tab: string) => setDocumentTabRequest((r) => ({ tab, seq: (r?.seq ?? 0) + 1 }));
  /** The zone inspector's settings search ("Go to setting" fills it). */
  const [inspectorQuery, setInspectorQuery] = useState("");
  const inspectorRef = useRef<HTMLElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /** The zone the widget picker dialog is open for. */
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  /** The panel inspector's "Save as panel preset" name input is open. */
  const [presetNaming, setPresetNaming] = useState(false);

  /** The style copied with "Copy" in the inspector (session only). */
  const [styleClipboard, setStyleClipboard] = useState<ModuleSettings | null>(null);
  /** The panel widget copied with "Copy" in the layers list (session only). */
  const [widgetClipboard, setWidgetClipboard] = useState<Widget | null>(null);

  const page = pageSize(profile);
  const zoom = useCanvasZoom(page);
  const studioLayout = useStudioLayout({
    page,
    rail: RAIL_WIDTH,
    drawer: !showSources && drawer ? DRAWER_WIDTH : 0,
    design: { width: profile.width, height: profile.height },
    forceSide: showSources,
  });
  const docked = studioLayout.layout.placement === "bottom";

  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSave = () => {
    onSave(config);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  /**
   * Rail click: Sources toggles the full-width sources mode (the panel
   * stays remembered underneath); a panel icon opens that panel, or
   * collapses it when it is already open.
   */
  const onRail = (item: RailItem) => {
    if (item === "sources") {
      toggleSources();
      return;
    }
    if (showSources) {
      setMode("design");
      setDrawer(item);
      return;
    }
    setDrawer(drawer === item ? null : item);
  };

  /** The zoom bar's left-panel toggle: close the panel, or reopen the last one. */
  const toggleLeft = () => {
    if (showSources) setMode("design");
    setDrawer(drawer && !showSources ? null : lastDrawer.current);
  };

  const revealEditor = () => revealWidgetEditor(inspectorRef.current);

  return {
    mode,
    setMode,
    showSources,
    toggleSources,
    drawer,
    setDrawer,
    onRail,
    toggleLeft,
    showGrid,
    setShowGrid,
    showRulers,
    setShowRulers,
    documentTabRequest,
    openDocumentTab,
    inspectorJump,
    jumpInspector,
    inspectorRequest,
    requestInspectorTab,
    inspectorQuery,
    setInspectorQuery,
    inspectorRef,
    importRef,
    revealEditor,
    pickerFor,
    setPickerFor,
    paletteOpen,
    setPaletteOpen,
    shortcutsOpen,
    setShortcutsOpen,
    presetNaming,
    setPresetNaming,
    styleClipboard,
    setStyleClipboard,
    widgetClipboard,
    setWidgetClipboard,
    ...zoom,
    studioLayout,
    docked,
    saved,
    handleSave,
  };
}

export type StudioUi = ReturnType<typeof useStudioUi>;

/**
 * The inspector follows the selection: a new primary zone starts it at
 * the top (no preset name input) and brings a collapsed dock back; a
 * newly selected panel widget brings its editor into view.
 */
export function useInspectorFollowsSelection(
  ui: StudioUi,
  primaryId: string | null,
  selectedWidgetId: string | null
) {
  useEffect(() => {
    scrollInspectorToTop(ui.inspectorRef.current);
    ui.setPresetNaming(false);
  }, [primaryId]);

  useEffect(() => {
    if (primaryId !== null && ui.studioLayout.collapsed) ui.studioLayout.setCollapsed(false);
  }, [primaryId]);

  useEffect(() => {
    if (selectedWidgetId !== null) ui.revealEditor();
  }, [selectedWidgetId]);
}
