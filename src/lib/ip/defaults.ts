import type {
  IPBarItem,
  IPCalendarItem,
  IPClockItem,
  IPDonutItem,
  IPGroupItem,
  IPGraphItem,
  IPGaugeItem,
  IPHttpImageItem,
  IPImageItem,
  IPItem,
  IPItemKind,
  IPShapeItem,
  IPSensorImageItem,
  IPSensorItem,
  IPTableItem,
  IPTextItem,
} from "./types";
import { uid } from "../layout";

let seed = 0;
function ipId(): string {
  seed += 1;
  return `ip-${Date.now().toString(36)}-${seed.toString(36)}`;
}

const base = (kind: IPItemKind, name: string) => ({
  id: ipId(),
  kind,
  name,
  x: 100,
  y: 100,
  rotation: 0,
  hidden: false,
  locked: false,
});

const textBlock = {
  fontSize: 20,
  fontStyle: "",
  bold: false,
  italic: false,
  underline: false,
  strikeout: false,
  color: "#000000",
  rightAlign: false,
  centerAlign: false,
  uppercase: false,
  wrap: true,
  ellipsis: true,
  width: 0,
  height: 0,
  marquee: false,
  marqueeSpeed: 50,
  marqueeSpacing: 40,
  glowEnabled: false,
  glowRadius: 8,
  glowColor: "#000000",
  glowBlendMode: "SrcOver",
};

const binding = (sensorType: "libre" | "plugin" | "hwinfo") => ({
  sensorType,
  valueType: "NOW" as const,
  showName: false,
  unit: "",
  overrideUnit: false,
  showUnit: false,
  precision: 0,
  overridePrecision: false,
  showThousandsSeparator: false,
  multiplicationModifier: 1,
  divisionToggle: false,
  additionModifier: 0,
  absoluteAddition: false,
  threshold1: 0,
  threshold1Color: "#000000",
  threshold2: 100,
  threshold2Color: "#000000",
});

export function createIPItem(kind: IPItemKind, name?: string): IPItem {
  switch (kind) {
    case "text":
      return { ...base(kind, name ?? "Text"), ...textBlock, text: "Text" } as IPTextItem;
    case "clock":
      return { ...base(kind, name ?? "Clock"), ...textBlock, format: "hh:mm:ss tt" } as IPClockItem;
    case "calendar":
      return { ...base(kind, name ?? "Calendar"), ...textBlock, format: "dd/MM/yyyy" } as IPCalendarItem;
    case "sensor":
      return {
        ...base(kind, name ?? "Sensor"),
        ...textBlock,
        sensor: binding("libre"),
      } as IPSensorItem;
    case "table":
      return {
        ...base(kind, name ?? "Table"),
        ...textBlock,
        sensor: binding("plugin"),
        tableFormat: "0:10|1:10",
        maxRows: 0,
        showHeader: false,
      } as IPTableItem;
    case "image":
      return {
        ...base(kind, name ?? "Image"),
        filePath: "",
        type: "FILE",
        scale: 100,
        layer: false,
        layerColor: "#77FFFFFF",
        showPanel: false,
        volume: 0,
        width: 0,
        height: 0,
        cache: true,
        readOnly: false,
        relativePath: true,
      } as IPImageItem;
    case "httpImage":
      return {
        ...base(kind, name ?? "Http Image"),
        filePath: "",
        type: "URL",
        httpUrl: "",
        scale: 100,
        layer: false,
        layerColor: "#77FFFFFF",
        showPanel: false,
        volume: 0,
        width: 0,
        height: 0,
        cache: true,
        readOnly: false,
        relativePath: false,
        sensor: binding("plugin"),
      } as IPHttpImageItem;
    case "sensorImage":
      return {
        ...base(kind, name ?? "Sensor Image"),
        sensor: binding("libre"),
        threshold1: 0,
        threshold2: 100,
        filePath: "",
        type: "FILE",
        scale: 100,
        layer: false,
        layerColor: "#77FFFFFF",
        showPanel: false,
        volume: 0,
        width: 0,
        height: 0,
        cache: true,
        readOnly: false,
        relativePath: true,
      } as IPSensorImageItem;
    case "graph":
      return {
        ...base(kind, name ?? "Graph"),
        width: 400,
        height: 50,
        min: 0,
        max: 100,
        autoValue: false,
        frame: true,
        frameColor: "#000000",
        background: true,
        backgroundColor: "#FFFFFF",
        color: "#808080",
        sensor: binding("libre"),
        graphType: "LINE",
        step: 4,
        thickness: 2,
        fill: true,
        fillColor: "#3C888DFF",
        flipX: false,
      } as IPGraphItem;
    case "bar":
      return {
        ...base(kind, name ?? "Bar"),
        width: 40,
        height: 400,
        min: 0,
        max: 100,
        autoValue: false,
        frame: true,
        frameColor: "#000000",
        background: true,
        backgroundColor: "#FFFFFF",
        color: "#808080",
        sensor: binding("libre"),
        cornerRadius: 0,
        gradient: true,
        gradientColor: "#3B3B3B",
        flipX: false,
      } as IPBarItem;
    case "donut":
      return {
        ...base(kind, name ?? "Donut"),
        width: 200,
        height: 200,
        min: 0,
        max: 100,
        autoValue: false,
        frame: true,
        frameColor: "#000000",
        background: true,
        backgroundColor: "#FFFFFF",
        color: "#808080",
        sensor: binding("libre"),
        thickness: 10,
        span: 360,
      } as IPDonutItem;
    case "gauge":
      return {
        ...base(kind, name ?? "Gauge"),
        sensor: binding("libre"),
        minValue: 0,
        maxValue: 100,
        scale: 0,
        flipX: false,
        animationSpeed: 0,
        images: [],
      } as IPGaugeItem;
    case "shape":
      return {
        ...base(kind, name ?? "Shape"),
        shapeType: "Capsule",
        width: 200,
        height: 100,
        cornerRadius: 7,
        showFrame: false,
        frameThickness: 5,
        frameColor: "#FFF8F1E1",
        showFill: true,
        fillColor: "#FFF8F1E1",
        showGradient: false,
        gradientColor: "#FF00FF00",
        gradientColor2: "#FF0000FF",
        gradientType: "Linear",
        gradientAngle: 0,
        gradientAnimationSpeed: 300,
      } as IPShapeItem;
    case "group":
      return { ...base(kind, name ?? "Group"), children: [] } as IPGroupItem;
  }
}

/** New items enter at the top of the list (highest Z) — InfoPanel behavior. */
export function addIPItem(items: IPItem[], item: IPItem): IPItem[] {
  return [...items, item];
}

export { uid };
