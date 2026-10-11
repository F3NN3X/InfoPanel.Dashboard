import { Menu } from "@base-ui/react/menu";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { WidgetKind } from "@/lib/panel-model";
import { cn } from "@/lib/utils";
import { ITEM, POPUP } from "./style-tools";
import { ALL_KINDS, KIND_INFO } from "./widget-kinds";

/** One menu item per widget kind: icon, name and (optionally) a one-line description. */
function KindItems({
  current,
  described,
  onPick,
}: {
  current?: WidgetKind;
  described?: boolean;
  onPick: (kind: WidgetKind) => void;
}) {
  return ALL_KINDS.map((kind) => {
    const { label, icon: Icon, hint } = KIND_INFO[kind];
    return (
      <Menu.Item
        key={kind}
        className={cn(ITEM, "justify-start")}
        disabled={kind === current}
        onClick={() => onPick(kind)}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block">{label}</span>
          {described && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
        </span>
      </Menu.Item>
    );
  });
}

/** The "Add widget" button: a menu of kinds with a description each. */
export function AddWidgetMenu({ onAdd }: { onAdd: (kind: WidgetKind) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground data-popup-open:bg-accent/40 data-popup-open:text-foreground"
        title="Add a widget after the selected one"
      >
        <Plus className="h-3 w-3" /> Add widget
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} align="end">
          <Menu.Popup className={cn(POPUP, "min-w-52")}>
            <KindItems described onPick={onAdd} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** A "Change kind" dropdown (the widget editor's header). */
export function ChangeKindMenu({ kind, onChange }: { kind: WidgetKind; onChange: (kind: WidgetKind) => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground data-popup-open:text-foreground"
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
