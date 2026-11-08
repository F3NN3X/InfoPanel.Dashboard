// Template widgets that look back or judge: Frame Histogram, Session Stats, Threshold Timeline.
// They read their sensors by role (`role-data.ts`) unless the user picks, and keep a short in-memory history (`core/history.ts`).
import type { DashboardModule } from "@/modules/types";
import { thresholdsOf } from "@/modules/setting-readers";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import { numberOf, numberSetting, sensorSetting, splitKeys, thresholdSetting } from "../shared/settings-kit";
import type { FrameHistogramProps } from "../FrameHistogram";
import { meta as frameHistogramMeta } from "../meta/FrameHistogram";
import type { SessionStatsProps } from "../SessionStats";
import { MAX_SENSORS, meta as sessionStatsMeta } from "../meta/SessionStats";
import type { ThresholdTimelineProps } from "../ThresholdTimeline";
import { MAX_LANES, meta as thresholdTimelineMeta } from "../meta/ThresholdTimeline";

// Each component loads in its own chunk, the first time a zone draws it.
const FrameHistogram = lazyWidget(() => import("../FrameHistogram"));
const SessionStats = lazyWidget(() => import("../SessionStats"));
const ThresholdTimeline = lazyWidget(() => import("../ThresholdTimeline"));

const SENSORS_HINT = (n: number) => `Up to ${n}. Empty = CPU and GPU load and temperature`;

export const GROUP_HISTORY: DashboardModule[] = [
  templateModule<Pick<FrameHistogramProps, "window">>({
    meta: frameHistogramMeta,
    Component: FrameHistogram,
    settings: [numberSetting("window", "Window (s)", 60, { min: 10, max: 600, step: 10, group: "History", tab: "behaviour", hint: "Frames counted; one reading a second" })],
    toProps: (s) => ({ window: numberOf(s.window) }),
  }),
  templateModule<Pick<SessionStatsProps, "sensors" | "above">>({
    meta: sessionStatsMeta,
    Component: SessionStats,
    settings: [
      sensorSetting("sensors", "Sensors", { group: "Sensors", tab: "data", multiple: true, hint: SENSORS_HINT(MAX_SENSORS) }),
      numberSetting("above", "Time above", 80, { min: -100, max: 10000, step: 5, group: "Level", tab: "behaviour", hint: "In each sensor's own unit. Changing it starts the counts over" }),
    ],
    toProps: (s) => ({ sensors: splitKeys(s.sensors).slice(0, MAX_SENSORS), above: numberOf(s.above) }),
  }),
  templateModule<Pick<ThresholdTimelineProps, "sensors" | "window" | "warn" | "crit">>({
    meta: thresholdTimelineMeta,
    Component: ThresholdTimeline,
    settings: [
      sensorSetting("sensors", "Sensors", { group: "Sensors", tab: "data", multiple: true, hint: SENSORS_HINT(MAX_LANES) }),
      numberSetting("window", "Window (min)", 5, { min: 1, max: 30, step: 1, group: "History", tab: "behaviour" }),
      thresholdSetting("value"),
    ],
    toProps: (s) => ({ sensors: splitKeys(s.sensors).slice(0, MAX_LANES), window: numberOf(s.window), ...thresholdsOf(s, "value") }),
  }),
];
