// Barrel + registry for the widget library. Drop the widgets/ folder into src/ and import from here.
import SystemStatus, { meta as SystemStatusMeta } from './SystemStatus';
import Vitals, { meta as VitalsMeta } from './Vitals';
import ServiceHealth, { meta as ServiceHealthMeta } from './ServiceHealth';
import ProcessList, { meta as ProcessListMeta } from './ProcessList';
import Uptime, { meta as UptimeMeta } from './Uptime';
import CpuMonitor, { meta as CpuMonitorMeta } from './CpuMonitor';
import GpuMonitor, { meta as GpuMonitorMeta } from './GpuMonitor';
import MemoryUsage, { meta as MemoryUsageMeta } from './MemoryUsage';
import Thermals, { meta as ThermalsMeta } from './Thermals';
import PowerDraw, { meta as PowerDrawMeta } from './PowerDraw';
import Fans, { meta as FansMeta } from './Fans';
import DriveSpace, { meta as DriveSpaceMeta } from './DriveSpace';
import StorageHealth, { meta as StorageHealthMeta } from './StorageHealth';
import DiskIO, { meta as DiskIOMeta } from './DiskIO';
import NetworkThroughput, { meta as NetworkThroughputMeta } from './NetworkThroughput';
import NetworkAdapters, { meta as NetworkAdaptersMeta } from './NetworkAdapters';
import NowPlaying, { meta as NowPlayingMeta } from './NowPlaying';
import AudioMeter, { meta as AudioMeterMeta } from './AudioMeter';
import VolumeMixer, { meta as VolumeMixerMeta } from './VolumeMixer';
import WaveLink, { meta as WaveLinkMeta } from './WaveLink';
import Clock, { meta as ClockMeta } from './Clock';
import Calendar, { meta as CalendarMeta } from './Calendar';
import Weather, { meta as WeatherMeta } from './Weather';
import Forecast, { meta as ForecastMeta } from './Forecast';
import FpsMonitor, { meta as FpsMonitorMeta } from './FpsMonitor';
import SteamProfile, { meta as SteamProfileMeta } from './SteamProfile';
import SteamGame, { meta as SteamGameMeta } from './SteamGame';
import Achievements, { meta as AchievementsMeta } from './Achievements';
import SteamLibrary, { meta as SteamLibraryMeta } from './SteamLibrary';
import SteamNews, { meta as SteamNewsMeta } from './SteamNews';
import SensorValue, { meta as SensorValueMeta } from './SensorValue';
import SensorGroup, { meta as SensorGroupMeta } from './SensorGroup';
import CoreHeatmap, { meta as CoreHeatmapMeta } from './CoreHeatmap';
import Visualizer, { meta as VisualizerMeta } from './Visualizer';
import SystemOverview, { meta as SystemOverviewMeta } from './SystemOverview';
import MeterBridge, { meta as MeterBridgeMeta } from './MeterBridge';
import GameSpotlight, { meta as GameSpotlightMeta } from './GameSpotlight';
import MenuBar, { meta as MenuBarMeta } from './MenuBar';
import KpiTiles, { meta as KpiTilesMeta } from './KpiTiles';
import GpuRings, { meta as GpuRingsMeta } from './GpuRings';
import StatusTracker, { meta as StatusTrackerMeta } from './StatusTracker';
import OsdStrip, { meta as OsdStripMeta } from './OsdStrip';
import FramePacing, { meta as FramePacingMeta } from './FramePacing';
import PlaytimeShare, { meta as PlaytimeShareMeta } from './PlaytimeShare';

export * from './kit';
export { PlaytimeShare, FramePacing, OsdStrip, StatusTracker, GpuRings, KpiTiles, MenuBar, GameSpotlight, MeterBridge, SystemOverview, Visualizer, CoreHeatmap, SystemStatus, Vitals, ServiceHealth, ProcessList, Uptime, CpuMonitor, GpuMonitor, MemoryUsage, Thermals, PowerDraw, Fans, DriveSpace, StorageHealth, DiskIO, NetworkThroughput, NetworkAdapters, NowPlaying, AudioMeter, VolumeMixer, WaveLink, Clock, Calendar, Weather, Forecast, FpsMonitor, SteamProfile, SteamGame, Achievements, SteamLibrary, SteamNews, SensorValue, SensorGroup };

// id → { Component, meta } — feed this to the Add-widget library and the zone renderer.
export const WIDGETS = {
  PlaytimeShare: { Component: PlaytimeShare, meta: PlaytimeShareMeta },
  FramePacing: { Component: FramePacing, meta: FramePacingMeta },
  OsdStrip: { Component: OsdStrip, meta: OsdStripMeta },
  StatusTracker: { Component: StatusTracker, meta: StatusTrackerMeta },
  GpuRings: { Component: GpuRings, meta: GpuRingsMeta },
  KpiTiles: { Component: KpiTiles, meta: KpiTilesMeta },
  MenuBar: { Component: MenuBar, meta: MenuBarMeta },
  GameSpotlight: { Component: GameSpotlight, meta: GameSpotlightMeta },
  MeterBridge: { Component: MeterBridge, meta: MeterBridgeMeta },
  SystemOverview: { Component: SystemOverview, meta: SystemOverviewMeta },
  Visualizer: { Component: Visualizer, meta: VisualizerMeta },
  CoreHeatmap: { Component: CoreHeatmap, meta: CoreHeatmapMeta },
  SystemStatus: { Component: SystemStatus, meta: SystemStatusMeta },
  Vitals: { Component: Vitals, meta: VitalsMeta },
  ServiceHealth: { Component: ServiceHealth, meta: ServiceHealthMeta },
  ProcessList: { Component: ProcessList, meta: ProcessListMeta },
  Uptime: { Component: Uptime, meta: UptimeMeta },
  CpuMonitor: { Component: CpuMonitor, meta: CpuMonitorMeta },
  GpuMonitor: { Component: GpuMonitor, meta: GpuMonitorMeta },
  MemoryUsage: { Component: MemoryUsage, meta: MemoryUsageMeta },
  Thermals: { Component: Thermals, meta: ThermalsMeta },
  PowerDraw: { Component: PowerDraw, meta: PowerDrawMeta },
  Fans: { Component: Fans, meta: FansMeta },
  DriveSpace: { Component: DriveSpace, meta: DriveSpaceMeta },
  StorageHealth: { Component: StorageHealth, meta: StorageHealthMeta },
  DiskIO: { Component: DiskIO, meta: DiskIOMeta },
  NetworkThroughput: { Component: NetworkThroughput, meta: NetworkThroughputMeta },
  NetworkAdapters: { Component: NetworkAdapters, meta: NetworkAdaptersMeta },
  NowPlaying: { Component: NowPlaying, meta: NowPlayingMeta },
  AudioMeter: { Component: AudioMeter, meta: AudioMeterMeta },
  VolumeMixer: { Component: VolumeMixer, meta: VolumeMixerMeta },
  WaveLink: { Component: WaveLink, meta: WaveLinkMeta },
  Clock: { Component: Clock, meta: ClockMeta },
  Calendar: { Component: Calendar, meta: CalendarMeta },
  Weather: { Component: Weather, meta: WeatherMeta },
  Forecast: { Component: Forecast, meta: ForecastMeta },
  FpsMonitor: { Component: FpsMonitor, meta: FpsMonitorMeta },
  SteamProfile: { Component: SteamProfile, meta: SteamProfileMeta },
  SteamGame: { Component: SteamGame, meta: SteamGameMeta },
  Achievements: { Component: Achievements, meta: AchievementsMeta },
  SteamLibrary: { Component: SteamLibrary, meta: SteamLibraryMeta },
  SteamNews: { Component: SteamNews, meta: SteamNewsMeta },
  SensorValue: { Component: SensorValue, meta: SensorValueMeta },
  SensorGroup: { Component: SensorGroup, meta: SensorGroupMeta },
};
