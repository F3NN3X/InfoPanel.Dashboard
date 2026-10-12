import type { DashboardConfig, MonitorProfile } from "@/lib/layout";
import type { Appearance } from "@/lib/style-resolve";
import { cn } from "@/lib/utils";
import { DocumentInspector } from "./document-inspector";
import { InspectorLayoutProvider } from "./inspector-layout";
import type { useDocumentProps } from "./use-document-props";
import type { StudioMutations } from "./use-studio-mutations";
import type { StudioSelection } from "./use-studio-selection";
import type { StudioUi } from "./use-studio-ui";
import { ZoneInspector } from "./zone-inspector";

type DocumentState = ReturnType<typeof useDocumentProps>;

interface StudioInspectorProps {
  config: DashboardConfig;
  profile: MonitorProfile;
  /** The global style the zones render under. */
  appearance: Appearance;
  ui: StudioUi;
  sel: StudioSelection;
  edit: StudioMutations;
  documentProps: DocumentState["props"];
  setScopeStyle: DocumentState["setScopeStyle"];
}

/**
 * The right (or docked) panel: the primary zone's inspector — with a note
 * when several zones are selected — or, with nothing selected, the
 * document inspector (appearance, background, general, connection).
 */
export function StudioInspector({
  config,
  profile,
  appearance,
  ui,
  sel,
  edit,
  documentProps,
  setScopeStyle,
}: StudioInspectorProps) {
  const { selected, selectedWidgetId } = sel;
  const { docked } = ui;
  return (
    <aside
      ref={ui.inspectorRef}
      className={cn(
        "flex flex-col bg-popover/40",
        docked ? "h-full min-w-0 flex-1 overflow-hidden" : "w-72 shrink-0 overflow-y-auto border-l"
      )}
    >
      <InspectorLayoutProvider value={docked ? "dock" : "side"}>
        {sel.selection.length > 1 && (
          <p className="shrink-0 border-b px-3 py-1.5 text-xs text-muted-foreground">
            {sel.selection.length} zones selected
          </p>
        )}
        {selected ? (
          <ZoneInspector
            placement={selected}
            cols={profile.cols}
            rows={profile.rows}
            appearance={appearance}
            stylePresets={config.stylePresets ?? []}
            jumpTo={ui.inspectorJump}
            styleClipboard={ui.styleClipboard}
            onCopyStyle={ui.setStyleClipboard}
            widgetClipboard={ui.widgetClipboard}
            onCopyWidget={ui.setWidgetClipboard}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={(id) => sel.selectWidget(selected.id, id)}
            onShowWidget={() => {
              ui.setInspectorQuery("");
              requestAnimationFrame(ui.revealEditor);
            }}
            query={ui.inspectorQuery}
            onQuery={ui.setInspectorQuery}
            onClose={() => sel.select(null)}
            update={edit.updateSelected}
            onZoneBox={edit.setZoneBox}
            onPickWidget={() => ui.setPickerFor(selected.id)}
            onUseAsGlobal={(target, style) => setScopeStyle(target, () => style)}
            onSavePreset={edit.saveStylePreset}
            onDeletePreset={edit.deleteStylePreset}
            onToggleVisible={() => edit.toggleVisible(selected.id)}
            onDuplicate={() => edit.duplicateZones([selected.id])}
            onRemove={() => edit.removePlacement(selected.id)}
            presetNaming={ui.presetNaming}
            onPresetNaming={ui.setPresetNaming}
            onSavePanelPreset={edit.savePanelAsPreset}
          />
        ) : (
          <DocumentInspector jumpTo={ui.inspectorJump} {...documentProps} />
        )}
      </InspectorLayoutProvider>
    </aside>
  );
}
