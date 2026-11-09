// Recipe widgets (Phase 5a): a widget made of Studio's own blocks, as data. A recipe is `recipe.json` in a widget package
// (`package.ts`: a manifest with each file's SHA-256, then the files), checked by `validate.ts` on import and on every load,
// and drawn by `RecipeView.tsx` with the same primitives and theme tokens as the built-in widgets. No code and no URLs: every
// value is a number, a word, a sensor key, an option key or a field of a Repeat's data source; an image is a file of the package.
import type { WidgetPreset } from "../define";

/** The recipe format this build reads (`recipe.json`'s `format`). */
export const RECIPE_FORMAT = 1;

/** The fixed list of blocks (the builder's "Add a block"). */
export const BLOCK_TYPES = ["card", "row", "repeat", "ring", "gauge", "bar", "sparkline", "value", "label", "weather-icon", "image", "heatmap"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Where a block's value comes from: a sensor key, an option's value (a `sensor` option's key is read in turn), or a field of the item a
 * Repeat draws. A sensor key may name a `device` option in braces (`libre.{cpu}_cpu_total`): the device the placement picked, Auto the
 * first of its kind the data has, so one recipe reads whichever CPU or GPU a person picks.
 */
export type Binding = { sensor: string } | { option: string } | { field: string };

/** A colour from the theme: its accent, one of its six series, or the status colours by the block's thresholds. */
export type RecipeColour = "accent" | "series-1" | "series-2" | "series-3" | "series-4" | "series-5" | "series-6" | "thresholds";

/** A zone size in grid cells, `[columns, rows]`. */
export type Cells = [number, number];

/**
 * Shown only while an option holds (`is`) or does not hold (`not`) a value, and only at the zone sizes `size` allows (both when
 * both are given): how a preset turns parts of a recipe off, and how a part leaves a size too small for its text. A size is read in
 * the validator's nominal cells (`metrics.ts`), from the box the card has.
 */
export interface Condition {
  option?: string;
  is?: string | number | boolean;
  not?: string | number | boolean;
  size?: { min?: Cells; max?: Cells };
}

interface BlockBase {
  /** The Layers name ("Top row"); not drawn. */
  name?: string;
  when?: Condition;
  /** The share of its row it takes (default 1). */
  grow?: number;
}

export interface Ranged {
  bind: Binding;
  min?: number;
  max?: number;
  color?: RecipeColour;
  /** Warning and critical levels, for `color: "thresholds"`. */
  thresholds?: { warn: number; crit: number };
}

export interface CardBlock extends BlockBase {
  type: "card";
  /** The header's title (the root card) or a caption over a nested card. */
  title?: string;
  /** A sub-title after it, from a binding (the CPU's name). */
  subtitle?: Binding;
  icon?: string;
  children: Block[];
}
export interface RowBlock extends BlockBase {
  type: "row";
  direction?: "row" | "column";
  /** Between the children, px (0-24). */
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  children: Block[];
}
export interface RepeatBlock extends BlockBase {
  type: "repeat";
  /** The list option it runs over (a `place-list`). */
  over: string;
  /** The data source each item reads (5c serves it; until then the recipe's sample items). */
  source: "weather-by-place";
  direction?: "rows" | "columns" | "grid";
  /** Most shown (1-12). */
  max?: number;
  dividers?: boolean;
  children: Block[];
}
export interface RingBlock extends BlockBase, Ranged {
  type: "ring" | "gauge";
  /** The value in the centre (default on). */
  center?: boolean;
  /** The centre value's size, times the card's base text size (default 1.6). */
  scale?: number;
  /** Stroke, % of the diameter (2-24); unset takes the one ring spec. */
  thickness?: number;
  unit?: string;
  decimals?: number;
}
export interface BarBlock extends BlockBase, Ranged {
  type: "bar";
  style?: "bar" | "segments";
}
export interface SparklineBlock extends BlockBase, Ranged {
  type: "sparkline";
  style?: "line" | "area" | "bars";
}
export interface ValueBlock extends BlockBase {
  type: "value";
  bind: Binding;
  /** A label before the value ("Temp"). */
  label?: string;
  /** Overrides the unit read from the reading. */
  unit?: string;
  decimals?: number;
  /** Text size, times the card's base (default 1). */
  scale?: number;
  color?: RecipeColour;
  thresholds?: { warn: number; crit: number };
}
export interface LabelBlock extends BlockBase {
  type: "label";
  text?: string;
  bind?: Binding;
  scale?: number;
  tone?: "fg" | "muted" | "accent";
}
export interface WeatherIconBlock extends BlockBase {
  type: "weather-icon";
  /** A condition text or code ("Cloudy", "04d"). */
  bind: Binding;
  scale?: number;
}
export interface ImageBlock extends BlockBase {
  type: "image";
  /** A file of the package (`images/<name>.png`). */
  file: string;
  fit?: "contain" | "cover";
  alt?: string;
}
export interface HeatmapBlock extends BlockBase {
  type: "heatmap";
  /** One cell per binding. */
  cells?: Binding[];
  /** Or a field holding a list of numbers (a Repeat item's `hourly`). */
  bind?: Binding;
  min?: number;
  max?: number;
  columns?: number;
  color?: RecipeColour;
}

export type Block = CardBlock | RowBlock | RepeatBlock | RingBlock | BarBlock | SparklineBlock | ValueBlock | LabelBlock | WeatherIconBlock | ImageBlock | HeatmapBlock;
/** The blocks that hold others. */
export type Container = CardBlock | RowBlock | RepeatBlock;

/** A place of a `place-list` option: what the placement stores (as JSON text, since a setting is a scalar). */
export interface Place {
  name: string;
  lat: number;
  lon: number;
}

/** The `ModuleSetting` types a recipe option may take, `place-list`, and `device` (a CPU, GPU, drive or adapter, Auto by default). */
export const OPTION_TYPES = ["text", "number", "select", "boolean", "color", "sensor", "date", "time", "place-list", "device"] as const;
export type OptionType = (typeof OPTION_TYPES)[number];

/** The device kinds a `device` option picks from: the ones the Data API's keys name by a device id (`hw` in widgets/core/data.ts). */
export const DEVICE_KINDS = ["cpu", "gpu", "disk", "adapter"] as const;
export type RecipeDeviceKind = (typeof DEVICE_KINDS)[number];
/** A device option's value: `auto`, or a device id as the keys hold it (`amd_ryzen_9_9950x3d`). */
export const DEVICE_ID = /^(auto|[a-z0-9][a-z0-9_]{0,79})$/;

/** What people can change when they add the widget (its Content tab). */
export interface RecipeOption {
  key: string;
  label: string;
  type: OptionType;
  default: string | number | boolean | Place[];
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  group?: string;
  /** A `device` option's kind. */
  kind?: RecipeDeviceKind;
}

/** The fields a Weather-by-place item has (5c fills them; 5a's sample items use the same names). */
export const WEATHER_PLACE_FIELDS = ["name", "condition", "code", "temp", "high", "low", "precip", "wind", "hourly"] as const;

export interface RecipeSample {
  /** Readings by sensor key, as the Data API gives them ("54.4 %" or a number). */
  sensors: Record<string, string | number>;
  /** A Repeat's items by its list option: one record of fields per place. */
  items?: Record<string, Record<string, string | number | number[]>[]>;
}

export interface Recipe {
  format: 1;
  /** `recipe:<id>` (Gate 0 answer 5). */
  id: string;
  name: string;
  /** Semver. A placement stores the version it was added with. */
  version: string;
  author: string;
  description?: string;
  icon?: string;
  category?: string;
  size: { min: Cells; max: Cells; default: Cells };
  options: RecipeOption[];
  /** The Phase 4 shape: settings are option values; exactly one is the default. */
  presets: WidgetPreset[];
  root: CardBlock;
  sample: RecipeSample;
}

/** One file of a package: its path from the package folder and its bytes. */
export interface PackageFile {
  path: string;
  bytes: Uint8Array;
}

/** A file as the manifest lists it. */
export interface ManifestFile {
  path: string;
  bytes: number;
  sha256: string;
}

/**
 * A widget package's manifest (`manifest.json`), the one format of recipes (5a) and code widgets (6a). For a recipe `signature`
 * is absent; 6a signs the manifest without its `signature` field (the file list carries every file's hash), so a recipe's
 * manifest is read the same way then.
 */
export interface Manifest {
  format: 1;
  kind: "recipe" | "code";
  id: string;
  version: string;
  author: string;
  name?: string;
  files: ManifestFile[];
  signature?: unknown;
}
