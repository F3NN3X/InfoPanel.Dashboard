import { useState, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Database, Keyboard, Layers, SquarePlus, Monitor, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The left panels; Sources is a canvas mode, not a panel. */
export type Drawer = "add" | "layers" | "profiles";
export type RailItem = Drawer | "sources";

const RAIL: { id: RailItem; label: string; icon: LucideIcon }[] = [
  { id: "layers", label: "Layers", icon: Layers },
  { id: "add", label: "Add", icon: SquarePlus },
  { id: "profiles", label: "Profiles", icon: Monitor },
  { id: "sources", label: "Data sources", icon: Database },
];

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
  /** The keyboard icon at the bottom opens the shortcuts sheet. */
  onShortcuts: () => void;
}

interface RailButtonProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
}

/** One 38×38 rail icon with a tooltip to its right. */
function RailButton({ label, icon: Icon, active, onClick }: RailButtonProps) {
  return (
    // Not hoverable: the popup sits over the panel, and hovering it
    // must not keep it open once the pointer leaves the rail.
    <Tooltip.Root disableHoverablePopup>
      <Tooltip.Trigger
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "flex h-[38px] w-[38px] items-center justify-center rounded-[9px] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60",
          active ? "bg-[#1e1e24] text-ui-1" : "text-ui-4 hover:bg-ui-hover hover:text-ui-2"
        )}
      >
        <Icon className="h-[21px] w-[21px]" strokeWidth={1.5} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="right" sideOffset={8} className="z-50">
          <Tooltip.Popup className="pointer-events-none rounded-md border border-ui-menu bg-ui-raised px-2 py-1 font-ui text-xs text-ui-2 shadow-ui-menu">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** 52px icon rail at the studio's left edge; each icon opens a left panel, Sources the explorer. */
export function LeftRail({ active, onSelect, onShortcuts }: LeftRailProps) {
  return (
    <Tooltip.Provider delay={300}>
      <nav className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-ui-subtle bg-ui-chrome py-2.5">
        {RAIL.map((item) => (
          <RailButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={active === item.id}
            onClick={() => onSelect(item.id)}
          />
        ))}
        <div className="mt-auto">
          <RailButton label="Keyboard shortcuts" icon={Keyboard} onClick={onShortcuts} />
        </div>
      </nav>
    </Tooltip.Provider>
  );
}

/** The 256px left panel next to the rail; the panels bring their own header and scrolling. */
export function LeftDrawer({ children }: { children: ReactNode }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ui-subtle bg-ui-panel font-ui">
      {children}
    </aside>
  );
}
