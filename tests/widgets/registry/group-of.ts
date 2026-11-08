import { modules } from "@/modules";
import type { DashboardModule } from "@/modules/types";
import { FOLDER_WIDGETS } from "@/widgets/registry.generated";

/**
 * The registry's modules with these ids, in the registry's order: a group's widgets wherever they now live (its group
 * file or their own folder, `src/widgets/<kebab-id>/`), so a group test outlives the widgets moving out of the group.
 */
export const groupOf = (ids: readonly string[]): DashboardModule[] => modules.filter((m) => ids.includes(m.id));

/** The ids of each former registry group, in the registry's order. */
export const GROUP_A_IDS = ["SystemOverview", "MenuBar", "KpiTiles", "StatusTracker", "SystemStatus", "Vitals", "ServiceHealth", "ProcessList", "Uptime", "CpuMonitor", "CoreHeatmap", "GpuRings", "GpuMonitor", "MemoryUsage", "Thermals", "PowerDraw", "Fans"];
export const GROUP_B_IDS = ["DriveSpace", "StorageHealth", "DiskIO", "NetworkThroughput", "NetworkAdapters", "Clock", "Timer", "Countdown", "StatusBar", "CodingAgents", "Calendar", "Weather", "Forecast", "SensorValue", "SensorGroup", "CustomGauge"];
export const GROUP_C_IDS = ["NowPlaying", "AudioMeter", "VolumeMixer", "MeterBridge", "Visualizer", "WaveLink"];
export const GROUP_D_IDS = ["FpsMonitor", "GameSpotlight", "OsdStrip", "FramePacing", "PlaytimeShare", "SteamProfile", "SteamFriends", "SteamGame", "Achievements", "SteamLibrary", "SteamNews"];
export const GROUP_E_IDS = ["WebPage", "TextFile", "Notifications", "Departures", "Bluetooth"];
export const TIME_IDS = ["DayPlanner", "RadialClockStack", "OnAirBeacon"];
export const STREAM_IDS = ["StreamMixer", "AudioButton", "AudioFader", "StreamControl", "ObsButton", "StreamChat", "StreamDeck"];
export const GROUP_HISTORY_IDS = ["BottleneckLens", "FrameHistogram", "SessionStats", "ThresholdTimeline"];

/** A folder widget's definition as the registry's old template options: its meta, own settings and props mapping, with the component the test draws. */
export const folderOptions = (id: string, Component: unknown) => {
  const w = FOLDER_WIDGETS.find((x) => x.meta.id === id)!;
  return { meta: w.meta, Component, settings: w.settings, toProps: w.render.toProps };
};
