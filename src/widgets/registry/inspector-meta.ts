// What the inspector needs to know about each template widget beyond its settings (widget settings v2):
// whether it draws a header, what it draws in small zones, the units and thresholds it renders (its schema has
// one Units & format / Thresholds row each; checked against what each renderer draws) and its look subset.
import type { CompactShape, DashboardModule, HeaderMode, ModuleSetting } from "@/modules/types";
import { BOTH, CARD, DENSE, NONE } from "../define";

export type InspectorMeta = Required<Pick<DashboardModule, "header" | "compact">> &
  Pick<DashboardModule, "fmt" | "thr" | "styleSubset" | "noData">;

const yes = (compact: CompactShape, more: Omit<InspectorMeta, "header" | "compact"> = {}): InspectorMeta => ({ header: "yes", compact, ...more });
const as = (header: HeaderMode, compact: CompactShape, more: Omit<InspectorMeta, "header" | "compact"> = {}): InspectorMeta => ({ header, compact, ...more });

/** Every group widget, by id; a folder widget (`src/widgets/<kebab-id>/widget.ts`) carries its own `inspector`. */
export const INSPECTOR_META: Record<string, InspectorMeta> = {
  // Group A: system and hardware
  KpiTiles: as("none", BOTH),
  Vitals: as("none", BOTH),
  // Group B: storage, network, info, generic
  DriveSpace: yes(BOTH, { thr: ["full"] }),
  NetworkThroughput: yes(CARD, { fmt: ["rateUnit"] }),
  NetworkAdapters: yes(BOTH),
  Timer: yes(NONE),
  Countdown: yes(BOTH, { fmt: ["clock"] }),
  Weather: yes(CARD, { fmt: ["tempUnit"] }),
  Forecast: yes(BOTH, { fmt: ["tempUnit"] }),
  SensorValue: yes(CARD, { fmt: ["decimals"], thr: ["value"] }),
  CustomGauge: yes(NONE),
  // Group C: media / audio
  // Its amber and hot zones are the Audio level threshold (config v8).
  AudioMeter: yes(BOTH, { thr: ["db"] }),
  VolumeMixer: yes(BOTH),
  MeterBridge: yes(DENSE, { thr: ["db"] }),
  Visualizer: yes(DENSE),
  WaveLink: yes(BOTH),
  // Group D: gaming
  FpsMonitor: yes(CARD),
  GameSpotlight: as("none", BOTH),
  OsdStrip: as("none", BOTH),
  FramePacing: yes(BOTH),
  PlaytimeShare: yes(BOTH),
  SteamFriends: yes(BOTH),
  SteamGame: as("none", CARD),
  Achievements: yes(CARD),
  SteamLibrary: yes(CARD),
  SteamNews: yes(BOTH),
  // Group E: the plain plugin cards
  StreamDeck: yes(BOTH),
  // History and analysis
  FrameHistogram: yes(CARD),
  SessionStats: yes(CARD),
  ThresholdTimeline: yes(CARD, { thr: ["value"] }),
  // Stream audio: the server's audio control
  StreamMixer: yes(BOTH),
  AudioButton: yes(NONE),
  AudioFader: yes(NONE),
  // Stream OBS: the server's OBS connection
  StreamControl: yes(BOTH),
  ObsButton: yes(NONE),
  // Stream chat: the server's Twitch connection
  StreamChat: yes(BOTH),
};

/**
 * A widget's Fit rows for its small-zone shape (SPEC §4.6): Small zones
 * without the choices it cannot draw (Card without a summary card, Dense
 * without a dense view); with only Auto / Full left the row goes and
 * Density stops being a More row.
 */
export function fitSettings(defs: ModuleSetting[], compact: CompactShape): ModuleSetting[] {
  const drawn = (value: string) => (value === "card" ? compact.card : value === "dense" ? compact.dense !== false : true);
  const row = defs.find((d) => d.key === "compact");
  const options = row?.options?.filter((o) => drawn(o.value)) ?? [];
  const keep = options.length > 2;
  return defs.flatMap((d): ModuleSetting[] => {
    if (d === row) return keep ? [{ ...d, options }] : [];
    if (d.key === "sizeTier" && !keep) return [{ ...d, more: false }];
    return [d];
  });
}
