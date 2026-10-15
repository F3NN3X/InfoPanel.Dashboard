import {
  AppWindow,
  Bell,
  Blocks,
  Brush,
  Clock,
  Code,
  Database,
  Frame,
  Image,
  LayoutGrid,
  LayoutTemplate,
  type LucideIcon,
  Monitor,
  MousePointerClick,
  Palette,
  PanelTop,
  Plug,
  Repeat,
  Ruler,
  Scaling,
  Settings2,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  SquareDashed,
  Type,
  UserRound,
  Wand2,
} from "lucide-react";
import type { InspectorSection } from "../inspector-model";

/**
 * Each inspector section's icon (its accordion header) and one-word label
 * (the phone sheet's tool tiles). Sections are matched by their id without
 * the Global style prefix (`gs-`) or a split tab's suffix (`@content`);
 * a widget's own categories fall back to a generic icon and their title's
 * first word.
 */
const BY_ID: Record<string, { icon: LucideIcon; short: string }> = {
  widget: { icon: AppWindow, short: "Widget" },
  look: { icon: Brush, short: "Look" },
  size: { icon: Scaling, short: "Size" },
  typography: { icon: Type, short: "Type" },
  spacing: { icon: Ruler, short: "Shape" },
  colors: { icon: Palette, short: "Colors" },
  effects: { icon: Sparkles, short: "Effects" },
  advanced: { icon: Code, short: "Advanced" },
  bound: { icon: Database, short: "Data" },
  "panel-data": { icon: Database, short: "Data" },
  pick: { icon: MousePointerClick, short: "Widget" },
  frame: { icon: Frame, short: "Frame" },
  panel: { icon: LayoutTemplate, short: "Panel" },
  layout: { icon: LayoutGrid, short: "Layout" },
  background: { icon: Image, short: "Backdrop" },
  widgets: { icon: Blocks, short: "Widgets" },
  json: { icon: Code, short: "JSON" },
  "item-widgetKind": { icon: SquareDashed, short: "Selected" },
  "item-widgetDisplay": { icon: SlidersHorizontal, short: "Display" },
  "item-widgetPlacement": { icon: Scaling, short: "Place" },
  "item-widgetColors": { icon: Palette, short: "Colors" },
  "item-widgetAdvanced": { icon: Code, short: "Advanced" },
  profile: { icon: Monitor, short: "Profile" },
  "profile-inherit": { icon: UserRound, short: "Inherit" },
  "profile-selection": { icon: MousePointerClick, short: "Pick" },
  "profile-rotate": { icon: Repeat, short: "Rotate" },
  "profile-island": { icon: PanelTop, short: "Island" },
  "ap-scope": { icon: Shapes, short: "Scope" },
  "ap-presets": { icon: Wand2, short: "Skins" },
  "ap-theme": { icon: Palette, short: "Theme" },
  "ap-bg": { icon: Image, short: "Backdrop" },
  "g-type": { icon: Type, short: "Font" },
  "g-clock": { icon: Clock, short: "Clock" },
  "g-display": { icon: Monitor, short: "Display" },
  "g-studio": { icon: Settings2, short: "Studio" },
  "g-conn": { icon: Plug, short: "API" },
  alerts: { icon: Bell, short: "Alerts" },
};

/** A section's id without the Global style prefix and a split tab's suffix. */
const baseId = (id: string) => id.replace(/^gs-/, "").replace(/@.*$/, "");

export function sectionIcon(section: Pick<InspectorSection, "id">): LucideIcon {
  return BY_ID[baseId(section.id)]?.icon ?? SlidersHorizontal;
}

/** One word for a tool tile ("Colors & surface" → "Colors"). */
export function sectionShort(section: Pick<InspectorSection, "id" | "title">): string {
  return BY_ID[baseId(section.id)]?.short ?? (section.title.split(/[\s&·,/]+/).find(Boolean) ?? section.title);
}
