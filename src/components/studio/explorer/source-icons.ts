import {
  Activity,
  AudioLines,
  Clock,
  Cloud,
  CloudSun,
  CloudUpload,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  ListMusic,
  MemoryStick,
  Monitor,
  Music,
  Network,
  Puzzle,
  SlidersHorizontal,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { DataSource } from "@/lib/data-points";

/** Icons of the known plugins, by plugin id. */
const PLUGIN_ICON: Record<string, LucideIcon> = {
  "audio-level-meter": AudioLines,
  "clock-plugin": Clock,
  "drive-info-plugin": HardDrive,
  "InfoPanel.RTSS": Gauge,
  "media-plugin": Music,
  "network-info-plugin": Network,
  "spotify-plugin": ListMusic,
  "InfoPanel.SteamAPI": Gamepad2,
  "system-info-plugin": Activity,
  "volume-plugin": Volume2,
  "wavelink-plugin": SlidersHorizontal,
  "yr-weather-plugin": CloudSun,
  "weather-plugin": Cloud,
};

/** The tree icon of a source: its plugin's, else its category's. */
export function sourceIcon(source: Pick<DataSource, "id" | "category">): LucideIcon {
  switch (source.category) {
    case "Built-in":
      return Monitor;
    case "Hardware monitors":
      return source.id === "libre" ? MemoryStick : Cpu;
    case "Pushed via API":
      return CloudUpload;
    case "Plugins":
      return PLUGIN_ICON[source.id] ?? Puzzle;
  }
}
