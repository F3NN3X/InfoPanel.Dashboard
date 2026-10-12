import type { PanelDef, Widget, WidgetKind } from "@/lib/panel-model";
import type { SheetCard } from "../category-sheet";
import { ChangeKindMenu } from "../widget-kind-menu";
import { KIND_INFO } from "../widget-kinds";
import { DataFields, hasData } from "./data-section";
import { DisplayFields, hasDisplay } from "./display-section";
import { LayoutFields } from "./layout-section";
import { AdvancedFields, ColorFields, hasColor, hasTypography, TypographyFields } from "./style-section";

interface WidgetCardsProps {
  widget: Widget;
  panel: PanelDef;
  /** `field`: the edited field (quick edits to one field are one undo step). */
  onChange: (fn: (w: Widget) => Widget, field?: string) => void;
  onChangeKind: (kind: WidgetKind) => void;
}

/**
 * The selected panel widget's editor as sheet cards, in the zone's own
 * order: the widget and its data, display, size & placement, typography,
 * color, advanced (class names, CSS). Only the cards its kind uses.
 */
export function widgetCards({ widget, panel, onChange, onChangeKind }: WidgetCardsProps): SheetCard[] {
  const set = <K extends keyof Widget>(key: K, value: Widget[K]) =>
    onChange((w) => ({ ...w, [key]: value }), key);
  const props = { widget, panel, set, onChange };
  const { label, icon: Icon } = KIND_INFO[widget.kind];
  const cards: (SheetCard | false)[] = [
    {
      id: "widget:data",
      title: `${label} widget`,
      hint: "What the widget shows",
      actions: <ChangeKindMenu kind={widget.kind} onChange={onChangeKind} />,
      editor: true,
      terms: ["Widget", label, "Label", "Sensor", "Sub sensor", "Static text", "Image URL", "Unit", "Decimals", "Scale", "Max", "Invert fill", "Change"],
      node: hasData(widget) ? (
        <DataFields {...props} />
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> No data: a decorative shape
        </div>
      ),
    },
    hasDisplay(widget) && {
      id: "widget:display",
      title: "Display",
      hint: "How the kind presents its data",
      terms: ["Display", "Shape", "Thickness", "Max height", "Rows", "Columns", "Header", "History samples", "Show", "Text alignment"],
      node: <DisplayFields {...props} />,
    },
    {
      id: "widget:layout",
      title: "Size & placement",
      hint: "Where the widget sits in its panel",
      terms: ["Size", "Placement", "Layout", "Width", "Height", "Align self", "Column span", "Row span", "Band", "Use as panel background"],
      node: <LayoutFields {...props} />,
    },
    hasTypography(widget) && {
      id: "widget:typography",
      title: "Typography",
      terms: ["Typography", "Font size", "Ring size"],
      node: <TypographyFields {...props} />,
    },
    hasColor(widget) && {
      id: "widget:colors",
      title: "Colors",
      terms: ["Colors", "Color"],
      node: <ColorFields {...props} />,
    },
    {
      id: "widget:advanced",
      title: "Advanced",
      hint: "Class names and custom CSS",
      terms: ["Advanced", "Class names", "Custom CSS", "CSS", "hooks"],
      node: <AdvancedFields {...props} />,
    },
  ];
  return cards.filter((c): c is SheetCard => c !== false);
}
