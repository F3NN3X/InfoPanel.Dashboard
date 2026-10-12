import { Menu } from "@base-ui/react/menu";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { WidgetKind } from "@/lib/panel-model";
import { cn } from "@/lib/utils";
import { FIELD } from "./setting-rows";
import { ITEM, POPUP } from "./style-tools";
import { ALL_KINDS, KIND_INFO } from "./widget-kinds";

/** One menu item per widget kind: icon and name. */
function KindItems({ current, onPick }: { current?: WidgetKind; onPick: (kind: WidgetKind) => void }) {
  return ALL_KINDS.map((kind) => {
    const { label, icon: Icon } = KIND_INFO[kind];
    return (
      <Menu.Item
        key={kind}
        className={cn(ITEM, "justify-start")}
        disabled={kind === current}
        onClick={() => onPick(kind)}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-ui-3" />
        <span className="min-w-0 flex-1">{label}</span>
      </Menu.Item>
    );
  });
}

/** The "+ Add panel widget…" select: one option per widget kind, added after the selected widget. */
export function AddWidgetSelect({ onAdd }: { onAdd: (kind: WidgetKind) => void }) {
  return (
    <select
      value=""
      onChange={(e) => e.target.value && onAdd(e.target.value as WidgetKind)}
      aria-label="Add panel widget"
      title="Add a widget after the selected one"
      className={cn(FIELD, "h-7 w-full bg-ui-hover")}
    >
      <option value="">+ Add panel widget…</option>
      {ALL_KINDS.map((kind) => (
        <option key={kind} value={kind}>
          {KIND_INFO[kind].label} — {KIND_INFO[kind].hint}
        </option>
      ))}
    </select>
  );
}

/** A "Change kind" dropdown (the widget editor's header). */
export function ChangeKindMenu({ kind, onChange }: { kind: WidgetKind; onChange: (kind: WidgetKind) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[11.5px] text-ui-3 hover:bg-ui-hover hover:text-ui-1 data-popup-open:bg-ui-hover data-popup-open:text-ui-1"
        title="Turn this widget into another kind (label, sensor, unit and color stay)"
      >
        Change kind <ChevronDown className="h-3 w-3" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} align="end">
          <Menu.Popup className={POPUP}>
            <KindItems current={kind} onPick={onChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** "Change kind ▸" inside another menu (a layer's "⋯"). */
export function ChangeKindSubmenu({ kind, onChange }: { kind: WidgetKind; onChange: (kind: WidgetKind) => void }) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className={ITEM}>
        Change kind <ChevronRight className="h-3 w-3" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} alignOffset={-4}>
          <Menu.Popup className={POPUP}>
            <KindItems current={kind} onPick={onChange} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
