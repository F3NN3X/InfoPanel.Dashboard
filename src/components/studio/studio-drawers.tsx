import type { ComponentProps } from "react";
import { InsertPanel } from "./insert-panel";
import { LeftDrawer, type Drawer } from "./left-rail";
import { LayersPanel } from "./layers-panel";
import { ProfilesPanel } from "./profiles-panel";
import { AlertsPanel } from "./alerts-panel";
import { IslandPanel } from "./island-panel";

interface StudioDrawerProps {
  drawer: Drawer;
  /** The panel's width, and the commit of a dragged one. */
  width: number;
  onResize: (width: number) => void;
  insert: ComponentProps<typeof InsertPanel>;
  layers: ComponentProps<typeof LayersPanel>;
  profiles: ComponentProps<typeof ProfilesPanel>;
  alerts: ComponentProps<typeof AlertsPanel>;
  island: ComponentProps<typeof IslandPanel>;
}

/** The open left panel (Layers, Add, Profiles, Dynamic Island or Alerts), a column beside the rail in either dock position. */
export function StudioDrawer({ drawer, width, onResize, insert, layers, profiles, alerts, island }: StudioDrawerProps) {
  return (
    <LeftDrawer width={width} onResize={onResize}>
      {drawer === "add" && <InsertPanel {...insert} />}
      {drawer === "layers" && <LayersPanel {...layers} />}
      {drawer === "profiles" && <ProfilesPanel {...profiles} />}
      {drawer === "island" && <IslandPanel {...island} />}
      {drawer === "alerts" && <AlertsPanel {...alerts} />}
    </LeftDrawer>
  );
}
