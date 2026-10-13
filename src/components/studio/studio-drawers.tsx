import type { ComponentProps } from "react";
import { InsertPanel } from "./insert-panel";
import { LeftDrawer, type Drawer } from "./left-rail";
import { LayersPanel } from "./layers-panel";
import { ProfilesPanel } from "./profiles-panel";

interface StudioDrawerProps {
  drawer: Drawer;
  insert: ComponentProps<typeof InsertPanel>;
  layers: ComponentProps<typeof LayersPanel>;
  profiles: ComponentProps<typeof ProfilesPanel>;
}

/** The open left panel (Layers, Add or Profiles), a column beside the rail in either dock position. */
export function StudioDrawer({ drawer, insert, layers, profiles }: StudioDrawerProps) {
  return (
    <LeftDrawer>
      {drawer === "add" && <InsertPanel {...insert} />}
      {drawer === "layers" && <LayersPanel {...layers} />}
      {drawer === "profiles" && <ProfilesPanel {...profiles} />}
    </LeftDrawer>
  );
}
