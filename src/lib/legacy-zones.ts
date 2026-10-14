import type { ModuleSettings, ModuleSettingValue } from "@/modules/types";
import type { Placement } from "./layout";

/*
 * Config v4: the legacy module ids (the pre-template widgets, last kept as aliases of their templates)
 * are rewritten to the template that rendered them. Each rule keeps the stored keys the template reads,
 * writes the alias's own default where the template's default differs, turns the alias-only keys into
 * the template's, and drops what the template cannot use. `legacy-zones.test.ts` holds the outputs that
 * were checked to render exactly as the aliases did.
 */

/** A legacy zone's settings, resolved: stored values over the alias defaults this rule needs. */
type Rule = (stored: ModuleSettings, ctx: MigrateContext) => { module: string; settings: ModuleSettings };

export interface MigrateContext {
  /** The dashboard or the zone's profile style sets a surface (it then wins over a module's own default). */
  styledSurface: boolean;
}

/** `stored` without `keys`. */
const omit = (stored: ModuleSettings, keys: readonly string[]): ModuleSettings =>
  Object.fromEntries(Object.entries(stored).filter(([k]) => !keys.includes(k)));

/** `defaults` under `stored`: the alias's value for every key it did not store. */
const withDefaults = (stored: ModuleSettings, defaults: ModuleSettings): ModuleSettings => ({ ...defaults, ...stored });

/** A stored value, else the alias's default. */
const valueOf = (stored: ModuleSettings, key: string, fallback: ModuleSettingValue): ModuleSettingValue => stored[key] ?? fallback;

/** A non-empty stored colour, else the alias's default. */
const colorOf = (stored: ModuleSettings, key: string, fallback: string): string => String(stored[key] ?? "").trim() || fallback;

/** The plain card aliases: the template under its own id, on the "Theme" surface the alias defaulted to. */
const card =
  (module: string): Rule =>
  (stored, ctx) => ({
    module,
    settings: stored.surface !== undefined || ctx.styledSurface ? stored : { ...stored, surface: "theme" },
  });

/** systemmodern's device colours before the port (`ModernSystem` at 6513067). */
const SYSTEM_COLORS: Record<string, string> = { cpuColor: "#38bdf8", gpuColor: "#a78bfa", ramColor: "#4ade80", vramColor: "#fbbf24", diskColor: "#fb7185" };
/** systemmodern defaults that differ from SystemOverview's (the template shows every detail and graph). */
const SYSTEM_DEFAULTS: ModuleSettings = {
  showNames: false,
  showClock: false,
  showHotspot: false,
  showFans: false,
  showMemClock: false,
  showPowerLimit: false,
  showPageFile: false,
  showDiskLife: false,
  sparkline: false,
  historyLength: 48,
  loadCrit: 95,
};

const system: Rule = (stored) => {
  // devices + showVram → sections (VRAM was part of the GPU block); showCores + coreStyle → coreView.
  const picked = new Set(String(valueOf(stored, "devices", "cpu,gpu,ram")).split(",").map((x) => x.trim()));
  const vram = valueOf(stored, "showVram", true) !== false;
  const sections = ["cpu", "gpu", "ram", "disk"].filter((k) => picked.has(k)).flatMap((k) => (k === "gpu" && vram ? ["gpu", "vram"] : [k]));
  const cores = Boolean(valueOf(stored, "showCores", false));
  const colors = Object.fromEntries(Object.entries(SYSTEM_COLORS).map(([k, c]) => [k, colorOf(stored, k, c)]));
  return {
    module: "SystemOverview",
    settings: {
      ...withDefaults(omit(stored, ["devices", "showVram", "showCores", "coreStyle"]), SYSTEM_DEFAULTS),
      ...colors,
      sections: sections.join(","),
      coreView: cores ? (stored.coreStyle === "bars" ? "bars" : "heatmap") : "off",
    },
  };
};

/** The media aliases' switches the NowPlaying template no longer reads (no idle animations, no engine pick). */
const MEDIA_DROPPED = ["waveform", "visualizer", "waveformActive", "visualizerIdle", "visualizerLoading"];

const media =
  (source: "spotify" | "media"): Rule =>
  (stored) => {
    // `visualizer` (the bar visualizer, wins) or `waveform` (the live waveform) replaced the progress bar.
    const engine = stored.visualizer ? "bars" : stored.waveform ? "waveform" : undefined;
    return {
      module: "NowPlaying",
      settings: {
        ...withDefaults(omit(stored, MEDIA_DROPPED), { tint: true }),
        source,
        progress: engine ? "visualizer" : "bar",
        ...(engine ? { vizEngine: engine } : null),
      },
    };
  };

const steam: Rule = (stored) => ({
  module: "GameSpotlight",
  settings: {
    ...omit(stored, ["dimBanner"]),
    // The old card had no Ken Burns motion; Dim banner off = no scrim, on = the template's own.
    spotlightLayout: "composite",
    motion: false,
    ...(valueOf(stored, "dimBanner", true) ? null : { scrim: 0 }),
  },
});

// The stored `view` only bundled the sparkline switch; the old FPS widget always drew the gauge.
const fps: Rule = (stored) => ({ module: "FpsMonitor", settings: { ...stored, view: "gauge" } });

const hardware: Rule = (stored) =>
  stored.view === "temps"
    ? // Temp gauges: every temperature sensor as Thermals gauges.
      { module: "Thermals", settings: { ...omit(stored, ["maxRows", "tempColor", "powerColor"]), view: "gauges", discover: true } }
    : // The reading list: SensorGroup in auto-discovery mode.
      { module: "SensorGroup", settings: { ...omit(stored, ["view", "showFans"]), auto: true } };

/** audiomodern's shared keys, at its defaults. */
const AUDIO_DEFAULTS: ModuleSettings = { showDevice: true, showDetails: true, showVolume: false, showMute: true, levelColor: "", hotColor: "" };
/** audiomodern's own keys; each view maps them onto its template's. */
const AUDIO_OWN = ["source", "view", "meterVariant", "meterOrientation"];

const audio: Rule = (stored) => {
  const s = withDefaults(stored, AUDIO_DEFAULTS);
  const source = String(s.source ?? "");
  const vertical = s.meterOrientation === "vertical";
  const keep = omit(stored, AUDIO_OWN);
  if (s.view === "volume") {
    // VolumeMixer: one device when a source is chosen.
    const settings = omit(keep, ["showDetails", "showVolume", "meterBallistics", "hotColor"]);
    return { module: "VolumeMixer", settings: { ...settings, ...(source ? { device: source } : null) } };
  }
  if (s.view === "audiometer") {
    // MeterBridge: the details line (volume, L/R dB) is its volume bar and readouts.
    return {
      module: "MeterBridge",
      settings: {
        ...keep,
        ...(source ? { channels: source } : null),
        includeDefault: true,
        orientation: vertical ? "vertical" : "horizontal",
        ladder: s.meterVariant === "segmented" ? "led" : "smooth",
        showVolume: Boolean(s.showVolume || s.showDetails),
      },
    };
  }
  // AudioMeter: one device, or its bridge of every device (a row per device when horizontal).
  return {
    module: "AudioMeter",
    settings: {
      ...keep,
      ...(source ? { device: source } : null),
      mode: source ? "single" : "bridge",
      meterStyle: s.meterVariant === "segmented" ? "led" : s.meterVariant === "gradient" ? "bar" : "solid",
      orientation: vertical ? "vertical" : "horizontal",
    },
  };
};

/** The legacy Wave Link meter's teal safe zone (`--meter-ok`). */
const LEGACY_METER_OK = "oklch(0.72 0.12 200)";

const network: Rule = (stored) => ({
  module: "NetworkThroughput",
  // the legacy widget's speed colours
  settings: { ...stored, downloadColor: colorOf(stored, "downloadColor", "#34d399"), uploadColor: colorOf(stored, "uploadColor", "#60a5fa") },
});

const same =
  (module: string, extra: ModuleSettings = {}): Rule =>
  (stored) => ({ module, settings: withDefaults(stored, extra) });

/** Legacy module id → its rule. */
const RULES: Record<string, Rule> = {
  systemmodern: system,
  spotifymodern: media("spotify"),
  mediamodern: media("media"),
  weathermodern: same("Weather"),
  steammodern: steam,
  fpsmodern: fps,
  hardwaremodern: hardware,
  audiomodern: audio,
  wavelinkmodern: same("WaveLink", { levelColor: LEGACY_METER_OK }),
  bluetoothmodern: same("Bluetooth"),
  networkmodern: network,
  vbz: card("Departures"),
  notifications: card("Notifications"),
  textfile: card("TextFile"),
  streamdeck: card("StreamDeck"),
  webpage: same("WebPage"),
};

/** The retired module ids. */
export const LEGACY_MODULE_IDS: readonly string[] = Object.keys(RULES);

/** A legacy zone as its template's zone; any other zone is returned as is. */
export function migrateLegacyZone(zone: Placement, ctx: MigrateContext): Placement {
  if (!Object.hasOwn(RULES, zone.module)) return zone;
  const rule = RULES[zone.module];
  const { module, settings } = rule(zone.settings ?? {}, ctx);
  return { ...zone, module, settings: Object.keys(settings).length > 0 ? settings : undefined };
}

/** Every legacy zone of a page (panel zones and unknown ids pass through). */
export function migrateLegacyZones(zones: Placement[], ctx: MigrateContext): Placement[] {
  return zones.some((z) => Object.hasOwn(RULES, z.module)) ? zones.map((z) => migrateLegacyZone(z, ctx)) : zones;
}
