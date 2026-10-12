import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { InspectorLayoutProvider } from "./inspector-layout";
import { InsertPanel } from "./insert-panel";
import { DRAWER_TITLES, LeftDrawer, type Drawer } from "./left-rail";
import { LayersPanel } from "./layers-panel";
import { ProfilesPanel } from "./profiles-panel";

interface StudioDrawerProps {
  drawer: Drawer;
  /** In the bottom dock (its first column) instead of beside the rail. */
  docked: boolean;
  onClose: () => void;
  insert: ComponentProps<typeof InsertPanel>;
  layers: ComponentProps<typeof LayersPanel>;
  profiles: ComponentProps<typeof ProfilesPanel>;
}

/**
 * The open rail drawer (Add, Layers or Profiles): a column beside the rail,
 * or, with the inspector in the bottom dock, the dock's first column with
 * its own title row and close button.
 */
export function StudioDrawer({ drawer, docked, onClose, insert, layers, profiles }: StudioDrawerProps) {
  const body = (
    <>
      {drawer === "add" && <InsertPanel {...insert} />}
      {drawer === "layers" && <LayersPanel {...layers} />}
      {drawer === "profiles" && <ProfilesPanel {...profiles} />}
    </>
  );
  if (!docked) return <LeftDrawer title={DRAWER_TITLES[drawer]}>{body}</LeftDrawer>;
  return (
    <InspectorLayoutProvider value="dock">
      <aside className="flex h-full w-96 shrink-0 flex-col border-r bg-popover/40">
        <div className="flex shrink-0 items-center justify-between border-b py-1.5 pl-3 pr-2 text-sm font-semibold">
          {DRAWER_TITLES[drawer]}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      </aside>
    </InspectorLayoutProvider>
  );
}
