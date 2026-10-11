import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { newWidget, type PanelDef, type Placement, type Widget, type WidgetKind } from "@/lib/layout";
import { panelSettings, withPanelField } from "@/lib/panel-model";
import { PanelCodeView } from "./panel-code-view";
import { PanelLayers } from "./panel-layers";
import { PanelLayoutSection } from "./panel-layout-section";
import { PanelMenu, PresetNameInput } from "./panel-preset-tools";
import { panelWidgetActions } from "./panel-widget-actions";
import { WidgetEditor } from "./widget-editor";
import { ColorInput, Field, INPUT, Switch } from "./widget-editor/fields";
import { AddWidgetMenu } from "./widget-kind-menu";

/* ------------------------------------------------------------------ *
 * Panel inspector — panel header, layout, widget layers and the
 * per-widget editor (or the whole panel as JSON in the Code view).
 * ------------------------------------------------------------------ */

interface PanelInspectorProps {
  placement: Placement;
  /**
   * Mutate the placement (panel def lives on it). Field edits pass a key
   * (`panel:<field>`, `panel-widget:<id>:<field>`) so quick edits to one
   * field coalesce into one undo step; structural edits pass none.
   */
  update: (fn: (p: Placement) => Placement, key?: string) => void;
  /** The selected widget (kept by the studio: the canvas selects too). */
  selectedWidgetId: string | null;
  onSelectWidget: (id: string | null) => void;
  /** The widget copied with "Copy" (session only, shared across panels). */
  widgetClipboard: Widget | null;
  onCopyWidget: (widget: Widget) => void;
  /** The "Save as panel preset" name input is open (kept by the studio: the palette opens it). */
  presetNaming: boolean;
  onPresetNaming: (open: boolean) => void;
  /** Save this panel zone to My panels under a name. */
  onSavePreset: (name: string) => void;
}

const HEADING = "text-xs font-medium uppercase tracking-wider text-muted-foreground";

export function PanelInspector({
  placement,
  update,
  selectedWidgetId,
  onSelectWidget,
  widgetClipboard,
  onCopyWidget,
  presetNaming,
  onPresetNaming,
  onSavePreset,
}: PanelInspectorProps) {
  const panel = placement.panel!;
  const [view, setView] = useState<"visual" | "code">("visual");
  const selectedWidget = panel.widgets.find((w) => w.id === selectedWidgetId) ?? null;
  const actions = panelWidgetActions({
    placement,
    update,
    selectedWidgetId,
    onSelectWidget,
    widgetClipboard,
    onCopyWidget,
  });
  const { updatePanel, updateWidget } = actions;

  // The legacy title / accent / background as the panel shows them.
  const look = panelSettings(placement) ?? {};
  const titleShown = String(look.label ?? "") !== "";
  const accent = look.accent ? String(look.accent) : undefined;

  const setPanelField = <K extends keyof PanelDef>(key: K, value: PanelDef[K]) =>
    updatePanel((p) => ({ ...p, [key]: value }), `panel:${key}`);

  /** A look field: also written to the matching setting (see `withPanelField`). */
  const setLookField = <K extends "title" | "titleVisible" | "accent" | "background">(key: K, value: PanelDef[K]) =>
    update((p) => withPanelField(p, key, value), `panel:${key}`);

  /** Code view Apply: a changed title also updates the shown one (`withPanelField`). */
  const applyCode = (next: PanelDef) =>
    update((p) => {
      const replaced = { ...p, panel: next };
      return next.title === p.panel!.title ? replaced : withPanelField(replaced, "title", next.title);
    });

  return (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className={HEADING}>Panel</div>
          <div className="flex items-center gap-1">
            <Segmented
              options={[
                { value: "visual", label: "Visual" },
                { value: "code", label: "Code", title: "Edit the panel as JSON" },
              ]}
              value={view}
              onChange={setView}
            />
            <PanelMenu onSavePreset={() => onPresetNaming(true)} />
          </div>
        </div>
        <div className="space-y-3">
          {presetNaming && (
            <PresetNameInput initial={panel.title} onSave={onSavePreset} onCancel={() => onPresetNaming(false)} />
          )}
          <Field label="Title">
            <input
              value={panel.title}
              onChange={(e) => setLookField("title", e.target.value)}
              className={INPUT}
            />
          </Field>
          <Switch label="Show title" on={titleShown} onChange={(on) => setLookField("titleVisible", on)} />
          <Field label="Background">
            <Segmented
              options={[
                { value: "none", label: "None" },
                { value: "panel", label: "Panel" },
                { value: "bordered", label: "Bordered" },
              ]}
              value={String(look.surface ?? panel.background)}
              onChange={(v) => setLookField("background", v as PanelDef["background"])}
            />
          </Field>
          <ColorInput label="Accent" value={accent} onChange={(v) => setLookField("accent", v)} />
          {view === "visual" && <PanelLayoutSection panel={panel} setField={setPanelField} updatePanel={updatePanel} />}
        </div>
      </div>

      {view === "code" ? (
        <PanelCodeView panel={panel} onApply={applyCode} />
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className={HEADING}>
                Widgets <span className="normal-case text-muted-foreground/60">({panel.widgets.length})</span>
              </div>
              <AddWidgetMenu onAdd={(kind: WidgetKind) => actions.insert(newWidget(kind))} />
            </div>
            <PanelLayers
              widgets={panel.widgets}
              selectedId={selectedWidgetId}
              onSelect={onSelectWidget}
              onToggleVisible={(id) => updateWidget(id, (w) => ({ ...w, visible: !w.visible }))}
              onMove={actions.move}
              onDuplicate={actions.duplicate}
              onCopy={actions.copy}
              onPasteAfter={widgetClipboard ? actions.paste : undefined}
              onChangeKind={actions.changeKind}
              onRemove={actions.remove}
            />
          </div>

          {selectedWidget && (
            // The studio scrolls this into view when a widget gets selected.
            <div data-widget-editor>
              <WidgetEditor
                widget={selectedWidget}
                panel={panel}
                onChange={(fn, field) => updateWidget(selectedWidget.id, fn, field)}
                onChangeKind={(kind) => actions.changeKind(selectedWidget.id, kind)}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
