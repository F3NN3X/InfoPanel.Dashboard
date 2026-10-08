/**
 * Free-canvas ("IP") model — a 1:1 mirror of InfoPanel's display-item tree.
 *
 * Unlike the grid model in `layout.ts`, items are placed at absolute pixel
 * coordinates on the profile canvas; z-order is list order (index 0 = bottom);
 * groups draw nothing themselves — their children keep absolute coordinates.
 * Property names and defaults follow the C# source (see
 * INFOPANEL-PROFILE-EDITOR-RESEARCH.md at the repo root).
 */

export type IPItemKind =
  | "text"
  | "clock"
  | "calendar"
  | "sensor"
  | "table"
  | "image"
  | "httpImage"
  | "sensorImage"
  | "graph"
  | "bar"
  | "donut"
  | "gauge"
  | "shape"
  | "group";

export const IP_KIND_LABEL: Record<IPItemKind, string> = {
  text: "Text",
  clock: "Clock",
  calendar: "Calendar",
  sensor: "Sensor",
  table: "Table",
  image: "Image",
  httpImage: "Http Image",
  sensorImage: "Sensor Image",
  graph: "Graph",
  bar: "Bar",
  donut: "Donut",
  gauge: "Gauge",
  shape: "Shape",
  group: "Group",
};

/** Shared text properties (InfoPanel TextDisplayItem + profile inheritance). */
export interface IPTextBlock {
  font?: string;
  /** Rendered size = fontSize × profile fontScale. */
  fontSize: number;
  fontStyle?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeout?: boolean;
  color?: string;
  rightAlign?: boolean;
  centerAlign?: boolean;
  uppercase?: boolean;
  wrap?: boolean;
  ellipsis?: boolean;
  /** 0 = auto (measure text). */
  width: number;
  height: number;
  marquee?: boolean;
  marqueeSpeed?: number;
  marqueeSpacing?: number;
  glowEnabled?: boolean;
  glowRadius?: number;
  glowColor?: string;
  glowBlendMode?: string;
}

export type IPSensorValueType = "NOW" | "MIN" | "MAX" | "AVERAGE";

export interface IPSensorBinding {
  sensorType: "hwinfo" | "libre" | "plugin";
  /** Display name of the sensor in InfoPanel (label + fallback). */
  sensorName?: string;
  /**
   * Direct bridge key from the editor's live sensor picker —
   * highest-priority resolution path (bypasses Libre/plugin mapping).
   */
  bridgeKey?: string;
  /** Libre path, e.g. `/amdcpu/0/load/0` (resolved to a bridge key at runtime). */
  libreId?: string;
  /** Plugin slug, e.g. `/InfoPanel.RTSS/rtss/fps` (→ `plugins.InfoPanel.RTSS.rtss.fps`). */
  pluginId?: string;
  /** HWiNFO 4-tuple — retained for round-trip; the bridge does not expose HWiNFO. */
  hwinfo?: { remoteIndex: number; sensor: number; instance: number; entryId: number };
  valueType?: IPSensorValueType;
  /** Display the sensor name above/next to the value. */
  showName?: boolean;
  unit?: string;
  overrideUnit?: boolean;
  showUnit?: boolean;
  /** Decimal places (override when > 0 is requested). */
  precision?: number;
  overridePrecision?: boolean;
  showThousandsSeparator?: boolean;
  /** Value = value × MultiplicationModifier (+ AdditionModifier), ÷10 when DivisionToggle. */
  multiplicationModifier?: number;
  divisionToggle?: boolean;
  additionModifier?: number;
  absoluteAddition?: boolean;
  threshold1?: number;
  threshold1Color?: string;
  threshold2?: number;
  threshold2Color?: string;
}

export interface IPBase {
  /** Runtime id (regenerated on import, like InfoPanel's [XmlIgnore] Guid). */
  id: string;
  kind: IPItemKind;
  name: string;
  x: number;
  y: number;
  /** 0/90/180/270. */
  rotation: number;
  hidden: boolean;
  locked: boolean;
}

export interface IPTextItem extends IPBase, IPTextBlock {
  kind: "text";
  text: string;
}

export interface IPClockItem extends IPBase, IPTextBlock {
  kind: "clock";
  format: string;
}

export interface IPCalendarItem extends IPBase, IPTextBlock {
  kind: "calendar";
  format: string;
}

export interface IPSensorItem extends IPBase, IPTextBlock {
  kind: "sensor";
  sensor: IPSensorBinding;
}

export interface IPTableItem extends IPBase, IPTextBlock {
  kind: "table";
  sensor: IPSensorBinding;
  /** `"colIdx:widthPx|colIdx:widthPx"` — InfoPanel TableFormat. */
  tableFormat: string;
  /** 0 = all rows. */
  maxRows: number;
  showHeader: boolean;
}

export interface IPImageItem extends IPBase {
  kind: "image";
  /** Asset file name (profile asset folder) for type FILE. */
  filePath: string;
  /** URL for type URL (C# `HttpUrl`). */
  httpUrl?: string;
  type: "FILE" | "URL";
  /** URL for type URL; percent scale for FILE (0 = native size). */
  scale: number;
  layer: boolean;
  layerColor: string;
  /** Video-overlay strip (progress, LIVE, time, volume icon). */
  showPanel: boolean;
  volume: number;
  width: number;
  height: number;
  cache: boolean;
  readOnly: boolean;
  relativePath: boolean;
}

export interface IPHttpImageItem extends IPBase {
  kind: "httpImage";
  /** Asset file name for type FILE (rare). */
  filePath: string;
  type: "FILE" | "URL";
  /** Remote image URL (C# `HttpUrl`). */
  httpUrl: string;
  scale: number;
  layer: boolean;
  layerColor: string;
  showPanel: boolean;
  volume: number;
  width: number;
  height: number;
  cache: boolean;
  readOnly: boolean;
  relativePath: boolean;
  /** When set, the image URL is the sensor's live text value. */
  sensor: IPSensorBinding;
}

/** C# `SensorImageDisplayItem` = `ImageDisplayItem` + sensor + 2 thresholds:
 *  the single image is shown while the value sits between the thresholds. */
export interface IPSensorImageItem extends IPBase {
  kind: "sensorImage";
  sensor: IPSensorBinding;
  threshold1: number;
  threshold2: number;
  filePath: string;
  type: "FILE" | "URL";
  scale: number;
  layer: boolean;
  layerColor: string;
  showPanel: boolean;
  volume: number;
  width: number;
  height: number;
  cache: boolean;
  readOnly: boolean;
  relativePath: boolean;
}

interface IPChartBase {
  width: number;
  height: number;
  min: number;
  max: number;
  autoValue: boolean;
  frame: boolean;
  frameColor: string;
  background: boolean;
  backgroundColor: string;
  color: string;
}

export interface IPGraphItem extends IPBase, IPChartBase {
  kind: "graph";
  sensor: IPSensorBinding;
  /** C# GraphType. */
  graphType: "LINE" | "HISTOGRAM";
  step: number;
  thickness: number;
  fill: boolean;
  fillColor: string;
  flipX: boolean;
}

export interface IPBarItem extends IPBase, IPChartBase {
  kind: "bar";
  sensor: IPSensorBinding;
  cornerRadius: number;
  gradient: boolean;
  gradientColor: string;
  flipX: boolean;
}

export interface IPDonutItem extends IPBase, IPChartBase {
  kind: "donut";
  sensor: IPSensorBinding;
  thickness: number;
  span: number;
}

export interface IPGaugeItem extends IPBase {
  kind: "gauge";
  sensor: IPSensorBinding;
  minValue: number;
  maxValue: number;
  /** 0 = native image size, else percent. */
  scale: number;
  /** 0 = native frame size (per dimension, C# `Width`/`Height`). */
  width: number;
  height: number;
  flipX: boolean;
  /** Frame-units/sec smoothing; 0 = instant. */
  animationSpeed: number;
  /**
   * Sprite frames — full image items (C# `Images`, each a
   * `ImageDisplayItem`), rendered in order as the value sweeps min→max.
   */
  images: IPImageItem[];
}

export type IPShapeType =
  | "Rectangle"
  | "RoundedRect"
  | "Ellipse"
  | "Triangle"
  | "Capsule"
  | "Star"
  | "Plus"
  | "Arrow"
  | "Trapezoid"
  | "Parallelogram"
  | "Hexagon";

export interface IPShapeItem extends IPBase {
  kind: "shape";
  shapeType: IPShapeType;
  width: number;
  height: number;
  cornerRadius: number;
  showFrame: boolean;
  frameThickness: number;
  frameColor: string;
  showFill: boolean;
  fillColor: string;
  showGradient: boolean;
  gradientColor: string;
  gradientColor2: string;
  gradientType: "Linear" | "Sweep" | "Radial" | "Diamond" | "Reflected" | "Spiral";
  gradientAngle: number;
  gradientAnimationSpeed: number;
}

export interface IPGroupItem extends IPBase {
  kind: "group";
  /** Children keep absolute profile coordinates (group draws nothing). */
  children: IPItem[];
}

export type IPItem =
  | IPTextItem
  | IPClockItem
  | IPCalendarItem
  | IPSensorItem
  | IPTableItem
  | IPImageItem
  | IPHttpImageItem
  | IPSensorImageItem
  | IPGraphItem
  | IPBarItem
  | IPDonutItem
  | IPGaugeItem
  | IPShapeItem
  | IPGroupItem;

export interface IPProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  /** #AARRGGBB. */
  backgroundColor: string;
  font: string;
  fontSize: number;
  /** Text rendered size = FontSize × FontScale. */
  fontScale: number;
  color: string;
  showFps: boolean;
  drag: boolean;
  resize: boolean;
  active: boolean;
  topmost: boolean;
  windowX: number;
  windowY: number;
  targetWindow?: {
    x: number;
    y: number;
    width: number;
    height: number;
    deviceName: string;
  };
  strictWindowMatching: boolean;
  /**
   * Asset folder name — images live at `/assets/ip/<assets>/<file>`
   * (the InfoPanel `assets\<guid>\` folder, copied at import time).
   */
  assets?: string;
  /** In-memory assets (data URLs) for profiles imported via `.infopanel`. */
  assetData?: Record<string, string>;
  /** Z-order = index (0 = bottom). */
  items: IPItem[];
  /**
   * Version of a shipped layout, so `mergeConfig` can replace a stored
   * copy when the app ships a newer one (user-imported profiles have none).
   */
  sampleVersion?: number;
}
