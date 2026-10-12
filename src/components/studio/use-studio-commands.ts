import { modules } from "@/modules";
import { useToast } from "@/components/ui/toast";
import { styleOf } from "@/modules/standard-settings";
import type { DashboardConfig, MonitorProfile } from "@/lib/layout";
import type { HistorySetter } from "@/hooks/use-config-history";
import type { Appearance } from "@/lib/style-resolve";
import { followAll, toggleEnforce } from "./appearance-actions";
import { buildCommands, type CommandAction } from "./commands";
import { copyProfileJson, exportConfigFile } from "./config-file";
import { DOCUMENT_CARD } from "./document-inspector";
import { insertables } from "./insert-panel";
import { panelWidgetActions } from "./panel-widget-actions";
import type { useDocumentProps } from "./use-document-props";
import type { StudioMutations } from "./use-studio-mutations";
import type { StudioSelection } from "./use-studio-selection";
import { useStudioShortcuts, type ShortcutAction } from "./use-studio-shortcuts";
import type { StudioUi } from "./use-studio-ui";

interface CommandDeps {
  config: DashboardConfig;
  profile: MonitorProfile;
  setConfig: HistorySetter;
  history: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
  ui: StudioUi;
  sel: StudioSelection;
  edit: StudioMutations;
  appearance: Appearance;
  appearancePresets: ReturnType<typeof useDocumentProps>["appearancePresets"];
}

/**
 * The studio's keyboard shortcuts and command palette: both run the same
 * actions as the mouse (`runCommand`). Also the palette's command list
 * and `focusZone` (select a zone and scroll it into view).
 */
export function useStudioCommands({
  config,
  profile,
  setConfig,
  history,
  ui,
  sel,
  edit,
  appearance,
  appearancePresets,
}: CommandDeps) {
  const { selected, selectedWidget } = sel;
  const toast = useToast();

  /** Select a zone (Layers drawer, palette) and bring it into view on the canvas. */
  const focusZone = (id: string) => {
    sel.select(id);
    requestAnimationFrame(() =>
      ui.scrollRef.current
        ?.querySelector(`[data-zone-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
    );
  };

  /** Esc: clear the settings search, else step out (widget → zones → none), else close the drawer. */
  const escape = () => {
    if (ui.inspectorQuery !== "") ui.setInspectorQuery("");
    else if (selectedWidget) sel.clearWidget();
    else if (sel.selectedIds.length > 0) sel.select(null);
    else if (!ui.showSources && ui.drawer) ui.setDrawer(null);
  };

  /** The primary panel's widget edits (inspector, canvas keys, palette). */
  const widgetActions = selected?.panel
    ? panelWidgetActions({
        placement: selected,
        update: edit.updateSelected,
        selectedWidgetId: sel.selectedWidgetId,
        onSelectWidget: (id) => sel.selectWidget(selected.id, id),
        widgetClipboard: ui.widgetClipboard,
        onCopyWidget: ui.setWidgetClipboard,
      })
    : null;

  useStudioShortcuts((action: ShortcutAction) => {
    switch (action.type) {
      case "nudge":
        return edit.moveSelection(action);
      case "resize":
        return edit.resizePrimary(action);
      case "escape":
        return escape();
      case "palette":
        return ui.setPaletteOpen(true);
      case "cheatsheet":
        return ui.setShortcutsOpen(true);
      default:
        return runCommand(action);
    }
  }, selectedWidget !== null);

  /** Carry out a command palette entry (or a shortcut with the same action). */
  const runCommand = (action: CommandAction) => {
    switch (action.type) {
      case "add-module":
        ui.setMode("design");
        return edit.addPlacement(action.id);
      case "add-preset":
        ui.setMode("design");
        return edit.addPanelPresetById(action.id);
      case "profile":
        return edit.activateProfile(action.id);
      case "drawer":
        ui.setMode("design");
        ui.studioLayout.setCollapsed(false);
        return ui.setDrawer(action.drawer);
      case "layout":
        return ui.studioLayout.setMode(action.mode);
      case "toggle-dock":
        return ui.docked && ui.studioLayout.toggleCollapsed();
      case "sources":
        return ui.toggleSources();
      case "toggle-grid":
        return ui.setShowGrid((s) => !s);
      case "zoom-fit":
        return ui.fitZoom();
      case "zoom-in":
        return ui.zoomStep(1);
      case "zoom-out":
        return ui.zoomStep(-1);
      case "save":
        return ui.handleSave();
      case "export":
        return exportConfigFile(config);
      case "import":
        return ui.importRef.current?.click();
      case "copy-profile":
        copyProfileJson(profile).catch(() => {});
        return;
      case "undo":
        return history.undo();
      case "redo":
        return history.redo();
      case "shortcuts":
        return ui.setShortcutsOpen(true);
      case "select":
        ui.setMode("design");
        return focusZone(action.id);
      case "select-all":
        return sel.selectAll();
      case "goto-card":
        ui.setInspectorQuery("");
        return ui.jumpInspector(action.id);
      case "goto-setting":
        return ui.setInspectorQuery(action.label);
      case "document-tab":
        ui.setMode("design");
        sel.select(null);
        // The sheet mounts first; then it scrolls to the card.
        return void requestAnimationFrame(() => ui.jumpInspector(DOCUMENT_CARD[action.tab]));
      case "follow-all":
        return edit.updateProfile(followAll);
      case "toggle-enforce":
        return setConfig((c) => toggleEnforce(c, profile));
      case "edit-theme":
        // Deselect: the inspector shows the dashboard, on its Appearance tab.
        ui.setMode("design");
        sel.select(null);
        return ui.openDocumentTab("appearance");
      case "deselect":
        return sel.select(null);
      case "sample-layout":
        return edit.loadSampleLayout();
      case "apply-appearance": {
        const preset = appearancePresets.presets.find((p) => p.id === action.id);
        return preset && appearancePresets.apply(preset, "all");
      }
    }
    if (!selected) return;
    switch (action.type) {
      case "duplicate":
        return edit.duplicateSelection();
      case "toggle-visible":
        return edit.toggleSelectionVisible();
      case "remove":
        return edit.removeSelection();
      case "pick-widget":
        return ui.setPickerFor(selected.id);
      case "edit-style":
        ui.setMode("design");
        ui.setInspectorQuery("");
        ui.jumpInspector("colors");
        return ui.requestInspectorTab("style");
      case "bind-data":
        ui.setMode("design");
        return ui.requestInspectorTab("data", true);
      case "copy-style":
        ui.setStyleClipboard(styleOf(selected.settings));
        return toast("Style copied");
      case "paste-style":
        if (!ui.styleClipboard) return;
        edit.pasteStyleSelection(ui.styleClipboard);
        return toast("Style pasted");
      case "follow-global":
        return edit.followGlobalSelection();
      case "resize-step": {
        const rect = edit.resizeSelected({
          cols: selected.colSpan + action.cols,
          rows: selected.rowSpan + action.rows,
        });
        return rect && edit.setZoneRect(selected.id, rect);
      }
      case "save-panel-preset":
        ui.setMode("design");
        ui.setInspectorQuery("");
        ui.jumpInspector("panel");
        return ui.setPresetNaming(true);
      case "select-widget":
        return sel.selectWidget(selected.id, action.id);
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
  const commands = ui.paletteOpen
    ? buildCommands({
        insertables: insertables(config.panelPresets),
        profiles: config.profiles,
        placements: profile.placements,
        selected,
        selection: sel.selection,
        settings: selectedModule?.settings ?? [],
        widget: selectedWidget,
        canPasteWidget: ui.widgetClipboard !== null,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        showGrid: ui.showGrid,
        showSources: ui.showSources,
        layoutMode: ui.studioLayout.mode,
        enforced: appearance.enforce,
        appearancePresets: appearancePresets.presets,
      })
    : [];

  return { runCommand, commands, focusZone };
}
