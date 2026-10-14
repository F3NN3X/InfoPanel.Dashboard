# Widget catalogue

44 templates, grouped exactly as on the overview page (`Widget Templates.dc.html`). Each links to its own spec.

### System
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [System Overview](widgets/SystemOverview.md) | `SystemOverview` | 5×2 | One panel for CPU, GPU and RAM, with optional VRAM and network. |
| [Menu Bar](widgets/MenuBar.md) | `MenuBar` | 6×1 | An always-visible glance strip in the style of iStat Menus: each label sits over its value, with mini history bars. |
| [KPI Tiles](widgets/KpiTiles.md) | `KpiTiles` | 6×1 | The four numbers you check first. |
| [Status Tracker](widgets/StatusTracker.md) | `StatusTracker` | 4×2 | A history of states with one block per reading: OK, 50–80%, above 80% / down, or no data. |
| [System Status](widgets/SystemStatus.md) | `SystemStatus` | 2×1 | CPU + RAM load and Data API health.. |
| [Vitals](widgets/Vitals.md) | `Vitals` | 4×1 | CPU, GPU, RAM and network side by side. |
| [Service Health](widgets/ServiceHealth.md) | `ServiceHealth` | 2×2 | Status board for every data source: Data API, LibreHW, RTSS, Wave Link, Spotify, Steam, weather and network.. |
| [Processes](widgets/ProcessList.md) | `ProcessList` | 2×2 | Top processes by CPU or memory plus process, thread and handle counts.. |
| [Uptime](widgets/Uptime.md) | `Uptime` | 2×1 | Time since boot, split into days, hours, minutes and seconds.. |

### Hardware
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [CPU Monitor](widgets/CpuMonitor.md) | `CpuMonitor` | 3×2 | Total and per-core load as bars or a heatmap. |
| [Core Heatmap](widgets/CoreHeatmap.md) | `CoreHeatmap` | 2×2 | Per-core heatmap: grid, honeycomb, radial or scrolling waterfall, in seven colour ramps.. |
| [GPU Rings](widgets/GpuRings.md) | `GpuRings` | 3×2 | Stacked radial rings, used only for bounded percentages: VRAM on the outside, core load inside, temperature in the centre. |
| [GPU Monitor](widgets/GpuMonitor.md) | `GpuMonitor` | 3×2 | Load, core and hotspot temps, power, VRAM, clocks, fans and D3D engines.. |
| [Memory](widgets/MemoryUsage.md) | `MemoryUsage` | 2×1 | Physical and virtual memory: load, used and available.. |
| [Thermals](widgets/Thermals.md) | `Thermals` | 2×2 | Every temperature in one list, hottest first, with a warning marker on each row.. |
| [Power Draw](widgets/PowerDraw.md) | `PowerDraw` | 2×1 | CPU and GPU package watts as a split bar, with a history of the total.. |
| [Fans](widgets/Fans.md) | `Fans` | 2×1 | GPU fans with duty % plus the CPU fan. |

### Storage
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [Drive Space](widgets/DriveSpace.md) | `DriveSpace` | 2×2 | Used and free space per volume, with label, type and file system.. |
| [SSD Health](widgets/StorageHealth.md) | `StorageHealth` | 3×2 | SMART life, temperature, read/write rate, activity, TBW, spare and power-on hours.. |
| [Disk I/O](widgets/DiskIO.md) | `DiskIO` | 2×2 | Read and write throughput for every physical disk, plus a combined history.. |

### Network
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [Network Traffic](widgets/NetworkThroughput.md) | `NetworkThroughput` | 3×1 | Live download and upload rate with history, totals and utilisation for any adapter.. |
| [Network Adapters](widgets/NetworkAdapters.md) | `NetworkAdapters` | 2×2 | Public IP plus each adapter’s status, link speed, IPv4 and IPv6.. |

### Media
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [Now Playing](widgets/NowPlaying.md) | `NowPlaying` | 3×1 | Track, artist, album, cover art and progress from Windows Media, Spotify or a pushed source.. |

### Audio
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [Audio Meter](widgets/AudioMeter.md) | `AudioMeter` | 2×1 | L/R LED meter with peak, RMS, hold and level, or a meter bridge showing every device.. |
| [Volume Mixer](widgets/VolumeMixer.md) | `VolumeMixer` | 2×2 | Volume and mute for each device, plus the default device and Wave Link status.. |
| [Meter Bridge](widgets/MeterBridge.md) | `MeterBridge` | 4×3 | Studio-style meters for every channel: a dB scale, stereo LED ladders with dimmed zone colours, peak hold, volume and L/R dB readouts. |
| [Visualizer](widgets/Visualizer.md) | `Visualizer` | 3×2 | Canvas audio visualiser driven by the level meter: bars, mirror, radial, wave, blob or LED dots.. |
| [Wave Link](widgets/WaveLink.md) | `WaveLink` | 2×2 | Elgato Wave Link inputs with mute and gain, and live L/R meters for each channel.. |

### Info
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [Clock](widgets/Clock.md) | `Clock` | 2×1 | Digital or analog clock with date, 12/24 h and seconds.. |
| [Calendar](widgets/Calendar.md) | `Calendar` | 2×2 | Today’s date plus a month grid, taken from the clock plugin.. |
| [Weather](widgets/Weather.md) | `Weather` | 3×2 | Conditions, feels-like, wind, humidity, pressure, rain or snow, and a 7-day forecast.. |
| [Forecast](widgets/Forecast.md) | `Forecast` | 4×1 | Daily forecast with hi/lo range bars. |

### Gaming
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [FPS Monitor](widgets/FpsMonitor.md) | `FpsMonitor` | 3×2 | RTSS frame rate, 1% low, frame-time graph, min/avg/max, display and API.. |
| [Game Spotlight](widgets/GameSpotlight.md) | `GameSpotlight` | 4×2 | Now playing for games: the Steam hero banner with slow Ken Burns motion, game logo, poster and icon, plus session, playtime, FPS, achievements and friends. |
| [OSD Strip](widgets/OsdStrip.md) | `OsdStrip` | 6×1 | An in-game overlay strip like RTSS or Afterburner: cells in a fixed order with monospace digits, and colour only when a value drops.. |
| [Frame Pacing](widgets/FramePacing.md) | `FramePacing` | 4×2 | A frame-time graph with budget lines for your refresh rate and for 60 Hz. |
| [Playtime Share](widgets/PlaytimeShare.md) | `PlaytimeShare` | 3×2 | How the last two weeks of play split between games, as one bar with a segment per game sized by its share.. |
| [Steam Profile](widgets/SteamProfile.md) | `SteamProfile` | 2×2 | Avatar, persona, status, level and friends online or in-game, with recent activity.. |
| [Steam Friends](widgets/SteamFriends.md) | `SteamFriends` | 2×2 | Friends as a list or a table, colour-coded by status. |
| [Current Game](widgets/SteamGame.md) | `SteamGame` | 4×2 | Hero art, session time, playtime, average session and achievement progress.. |
| [Achievements](widgets/Achievements.md) | `Achievements` | 2×1 | Completion ring for the current game, unlocked/total and the latest unlock.. |
| [Steam Library](widgets/SteamLibrary.md) | `SteamLibrary` | 3×2 | Games owned, total and recent playtime, recent games and game news.. |
| [Game News](widgets/SteamNews.md) | `SteamNews` | 3×1 | The latest headlines for the current game and your library.. |

### Generic
| Widget | Component | Default span | Summary |
|---|---|---|---|
| [Sensor](widgets/SensorValue.md) | `SensorValue` | 1×1 | Bind any single data point and show it as a value, gauge, bar or sparkline with thresholds.. |
| [Sensor Group](widgets/SensorGroup.md) | `SensorGroup` | 2×2 | Bind any list of data points, shown as rows or a tile grid, each with an optional bar and thresholds.. |
