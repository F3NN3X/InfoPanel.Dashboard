import {
  Bell,
  Bluetooth,
  Box,
  Cpu,
  FileText,
  Gamepad2,
  Gauge,
  Globe,
  LayoutGrid,
  ListMusic,
  Monitor,
  Music2,
  SlidersHorizontal,
  SunDim,
  ArrowDownUp,
  AudioLines,
  Blocks,
  SquareDashed,
  Bus,
  type LucideIcon,
} from "lucide-react";
import { BLANK_MODULE, CARDS_ID, PANEL_ID } from "@/lib/layout";

/** The icon of each widget; anything unlisted gets a plain box. */
const MODULE_ICONS: Record<string, LucideIcon> = {
  systemmodern: Monitor,
  hardwaremodern: Cpu,
  fpsmodern: Gauge,
  spotifymodern: ListMusic,
  mediamodern: Music2,
  audiomodern: AudioLines,
  wavelinkmodern: SlidersHorizontal,
  steammodern: Gamepad2,
  networkmodern: ArrowDownUp,
  bluetoothmodern: Bluetooth,
  weathermodern: SunDim,
  vbz: Bus,
  notifications: Bell,
  textfile: FileText,
  webpage: Globe,
  streamdeck: LayoutGrid,
  [CARDS_ID]: Blocks,
};

/** A zone's icon in Layers and the library: the widget's own, the panel icon, or the blank icon. */
export function moduleIcon(module: string): LucideIcon {
  if (module === BLANK_MODULE) return SquareDashed;
  if (module === PANEL_ID) return Blocks;
  return MODULE_ICONS[module] ?? Box;
}
