import type { PanelDef, Widget, WidgetKind } from "@/lib/panel-model";
import { ChangeKindMenu } from "../widget-kind-menu";
import { KIND_INFO } from "../widget-kinds";
import { DataSection } from "./data-section";
import { DisplaySection } from "./display-section";
import { LayoutSection } from "./layout-section";
import { StyleSection } from "./style-section";

interface WidgetEditorProps {
  widget: Widget;
  panel: PanelDef;
  /** `field`: the edited field (quick edits to one field are one undo step). */
  onChange: (fn: (w: Widget) => Widget, field?: string) => void;
  onChangeKind: (kind: WidgetKind) => void;
}

/** Per-widget settings in Data / Display / Layout / Style sections. */
export function WidgetEditor({ widget, panel, onChange, onChangeKind }: WidgetEditorProps) {
  const set = <K extends keyof Widget>(key: K, value: Widget[K]) =>
    onChange((w) => ({ ...w, [key]: value }), key);
  const props = { widget, panel, set, onChange };
  const { label, icon: Icon } = KIND_INFO[widget.kind];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label} widget
        </div>
        <ChangeKindMenu kind={widget.kind} onChange={onChangeKind} />
      </div>
      <div className="space-y-2">
        <DataSection {...props} />
        <DisplaySection {...props} />
        <LayoutSection {...props} />
        <StyleSection {...props} />
      </div>
    </div>
  );
}
