import { useState, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Database, LayoutGrid, Layers, Monitor, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The left drawers; Sources is a canvas mode, not a drawer. */
export type Drawer = "add" | "layers" | "profiles";
export type RailItem = Drawer | "sources";

const RAIL: { id: RailItem; label: string; icon: LucideIcon }[] = [
  { id: "add", label: "Add", icon: Plus },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "profiles", label: "Profiles", icon: Monitor },
  { id: "sources", label: "Sources", icon: Database },
];

export const DRAWER_TITLES: Record<Drawer, string> = {
  add: "Add",
  layers: "Layers",
  profiles: "Profiles",
};

/** localStorage key holding the open drawer ("none" when collapsed). */
const STORAGE_KEY = "studio.drawer";

/** The stored drawer; null = collapsed, anything unknown = Add. */
export function parseDrawer(raw: string | null): Drawer | null {
  if (raw === "none") return null;
  return raw === "layers" || raw === "profiles" ? raw : "add";
}

/** The open drawer, remembered across reloads (localStorage `studio.drawer`). */
export function useStoredDrawer() {
  const [drawer, setDrawer] = useState<Drawer | null>(() => {
    try {
      return parseDrawer(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "add";
    }
  });
  const set = (next: Drawer | null) => {
    setDrawer(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ?? "none");
    } catch {
      // Storage unavailable (private mode, quota): keep the session state.
    }
  };
  return [drawer, set] as const;
}

interface LeftRailProps {
  /** The highlighted item (open drawer or Sources), or null. */
  active: RailItem | null;
  onSelect: (item: RailItem) => void;
}

/** 48px icon rail at the studio's left edge; each icon opens a drawer. */
export function LeftRail({ active, onSelect }: LeftRailProps) {
  return (
    <Tooltip.Provider delay={300}>
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-popover/60 py-2">
        <span className="mb-1 flex h-9 w-9 items-center justify-center" title="Dashboard studio">
          <LayoutGrid className="h-4 w-4" />
        </span>
        {RAIL.map(({ id, label, icon: Icon }) => (
          // Not hoverable: the popup sits over the drawer, and hovering it
          // must not keep it open once the pointer leaves the rail.
          <Tooltip.Root key={id} disableHoverablePopup>
            <Tooltip.Trigger
              aria-label={label}
              aria-pressed={active === id}
              onClick={() => onSelect(id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                active === id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner side="right" sideOffset={8} className="z-50">
                <Tooltip.Popup className="pointer-events-none rounded-md border bg-popover px-2 py-1 text-xs text-foreground shadow-md">
                  {label}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        ))}
      </nav>
    </Tooltip.Provider>
  );
}

/** The drawer next to the rail: a titled, scrolling column. */
export function LeftDrawer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-popover/40">
      <div className="border-b px-3 py-2.5 text-sm font-semibold">{title}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
