/**
 * .infopanel round-trip — serialize the free-canvas model to InfoPanel's
 * exact XML (profile subset + `ArrayOfDisplayItem` with `xsi:type` per
 * concrete C# class) and parse it back, so exported files open in
 * InfoPanel unchanged and InfoPanel exports import here unchanged.
 *
 * Element names, per-kind element order, and enum spellings follow the
 * ground-truth files on disk (see INFOPANEL-PROFILE-EDITOR-RESEARCH.md §3.4/7.4).
 */

import type {
  IPItem,
  IPProfile,
  IPImageItem,
  IPGaugeItem,
  IPHttpImageItem,
  IPSensorImageItem,
  IPSensorBinding,
  IPSensorValueType,
} from "./types";

/* ------------------------------------------------------------------ *
 * Enums / type names
 * ------------------------------------------------------------------ */

const TYPE_BY_KIND: Record<string, string> = {
  text: "TextDisplayItem",
  clock: "ClockDisplayItem",
  calendar: "CalendarDisplayItem",
  sensor: "SensorDisplayItem",
  table: "TableSensorDisplayItem",
  image: "ImageDisplayItem",
  httpImage: "HttpImageDisplayItem",
  sensorImage: "SensorImageDisplayItem",
  graph: "GraphDisplayItem",
  bar: "BarDisplayItem",
  donut: "DonutDisplayItem",
  gauge: "GaugeDisplayItem",
  shape: "ShapeDisplayItem",
  group: "GroupDisplayItem",
};

const KIND_BY_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_BY_KIND).map(([k, v]) => [v, k])
);

const SENSOR_TYPE_XML: Record<string, string> = {
  libre: "Libre",
  plugin: "Plugin",
  hwinfo: "HwInfo",
};
const SENSOR_TYPE_MODEL: Record<string, string> = {
  Libre: "libre",
  Plugin: "plugin",
  HwInfo: "hwinfo",
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** C# XmlSerializer: empty string → `<Tag />`, value → `<Tag>value</Tag>`. */
const el = (tag: string, v: string | number | boolean): string =>
  v === "" ? `<${tag} />` : `<${tag}>${esc(String(v))}</${tag}>`;

const b = (v: unknown) => (v ? "true" : "false");

/* ------------------------------------------------------------------ *
 * Serialization
 * ------------------------------------------------------------------ */

/** Builders return one XML element per entry; `itemXml` joins them with
 *  newlines + indentation (the C# XmlSerializer layout the parser expects). */
type Lines = string[];

function textBlockLines(it: Record<string, any>): Lines {
  const g = (k: string) => it[k] ?? "";
  return [
    el("Font", g("font")),
    el("FontSize", it.fontSize ?? 26),
    el("Bold", b(it.bold)),
    el("Italic", b(it.italic)),
    el("Underline", b(it.underline)),
    el("Strikeout", b(it.strikeout)),
    el("Color", g("color")),
    el("Uppercase", b(it.uppercase)),
    el("GlowRadius", it.glowRadius ?? 8),
    el("FontStyle", g("fontStyle")),
    el("RightAlign", b(it.rightAlign)),
    el("CenterAlign", b(it.centerAlign)),
    el("Wrap", it.wrap === undefined ? true : it.wrap),
    el("Ellipsis", it.ellipsis === undefined ? true : it.ellipsis),
    el("Width", it.width ?? 0),
    el("Height", it.height ?? 0),
    el("Marquee", b(it.marquee)),
    el("MarqueeSpeed", it.marqueeSpeed ?? 50),
    el("MarqueeSpacing", it.marqueeSpacing ?? 40),
    el("GlowEnabled", b(it.glowEnabled)),
    el("GlowColor", g("glowColor")),
    el("GlowBlendMode", it.glowBlendMode ?? "SrcOver"),
  ];
}

/** Full sensor block (ISensorItem items). */
function sensorBlock(bb: IPSensorBinding): Lines {
  const vt: IPSensorValueType = bb.valueType ?? "NOW";
  return [
    el("_valueType", vt),
    el("SensorName", bb.sensorName ?? ""),
    el("SensorType", SENSOR_TYPE_XML[bb.sensorType] ?? "Plugin"),
    el("HwInfoRemoteIndex", bb.hwinfo?.remoteIndex ?? -1),
    el("Id", bb.hwinfo?.sensor ?? 0),
    el("Instance", bb.hwinfo?.instance ?? 0),
    el("EntryId", bb.hwinfo?.entryId ?? 0),
    el("LibreSensorId", bb.libreId ?? ""),
    el("PluginSensorId", bb.pluginId ?? ""),
  ];
}

/** Table items bind through IPluginSensorItem only (ground truth). */
function tableBlock(bb: IPSensorBinding): Lines {
  const vt: IPSensorValueType = bb.valueType ?? "NOW";
  return [
    el("_valueType", vt),
    el("SensorName", bb.sensorName ?? ""),
    el("SensorType", SENSOR_TYPE_XML[bb.sensorType] ?? "Plugin"),
    el("ValueType", vt),
    el("PluginSensorId", bb.pluginId ?? ""),
  ];
}

function imageBlockLines(it: IPImageItem, forceHttpUrl = false): Lines {
  // Ground-truth order: Type ReadOnly [FilePath] RelativePath [HttpUrl] Cache ...
  const lines: Lines = [el("Type", it.type), el("ReadOnly", b(it.readOnly))];
  if (it.filePath) lines.push(el("FilePath", it.filePath));
  lines.push(el("RelativePath", b(it.relativePath)));
  if (forceHttpUrl || it.httpUrl) lines.push(el("HttpUrl", it.httpUrl ?? ""));
  lines.push(
    el("Cache", b(it.cache)),
    el("Scale", it.scale),
    el("Layer", b(it.layer)),
    el("LayerColor", it.layerColor),
    el("ShowPanel", b(it.showPanel)),
    el("Volume", it.volume),
    el("Width", it.width),
    el("Height", it.height)
  );
  return lines;
}

function imageItemXml(it: IPImageItem, level: number): string {
  const pad = "  ".repeat(level);
  const padIn = "  ".repeat(level + 1);
  const body: Lines = [
    el("Name", it.name),
    el("Hidden", b(it.hidden)),
    el("X", it.x),
    el("Y", it.y),
    el("IsLocked", b(it.locked)),
    el("Rotation", it.rotation),
    ...imageBlockLines(it),
  ];
  return [
    `${pad}<ImageDisplayItem>`,
    ...body.map((l) => padIn + l),
    `${pad}</ImageDisplayItem>`,
  ].join("\n");
}

function itemInnerLines(it: IPItem): Lines {
  const r = it as unknown as Record<string, any>;
  const base: Lines = [
    el("Name", it.kind === "text" ? (it as { text: string }).text : it.name),
    el("Hidden", b(it.hidden)),
    el("X", it.x),
    el("Y", it.y),
    el("IsLocked", b(it.locked)),
    el("Rotation", it.rotation),
  ];

  switch (it.kind) {
    case "text":
      return [...base, ...textBlockLines(r)];
    case "clock":
      return [...base, ...textBlockLines(r), el("Format", (it as { format: string }).format)];
    case "calendar":
      return [...base, ...textBlockLines(r), el("Format", (it as { format: string }).format)];
    case "sensor": {
      const bb = (it as { sensor: IPSensorBinding }).sensor;
      const vt: IPSensorValueType = bb.valueType ?? "NOW";
      return [
        ...base,
        ...textBlockLines(r),
        ...sensorBlock(bb),
        el("ValueType", vt),
        el("Threshold1", bb.threshold1 ?? 0),
        el("Threshold1Color", bb.threshold1Color ?? ""),
        el("Threshold2", bb.threshold2 ?? 0),
        el("Threshold2Color", bb.threshold2Color ?? ""),
        el("ShowName", b(bb.showName)),
        el("Unit", bb.unit ?? ""),
        el("OverrideUnit", b(bb.overrideUnit)),
        el("ShowUnit", b(bb.showUnit)),
        el("OverridePrecision", b(bb.overridePrecision)),
        el("Precision", bb.precision ?? 0),
        el("ShowThousandsSeparator", b(bb.showThousandsSeparator)),
        el("AdditionModifier", bb.additionModifier ?? 0),
        el("AbsoluteAddition", b(bb.absoluteAddition)),
        el("MultiplicationModifier", bb.multiplicationModifier ?? 1),
        el("DivisionToggle", b(bb.divisionToggle)),
      ];
    }
    case "table": {
      const t = it as import("./types").IPTableItem;
      return [
        ...base,
        ...textBlockLines(r),
        ...tableBlock(t.sensor),
        el("MaxRows", t.maxRows),
        el("ShowHeader", b(t.showHeader)),
        el("TableFormat", t.tableFormat),
      ];
    }
    case "image":
      return [...base, ...imageBlockLines(it as IPImageItem)];
    case "httpImage": {
      const h = it as IPHttpImageItem;
      return [
        ...base,
        ...imageBlockLines(h as unknown as IPImageItem, true),
        ...sensorBlock(h.sensor),
        el("ValueType", h.sensor.valueType ?? "NOW"),
      ];
    }
    case "sensorImage": {
      const si = it as IPSensorImageItem;
      return [
        ...base,
        ...imageBlockLines(si as unknown as IPImageItem),
        ...sensorBlock(si.sensor),
        el("ValueType", si.sensor.valueType ?? "NOW"),
        el("Threshold1", si.threshold1),
        el("Threshold2", si.threshold2),
      ];
    }
    case "graph":
    case "bar":
    case "donut": {
      const c = r;
      const bb = (it as { sensor: IPSensorBinding }).sensor;
      const vt: IPSensorValueType = bb.valueType ?? "NOW";
      const out: Lines = [
        ...sensorBlock(bb),
        el("ValueType", vt),
        el("MinValue", c.min ?? 0),
        el("MaxValue", c.max ?? 100),
        el("AutoValue", b(c.autoValue)),
        el("Width", c.width ?? 0),
        el("Height", c.height ?? 0),
        el("FlipX", b(c.flipX)),
        el("Frame", b(c.frame)),
        el("FrameColor", c.frameColor ?? "#000000"),
        el("Background", b(c.background)),
        el("BackgroundColor", c.backgroundColor ?? "#FFFFFF"),
        el("Color", c.color ?? "#808080"),
      ];
      if (it.kind === "graph") {
        out.push(
          el("Type", c.graphType ?? "LINE"),
          el("Thickness", c.thickness ?? 2),
          el("Step", c.step ?? 4),
          el("Fill", b(c.fill)),
          el("FillColor", c.fillColor ?? "#3C888DFF")
        );
      } else if (it.kind === "bar") {
        out.push(
          el("Gradient", b(c.gradient)),
          el("GradientColor", c.gradientColor ?? "#3B3B3B"),
          el("CornerRadius", c.cornerRadius ?? 0)
        );
      } else {
        out.push(
          el("Radius", (c.width ?? 0) / 2),
          el("Thickness", c.thickness ?? 10),
          el("Span", c.span ?? 360)
        );
      }
      return [...base, ...out];
    }
    case "gauge": {
      const g = it as IPGaugeItem;
      const bb = g.sensor;
      const vt: IPSensorValueType = bb.valueType ?? "NOW";
      return [
        ...base,
        ...sensorBlock(bb),
        el("FlipX", b(g.flipX)),
        el("ValueType", vt),
        el("MinValue", g.minValue ?? 0),
        el("MaxValue", g.maxValue ?? 100),
        el("Scale", g.scale ?? 0),
        el("AnimationSpeed", g.animationSpeed ?? 0),
        "<Images>",
        "</Images>",
        el("Width", r.width ?? 0),
        el("Height", r.height ?? 0),
      ];
    }
    case "shape": {
      const s = it as import("./types").IPShapeItem;
      return [
        ...base,
        el("Type", s.shapeType),
        el("Width", s.width),
        el("Height", s.height),
        el("CornerRadius", s.cornerRadius),
        el("ShowFrame", b(s.showFrame)),
        el("FrameThickness", s.frameThickness),
        el("FrameColor", s.frameColor),
        el("ShowFill", b(s.showFill)),
        el("FillColor", s.fillColor),
        el("ShowGradient", b(s.showGradient)),
        el("GradientColor", s.gradientColor),
        el("GradientColor2", s.gradientColor2),
        el("GradientType", s.gradientType),
        el("GradientAngle", s.gradientAngle),
        el("GradientAnimationSpeed", s.gradientAnimationSpeed),
      ];
    }
    case "group": {
      const g = it as import("./types").IPGroupItem;
      return [
        ...base,
        "<DisplayItems>",
        "</DisplayItems>",
        el("DisplayItemsCount", g.children.length),
        el("IsExpanded", false),
      ];
    }
  }
  return base;
}

function itemXml(it: IPItem, level = 1): string {
  const pad = "  ".repeat(level);
  const padIn = "  ".repeat(level + 1);
  const lines = itemInnerLines(it);
  const out: string[] = [`${pad}<DisplayItem xsi:type="${TYPE_BY_KIND[it.kind]}">`];
  for (const l of lines) {
    if (l === "<DisplayItems>") {
      const kids = (it as import("./types").IPGroupItem).children;
      out.push(`${padIn}<DisplayItems>`);
      for (const k of kids) out.push(itemXml(k, level + 2));
      out.push(`${padIn}</DisplayItems>`);
    } else if (l === "<Images>") {
      const frames = (it as IPGaugeItem).images;
      out.push(`${padIn}<Images>`);
      for (const f of frames) out.push(imageItemXml(f, level + 1));
      out.push(`${padIn}</Images>`);
    } else {
      out.push(padIn + l);
    }
  }
  out.push(`${pad}</DisplayItem>`);
  return out.join("\n");
}

const XMLNS = `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"`;

/** `DisplayItems.xml` — the item tree exactly as InfoPanel writes it. */
export function itemsToXml(items: IPItem[]): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<ArrayOfDisplayItem ${XMLNS}>\n` +
    items.map((i) => itemXml(i, 1)).join("\n") +
    `\n</ArrayOfDisplayItem>\n`
  );
}

/** `Profile.xml` — the registry subset InfoPanel exports (§3.4). */
export function profileToXml(p: IPProfile): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n<Profile>\n` +
    [
      el("Name", p.name),
      el("Width", p.width),
      el("Height", p.height),
      el("ShowFps", b(p.showFps)),
      el("BackgroundColor", p.backgroundColor),
      el("Font", p.font),
      el("FontSize", p.fontSize),
      el("Color", p.color),
      el("OpenGL", false),
      el("FontScale", p.fontScale),
    ].join("\n") +
    `\n</Profile>\n`
  );
}

/* ------------------------------------------------------------------ *
 * Parsing (XML → model)
 * ------------------------------------------------------------------ */

interface Node {
  type: string;
  fields: Record<string, string>;
  children: Node[];
  imgChildren: Node[];
}

/**
 * Line-based parser (the InfoPanel item file is one tag per line);
 * handles nested `<DisplayItem>` (groups) and `<ImageDisplayItem>`
 * (gauge frames).
 */
export function parseItemsXml(text: string, makeId: (i: number) => string): IPItem[] {
  const lines = text.split(/\r?\n/);
  const items: Node[] = [];
  const stack: Node[] = [];

  const num = (v?: string) => (v === undefined || v === "" ? 0 : parseFloat(v) || 0);
  const bool = (v?: string) => v === "true";
  const str = (v?: string) => v ?? "";

  const textBlock = (fl: Record<string, string>) => ({
    font: str(fl.Font) || undefined,
    fontSize: num(fl.FontSize),
    fontStyle: str(fl.FontStyle) || undefined,
    bold: bool(fl.Bold),
    italic: bool(fl.Italic),
    underline: bool(fl.Underline),
    strikeout: bool(fl.Strikeout),
    color: str(fl.Color) || undefined,
    rightAlign: bool(fl.RightAlign),
    centerAlign: bool(fl.CenterAlign),
    uppercase: bool(fl.Uppercase),
    wrap: fl.Wrap === undefined ? true : bool(fl.Wrap),
    ellipsis: fl.Ellipsis === undefined ? true : bool(fl.Ellipsis),
    width: num(fl.Width),
    height: num(fl.Height),
    marquee: bool(fl.Marquee),
    marqueeSpeed: fl.MarqueeSpeed === undefined ? 50 : num(fl.MarqueeSpeed),
    marqueeSpacing: fl.MarqueeSpacing === undefined ? 40 : num(fl.MarqueeSpacing),
    glowEnabled: bool(fl.GlowEnabled),
    glowRadius: fl.GlowRadius === undefined ? 8 : num(fl.GlowRadius),
    glowColor: str(fl.GlowColor) || undefined,
    glowBlendMode: str(fl.GlowBlendMode) || "SrcOver",
  });

  const binding = (fl: Record<string, string>): IPSensorBinding => {
    const out: IPSensorBinding = {
      sensorType:
        fl.SensorType === "Libre"
          ? "libre"
          : fl.SensorType === "HwInfo"
            ? "hwinfo"
            : "plugin",
      sensorName: str(fl.SensorName) || undefined,
      valueType: (fl.ValueType || fl._valueType || "NOW") as IPSensorValueType,
      showName: bool(fl.ShowName),
      unit: str(fl.Unit) || undefined,
      overrideUnit: bool(fl.OverrideUnit),
      showUnit: bool(fl.ShowUnit),
      precision: fl.Precision === undefined ? 0 : num(fl.Precision),
      overridePrecision: bool(fl.OverridePrecision),
      showThousandsSeparator: bool(fl.ShowThousandsSeparator),
      multiplicationModifier: fl.MultiplicationModifier === undefined ? 1 : num(fl.MultiplicationModifier),
      divisionToggle: bool(fl.DivisionToggle),
      additionModifier: fl.AdditionModifier === undefined ? 0 : num(fl.AdditionModifier),
      absoluteAddition: bool(fl.AbsoluteAddition),
      threshold1: num(fl.Threshold1),
      threshold1Color: str(fl.Threshold1Color) || undefined,
      threshold2: num(fl.Threshold2),
      threshold2Color: str(fl.Threshold2Color) || undefined,
    };
    if (str(fl.LibreSensorId)) out.libreId = str(fl.LibreSensorId);
    if (str(fl.PluginSensorId)) out.pluginId = str(fl.PluginSensorId);
    if (fl.SensorType === "HwInfo") {
      out.hwinfo = {
        remoteIndex: fl.HwInfoRemoteIndex === undefined ? -1 : num(fl.HwInfoRemoteIndex),
        sensor: num(fl.Id),
        instance: num(fl.Instance),
        entryId: num(fl.EntryId),
      };
    }
    return out;
  };

  const chartBase = (fl: Record<string, string>) => ({
    width: num(fl.Width),
    height: num(fl.Height),
    min: fl.MinValue === undefined ? 0 : num(fl.MinValue),
    max: fl.MaxValue === undefined ? 100 : num(fl.MaxValue),
    autoValue: bool(fl.AutoValue),
    frame: fl.Frame === undefined ? true : bool(fl.Frame),
    frameColor: str(fl.FrameColor) || "#000000",
    background: fl.Background === undefined ? true : bool(fl.Background),
    backgroundColor: str(fl.BackgroundColor) || "#FFFFFF",
    color: str(fl.Color) || "#808080",
  });

  const imageFields = (fl: Record<string, string>) => ({
    filePath: str(fl.FilePath),
    httpUrl: str(fl.HttpUrl) || undefined,
    type: fl.Type === "URL" ? ("URL" as const) : ("FILE" as const),
    scale: num(fl.Scale),
    layer: bool(fl.Layer),
    layerColor: str(fl.LayerColor) || "#77FFFFFF",
    showPanel: bool(fl.ShowPanel),
    volume: num(fl.Volume),
    width: num(fl.Width),
    height: num(fl.Height),
    cache: fl.Cache === undefined ? true : bool(fl.Cache),
    readOnly: bool(fl.ReadOnly),
    relativePath: fl.RelativePath === undefined ? true : bool(fl.RelativePath),
  });

  let seq = 0;
  const convert = (node: Node): IPItem => {
    const fl = node.fields;
    const base = {
      id: makeId(seq++),
      name: str(fl.Name) || node.type,
      x: num(fl.X),
      y: num(fl.Y),
      rotation: num(fl.Rotation),
      hidden: bool(fl.Hidden),
      locked: bool(fl.IsLocked),
    };
    switch (node.type) {
      case "TextDisplayItem":
        // C# text items have no Text element — content is the Name.
        return { ...base, kind: "text", ...textBlock(fl), text: base.name } as IPItem;
      case "ClockDisplayItem":
        return { ...base, kind: "clock", ...textBlock(fl), format: str(fl.Format) || "hh:mm:ss tt" } as IPItem;
      case "CalendarDisplayItem":
        return { ...base, kind: "calendar", ...textBlock(fl), format: str(fl.Format) || "dd/MM/yyyy" } as IPItem;
      case "SensorDisplayItem":
        return { ...base, kind: "sensor", ...textBlock(fl), sensor: binding(fl) } as IPItem;
      case "TableSensorDisplayItem":
        return {
          ...base,
          kind: "table",
          ...textBlock(fl),
          sensor: binding(fl),
          tableFormat: str(fl.TableFormat),
          maxRows: num(fl.MaxRows),
          showHeader: bool(fl.ShowHeader),
        } as IPItem;
      case "ImageDisplayItem":
        return { ...base, kind: "image", ...imageFields(fl) } as IPItem;
      case "HttpImageDisplayItem":
        return {
          ...base,
          kind: "httpImage",
          ...imageFields(fl),
          httpUrl: str(fl.HttpUrl),
          sensor: binding(fl),
        } as IPItem;
      case "SensorImageDisplayItem":
        return {
          ...base,
          kind: "sensorImage",
          ...imageFields(fl),
          sensor: binding(fl),
          threshold1: num(fl.Threshold1),
          threshold2: num(fl.Threshold2),
        } as IPItem;
      case "GraphDisplayItem":
        return {
          ...base,
          kind: "graph",
          ...chartBase(fl),
          sensor: binding(fl),
          graphType: fl.Type === "HISTOGRAM" ? ("HISTOGRAM" as const) : ("LINE" as const),
          step: fl.Step === undefined ? 4 : num(fl.Step),
          thickness: fl.Thickness === undefined ? 2 : num(fl.Thickness),
          fill: fl.Fill === undefined ? true : bool(fl.Fill),
          fillColor: str(fl.FillColor) || "#3C888DFF",
          flipX: bool(fl.FlipX),
        } as IPItem;
      case "BarDisplayItem":
        return {
          ...base,
          kind: "bar",
          ...chartBase(fl),
          sensor: binding(fl),
          cornerRadius: fl.CornerRadius === undefined ? 0 : num(fl.CornerRadius),
          gradient: fl.Gradient === undefined ? true : bool(fl.Gradient),
          gradientColor: str(fl.GradientColor) || "#3B3B3B",
          flipX: bool(fl.FlipX),
        } as IPItem;
      case "DonutDisplayItem":
        return {
          ...base,
          kind: "donut",
          ...chartBase(fl),
          sensor: binding(fl),
          thickness: fl.Thickness === undefined ? 10 : num(fl.Thickness),
          span: fl.Span === undefined ? 360 : num(fl.Span),
        } as IPItem;
      case "GaugeDisplayItem":
        return {
          ...base,
          kind: "gauge",
          sensor: binding(fl),
          minValue: fl.MinValue === undefined ? 0 : num(fl.MinValue),
          maxValue: fl.MaxValue === undefined ? 100 : num(fl.MaxValue),
          scale: num(fl.Scale),
          flipX: bool(fl.FlipX),
          animationSpeed: fl.AnimationSpeed === undefined ? 0 : num(fl.AnimationSpeed),
          width: fl.Width === undefined ? 0 : num(fl.Width),
          height: fl.Height === undefined ? 0 : num(fl.Height),
          images: node.imgChildren.map((c, i) => ({
            ...base,
            id: `${base.id}-f${i}`,
            kind: "image" as const,
            name: c.fields.Name || c.fields.FilePath || `frame-${i}`,
            x: num(c.fields.X),
            y: num(c.fields.Y),
            rotation: num(c.fields.Rotation),
            hidden: bool(c.fields.Hidden),
            locked: bool(c.fields.IsLocked),
            ...imageFields(c.fields),
          })) as IPImageItem[],
        } as unknown as IPItem;
      case "ShapeDisplayItem":
        return {
          ...base,
          kind: "shape",
          shapeType: (str(fl.Type) || "Capsule") as import("./types").IPShapeType,
          width: num(fl.Width),
          height: num(fl.Height),
          cornerRadius: fl.CornerRadius === undefined ? 0 : num(fl.CornerRadius),
          showFrame: bool(fl.ShowFrame),
          frameThickness: fl.FrameThickness === undefined ? 5 : num(fl.FrameThickness),
          frameColor: str(fl.FrameColor) || "#000000",
          showFill: fl.ShowFill === undefined ? true : bool(fl.ShowFill),
          fillColor: str(fl.FillColor) || "#000000",
          showGradient: bool(fl.ShowGradient),
          gradientColor: str(fl.GradientColor) || "#000000",
          gradientColor2: str(fl.GradientColor2) || "#000000",
          gradientType: str(fl.GradientType) || "Linear",
          gradientAngle: num(fl.GradientAngle),
          gradientAnimationSpeed: fl.GradientAnimationSpeed === undefined ? 300 : num(fl.GradientAnimationSpeed),
        } as unknown as IPItem;
      case "GroupDisplayItem":
        return {
          ...base,
          kind: "group",
          children: node.children.map((c) => convert(c)),
        } as IPItem;
      default:
        console.warn(`[ip/xml] unknown item type: ${node.type}`);
        return { ...base, kind: "text", ...textBlock(fl), text: base.name } as IPItem;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let m = line.match(/^<DisplayItem\s+xsi:type="(\w+)">$/);
    if (m) {
      stack.push({ type: m[1], fields: {}, children: [], imgChildren: [] });
      continue;
    }
    if (line === "<ImageDisplayItem>" && stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top.fields.__section === "Images" || top.type === "GaugeDisplayItem") {
        stack.push({ type: "ImageDisplayItem", fields: {}, children: [], imgChildren: [] });
        continue;
      }
    }
    if (line === "</DisplayItem>" || line === "</ImageDisplayItem>") {
      const node = stack.pop();
      if (!node) continue;
      if (stack.length === 0) items.push(node);
      else {
        const p = stack[stack.length - 1];
        const isFrame = p.type === "GaugeDisplayItem";
        if (isFrame) p.imgChildren.push(node);
        else p.children.push(node);
      }
      continue;
    }
    if (line === "<DisplayItems>") {
      if (stack.length) stack[stack.length - 1].fields.__section = "Items";
      continue;
    }
    if (line === "</DisplayItems>") {
      if (stack.length) delete stack[stack.length - 1].fields.__section;
      continue;
    }
    if (line === "<Images>") {
      if (stack.length) stack[stack.length - 1].fields.__section = "Images";
      continue;
    }
    if (line === "</Images>") {
      if (stack.length) delete stack[stack.length - 1].fields.__section;
      continue;
    }

    const s = line.match(/^<([A-Za-z_][\w.]*)(?:\s[^>]*)?>([^<]*)<\/\1>$/);
    if (s && stack.length > 0) {
      stack[stack.length - 1].fields[s[1]] = s[2];
      continue;
    }
    const e = line.match(/^<([A-Za-z_][\w.]*)(?:\s[^>]*)?\/>\s*$/);
    if (e && stack.length > 0) {
      stack[stack.length - 1].fields[e[1]] = "";
    }
  }

  return items.map(convert);
}

/** Parse an exported/InfoPanel `Profile.xml` into profile fields. */
export function parseProfileXml(text: string): Partial<
  Pick<
    IPProfile,
    | "name"
    | "width"
    | "height"
    | "showFps"
    | "backgroundColor"
    | "font"
    | "fontSize"
    | "color"
    | "fontScale"
  >
> {
  const fl: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const s = line.match(/^<([A-Za-z_][\w.]*)(?:\s[^>]*)?>([^<]*)<\/\1>$/);
    if (s) fl[s[1]] = s[2];
  }
  return {
    name: fl.Name,
    width: fl.Width === undefined ? 800 : parseInt(fl.Width, 10) || 0,
    height: fl.Height === undefined ? 600 : parseInt(fl.Height, 10) || 0,
    showFps: fl.ShowFps === "true",
    backgroundColor: fl.BackgroundColor || "#00FFFFFF",
    font: fl.Font || "",
    fontSize: fl.FontSize === undefined ? 26 : parseInt(fl.FontSize, 10) || 26,
    color: fl.Color || "#FFFFFFFF",
    fontScale: fl.FontScale === undefined ? 1.33 : parseFloat(fl.FontScale) || 1.33,
  };
}

/** Case-insensitive filename lookup inside an unzipped `.infopanel`. */
export function zipFind(
  files: Map<string, Uint8Array>,
  name: string
): Uint8Array | undefined {
  const want = name.toLowerCase();
  for (const key of files.keys()) {
    if (key.toLowerCase() === want) return files.get(key);
  }
  return undefined;
}

export { KIND_BY_TYPE, SENSOR_TYPE_MODEL };
