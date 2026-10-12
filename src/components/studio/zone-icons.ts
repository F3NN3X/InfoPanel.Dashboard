import {
  Activity,
  Bell,
  Bluetooth,
  Box,
  Cloud,
  Cpu,
  FileText,
  Gamepad2,
  Gauge,
  Globe,
  Headphones,
  LayoutGrid,
  Music,
  PanelsTopLeft,
  Play,
  SquareDashed,
  Train,
  Volume2,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { BLANK_MODULE, CARDS_ID, PANEL_ID } from "@/lib/layout";

/** The icon of each widget; anything unlisted gets a plain box. */
const MODULE_ICONS: Record<string, LucideIcon> = {
  systemmodern: Cpu,
  hardwaremodern: Gauge,
  fpsmodern: Activity,
  spotifymodern: Music,
  mediamodern: Play,
  audiomodern: Volume2,
  wavelinkmodern: Headphones,
  steammodern: Gamepad2,
  networkmodern: Wifi,
  bluetoothmodern: Bluetooth,
  weathermodern: Cloud,
  vbz: Train,
  notifications: Bell,
  textfile: FileText,
  webpage: Globe,
  streamdeck: LayoutGrid,
  [CARDS_ID]: LayoutGrid,
};

/** A zone's icon in Layers and the library: the widget's own, the panel icon, or the blank icon. */
export function moduleIcon(module: string): LucideIcon {
  if (module === BLANK_MODULE) return SquareDashed;
  if (module === PANEL_ID) return PanelsTopLeft;
  return MODULE_ICONS[module] ?? Box;
}
