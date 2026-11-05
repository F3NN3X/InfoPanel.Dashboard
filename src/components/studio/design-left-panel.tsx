import { lazy, Suspense, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Layers, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tabs } from "@/components/ui/tabs";
import { LEFT_STRIP_PX } from "./add-prefs";
import type { AddPanel as AddPanelView } from "./add-panel";
import type { LayersHost } from "./layers-tree";
import { isTyping } from "./use-studio-shortcuts";

// Their own chunks, so the studio's first download stays within its budget.
const LayersTree = lazy(() => import("./layers-tree").then((m) => ({ default: m.LayersTree })));
const AddPanel = lazy(() => import("./add-panel").then((m) => ({ default: m.AddPanel })));

/** The left panel's tabs: Layers or the Add panel. */
export type LeftTab = "layers" | "add";

interface DesignLeftPanelProps {
  tab: LeftTab;
  onTab: (tab: LeftTab) => void;
  /** The panel's width (Settings › Studio › Panels › Left panel width). */
  width: number;
  /** Close it to its strip. */
  onCollapse?: () => void;
  layers: LayersHost;
  add: ComponentProps<typeof AddPanelView>;
}

/** "/" pressed while Layers showed (Edit v3 SPEC §14): the Add panel takes its search once it mounts. */
let searchWanted = false;
/** Whether "/" asked for Add's search; asking clears it. */
export function takeSearchRequest(): boolean {
  const wanted = searchWanted;
  searchWanted = false;
  return wanted;
}

/** The left panel's frame: the Layers | Add tabs over the tab's body. A grid page's and a Free page's share it. */
export function LeftPanelFrame({ tab, onTab, width, onCollapse, children }: Pick<DesignLeftPanelProps, "tab" | "onTab" | "width" | "onCollapse"> & { children: ReactNode }) {
  // "/" anywhere in Edit opens Add with its search focused; on the Add tab the panel's own key does it.
  const latest = useRef({ tab, onTab });
  latest.current = { tab, onTab };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || latest.current.tab === "add" || isTyping(e.target as Element | null) || document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      searchWanted = true;
      latest.current.onTab("add");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <aside className="relative flex shrink-0 flex-col border-r border-ui-subtle bg-ui-panel font-ui" style={{ width }}>
      <div className="flex shrink-0 items-end justify-between border-b border-ui-subtle px-4 pt-1.5">
        <Tabs
          label="Left panel"
          className="border-b-0 [&>button]:h-10"
          value={tab}
          onChange={onTab}
          tabs={[
            { value: "layers", label: "Layers" },
            { value: "add", label: "Add" },
          ]}
        />
        {onCollapse && (
          <IconButton label="Hide the left panel" className="mb-1.5" onClick={onCollapse}>
            <PanelLeftClose className="h-4 w-4" />
          </IconButton>
        )}
      </div>
      {children}
    </aside>
  );
}

/** The closed left panel (52 px, B6): open it, or open it on Layers or Add. */
export function LeftPanelStrip({ onOpen, onToggle }: { onOpen: (tab: LeftTab) => void; onToggle: () => void }) {
  return (
    <aside aria-label="Left panel" className="flex shrink-0 flex-col items-center gap-1 border-r border-ui-subtle bg-ui-panel pt-3 font-ui" style={{ width: LEFT_STRIP_PX }}>
      <IconButton label="Show the left panel" size={32} onClick={onToggle}>
        <PanelLeftOpen className="h-4 w-4" />
      </IconButton>
      <IconButton label="Layers" size={32} onClick={() => onOpen("layers")}>
        <Layers className="h-4 w-4" />
      </IconButton>
      <IconButton label="Add" size={32} onClick={() => onOpen("add")}>
        <Plus className="h-4 w-4" />
      </IconButton>
    </aside>
  );
}

/** Edit's left panel on a grid page (SPEC §6.1): Layers | Add, beside the rail. */
export function DesignLeftPanel({ tab, onTab, width, onCollapse, layers, add }: DesignLeftPanelProps) {
  return (
    <LeftPanelFrame tab={tab} onTab={onTab} width={width} onCollapse={onCollapse}>
      {tab === "layers" ? (
        <Suspense fallback={<div className="flex-1" />}>
          <LayersTree host={layers} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="flex-1" />}>
          <AddPanel {...add} />
        </Suspense>
      )}
    </LeftPanelFrame>
  );
}
