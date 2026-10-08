import {
  Activity,
  Bluetooth,
  Brain,
  Cpu,
  Gauge,
  Gamepad2,
  Headphones,
  Heart,
  Leaf,
  Monitor,
  Moon,
  Music,
  Radio,
  Snowflake,
  Sun,
  Thermometer,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * The icon set available to any widget's "Icon" option (ModuleSetting of
 * type "icon"). A name → lucide component map, so options stay plain
 * strings in the config.
 */
export const WIDGET_ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  bluetooth: Bluetooth,
  brain: Brain,
  cpu: Cpu,
  gauge: Gauge,
  gamepad: Gamepad2,
  headphones: Headphones,
  heart: Heart,
  leaf: Leaf,
  monitor: Monitor,
  moon: Moon,
  music: Music,
  radio: Radio,
  snowflake: Snowflake,
  sun: Sun,
  thermometer: Thermometer,
  wifi: Wifi,
  zap: Zap,
};

/** A setting's icon value → component, or undefined for "none". */
export function widgetIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  return WIDGET_ICONS[name];
}
