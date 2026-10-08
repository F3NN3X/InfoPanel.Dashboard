import type { ModernChrome } from "@/components/modern-chrome";
import type { ModuleSetting, ModuleSettings } from "./types";

/**
 * The standard per-widget customization block. Every modern widget adopts
 * it (see `docs/widget-settings.md`) so users get the same options on
 * every widget, and a new widget gets them by spreading this array into
 * its `settings`:
 *
 *   settings: [...STANDARD_SETTINGS, ...MODULE_SPECIFIC]
 *
 * Keys are plain config values, read back via `effectiveSettings`:
 *
 * - `preset`       — one-click style preset (applies surface + tint +
 *                    accent in one go; the individual options stay editable)
 * - `layout`       — auto / card / standard / compact / simple
 * - `surface`      — glass / matte-light / matte-dark
 * - `label`        — custom title line (empty = the widget's own header)
 * - `icon`         — a key from `lib/widget-icons.ts` (empty = no icon)
 * - `accent`       — accent color for fills / the header icon ("" = auto)
 * - `background`   — background image URL
 * - `backgroundOn` — use that image behind the surface
 *
 * Module-specific options come after these and keep their own keys.
 */
export const STANDARD_SETTINGS: ModuleSetting[] = [
  {
    key: "preset",
    label: "Preset",
    type: "select",
    default: "default",
    options: [
      { value: "default", label: "Default" },
      { value: "dark", label: "Dark", applies: { surface: "matte-dark", tint: false } },
      { value: "light", label: "Light", applies: { surface: "matte-light", tint: false } },
      { value: "vivid", label: "Vivid", applies: { surface: "glass", tint: true } },
      {
        value: "mono",
        label: "Mono",
        applies: { surface: "matte-dark", tint: false, accent: "#fafafa" },
      },
    ],
  },
  {
    key: "layout",
    label: "Layout",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto (fit to zone)" },
      { value: "card", label: "Card" },
      { value: "standard", label: "Standard" },
      { value: "compact", label: "Compact bar" },
      { value: "simple", label: "Simple" },
    ],
  },
  {
    key: "surface",
    label: "Surface",
    type: "select",
    default: "glass",
    options: [
      { value: "glass", label: "Glass" },
      { value: "matte-light", label: "Matte (light)" },
      { value: "matte-dark", label: "Matte (dark)" },
    ],
  },
  { key: "label", label: "Custom title", type: "text", default: "" },
  { key: "icon", label: "Icon", type: "icon", default: "" },
  { key: "accent", label: "Accent color", type: "color", default: "" },
  { key: "background", label: "Background image", type: "image", default: "" },
  { key: "backgroundOn", label: "Use as background", type: "boolean", default: false },
];

/** The standard block as a settings map (defaults only). */
export const STANDARD_DEFAULTS: ModuleSettings = Object.fromEntries(
  STANDARD_SETTINGS.map((s) => [s.key, s.default])
);

/**
 * Build a component's `chrome` prop from a module's resolved settings
 * (the output of `effectiveSettings`). Every modern widget passes this to
 * its component so the standard options render identically.
 */
export function chromeOf(cfg: ModuleSettings): ModernChrome {
  return {
    label: String(cfg.label ?? ""),
    icon: String(cfg.icon ?? ""),
    accent: String(cfg.accent ?? ""),
    background: String(cfg.background ?? ""),
    backgroundOn: Boolean(cfg.backgroundOn),
  };
}
