import type { ModernChrome } from "@/components/modern-chrome";
import { settingKeys, type ModuleSetting, type ModuleSettings } from "./types";

/**
 * The standard per-widget customization block. Every modern widget adopts
 * it (see `docs/widget-settings.md`) so users get the same options on
 * every widget, and a new widget gets them by spreading this array into
 * its `settings`:
 *
 *   settings: [...STANDARD_SETTINGS, ...MODULE_SPECIFIC]
 *
 * Keys are plain config values, read back via `effectiveSettings` and
 * turned into the component's `chrome` prop by `chromeOf`:
 *
 * - `preset` / `layout` / `surface` — style preset, layout variant, surface
 * - Widget: `label`, `icon`
 * - Size & alignment: `autoScale`, `scale`, `alignX`, `alignY`
 * - Typography: `textColor`, `mutedColor`, `font`, `fontWeight`, `labelCase`
 * - Spacing & shape: `padding`, `gap`, `radius`, `stroke`
 * - Colors & surface: `accent`, `background`, `backgroundOn`, `surfaceOpacity`,
 *   `blur` (the last two on surfaced widgets only)
 * - Border & effects: `borderWidth`, `borderColor`, `glow`, `glowColor`
 *   (surfaced widgets only)
 * - Advanced: `customCss` (every widget)
 *
 * Widgets without layout variants or surfaces (the plain modules) spread
 * `STYLE_SETTINGS` only. Module-specific options come after these and keep
 * their own keys and their own `group` (the inspector category, see
 * `inspector-categories.ts`).
 * Modules that can be idle (see `DashboardModule.isIdle`) add
 * `IDLE_SETTING`.
 *
 * The keys in `PROFILE_STYLE_KEYS` can also be set once per profile
 * (`MonitorProfile.style`); a widget's own value overrides the profile's.
 */

/**
 * The general inspector categories (see `inspector-categories.ts`). Module
 * settings use their own group names instead; these are the standard block's.
 */
export const GROUP_WIDGET = "Widget";
export const GROUP_SIZE = "Size & alignment";
export const GROUP_TYPOGRAPHY = "Typography";
export const GROUP_SPACING = "Spacing & shape";
export const GROUP_COLORS = "Colors & surface";
export const GROUP_EFFECTS = "Border & effects";
export const GROUP_ADVANCED = "Advanced";

/** "auto" plus pixel steps, for the spacing selects. */
const pxOptions = (values: number[]) => [
  { value: "auto", label: "Auto" },
  ...values.map((v) => ({ value: String(v), label: `${v}px` })),
];

/** Size, alignment, spacing, colors and type — every widget gets these. */
export const STYLE_SETTINGS: ModuleSetting[] = [
  {
    key: "autoScale",
    label: "Scale with the zone",
    type: "boolean",
    default: true,
    group: GROUP_SIZE,
  },
  {
    key: "scale",
    label: "Size (%)",
    type: "number",
    default: 100,
    min: 50,
    max: 200,
    step: 5,
    group: GROUP_SIZE,
  },
  {
    // One 3×3 picker for both axes; "Spread" (alignX "between") is a toggle.
    key: "alignX",
    keyY: "alignY",
    label: "Alignment",
    type: "align",
    default: "auto",
    keywords: ["horizontal", "vertical", "left", "right", "top", "bottom", "middle", "center", "spread"],
    group: GROUP_SIZE,
  },
  {
    key: "padding",
    label: "Inner padding",
    type: "select",
    default: "auto",
    options: pxOptions([0, 4, 8, 12, 16, 20, 24, 32, 48]),
    group: GROUP_SPACING,
  },
  {
    key: "gap",
    label: "Gap between items",
    type: "select",
    default: "auto",
    options: pxOptions([0, 4, 8, 12, 16, 24, 32, 48]),
    group: GROUP_SPACING,
  },
  {
    key: "radius",
    label: "Corner radius",
    type: "select",
    default: "auto",
    options: [...pxOptions([0, 4, 8, 12, 16, 20, 28]), { value: "999", label: "Pill" }],
    group: GROUP_SPACING,
  },
  { key: "textColor", label: "Text color", type: "color", default: "", group: GROUP_TYPOGRAPHY },
  { key: "mutedColor", label: "Secondary text color", type: "color", default: "", group: GROUP_TYPOGRAPHY },
  {
    key: "font",
    label: "Font",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Theme" },
      { value: "sans", label: "Sans" },
      { value: "rounded", label: "Rounded" },
      { value: "serif", label: "Serif" },
      { value: "mono", label: "Mono" },
    ],
    group: GROUP_TYPOGRAPHY,
  },
  {
    key: "fontWeight",
    label: "Value weight",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto" },
      { value: "400", label: "Regular" },
      { value: "500", label: "Medium" },
      { value: "600", label: "Semibold" },
      { value: "700", label: "Bold" },
      { value: "800", label: "Heavy" },
    ],
    group: GROUP_TYPOGRAPHY,
  },
  {
    key: "labelCase",
    label: "Label case",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto" },
      { value: "uppercase", label: "UPPERCASE" },
      { value: "none", label: "As written" },
      { value: "capitalize", label: "Capitalized" },
    ],
    group: GROUP_TYPOGRAPHY,
  },
  {
    key: "stroke",
    label: "Ring / bar thickness (%)",
    type: "number",
    default: 100,
    min: 50,
    max: 250,
    step: 10,
    group: GROUP_SPACING,
  },
  {
    key: "customCss",
    label: "Custom CSS (scoped to this widget; :scope = its root)",
    type: "text",
    multiline: true,
    default: "",
    group: GROUP_ADVANCED,
  },
];

/** Border, glow, opacity and blur of the widget's surface box. */
export const SURFACE_SETTINGS: ModuleSetting[] = [
  {
    key: "borderWidth",
    label: "Border width",
    type: "select",
    default: "auto",
    options: pxOptions([0, 1, 2, 3, 4, 6]),
    group: GROUP_EFFECTS,
  },
  { key: "borderColor", label: "Border color", type: "color", default: "", group: GROUP_EFFECTS },
  {
    key: "glow",
    label: "Edge glow",
    type: "select",
    default: "none",
    options: [
      { value: "none", label: "None" },
      { value: "soft", label: "Soft" },
      { value: "strong", label: "Strong" },
    ],
    group: GROUP_EFFECTS,
  },
  {
    key: "glowColor",
    label: "Glow color (empty = accent)",
    type: "color",
    default: "",
    group: GROUP_EFFECTS,
  },
  {
    key: "surfaceOpacity",
    label: "Surface opacity (%)",
    type: "number",
    default: 100,
    min: 0,
    max: 100,
    step: 5,
    group: GROUP_COLORS,
  },
  {
    key: "blur",
    label: "Background blur",
    type: "select",
    default: "auto",
    options: pxOptions([0, 4, 8, 16, 24, 40]),
    group: GROUP_COLORS,
  },
];

/** Opt-in for modules with an `isIdle` rule. */
export const IDLE_SETTING: ModuleSetting = {
  key: "hideWhenIdle",
  label: "Hide when idle",
  type: "boolean",
  default: false,
};

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
      { value: "theme", label: "Theme" },
    ],
  },
  { key: "label", label: "Custom title", type: "text", default: "", group: GROUP_WIDGET },
  { key: "icon", label: "Icon", type: "icon", default: "", group: GROUP_WIDGET },
  { key: "accent", label: "Accent color", type: "color", default: "", group: GROUP_COLORS },
  { key: "background", label: "Background image", type: "image", default: "", group: GROUP_COLORS },
  {
    key: "backgroundOn",
    label: "Use as background",
    type: "boolean",
    default: false,
    group: GROUP_COLORS,
  },
  ...STYLE_SETTINGS,
  ...SURFACE_SETTINGS,
];

/** Standard keys a panel has no use for (no layout variants, design size or rings of its own). */
const NOT_FOR_PANELS: ReadonlySet<string> = new Set(["preset", "layout", "autoScale", "stroke"]);

/**
 * A custom panel's look (its placement's settings): the standard block
 * minus what panels don't have, with the panel's cards added to the
 * surfaces and the custom title as the panel title.
 */
export const PANEL_SETTINGS: ModuleSetting[] = STANDARD_SETTINGS.filter(
  (s) => !NOT_FOR_PANELS.has(s.key)
).map((s) => {
  if (s.key === "label") return { ...s, label: "Title (empty = hidden)" };
  if (s.key !== "surface") return s;
  return {
    ...s,
    default: "panel",
    options: [
      { value: "none", label: "None" },
      { value: "panel", label: "Card" },
      { value: "bordered", label: "Bordered card" },
      ...(s.options ?? []),
    ],
  };
});

const standard = (key: string): ModuleSetting => STANDARD_SETTINGS.find((s) => s.key === key)!;

/**
 * The plain card widgets (the legacy modules, the "Other sensors" cards):
 * a surface — "Theme" by default, the shadcn card they always had — an
 * accent, and the style and surface options (`StyledCard` draws them).
 */
export const CARD_SETTINGS: ModuleSetting[] = [
  { ...standard("surface"), default: "theme" },
  standard("accent"),
  ...STYLE_SETTINGS,
  ...SURFACE_SETTINGS,
];

/**
 * The look-only keys: what a profile can set for all its widgets, and what
 * "Copy style" / style presets carry. Content, layout, title, icon and
 * background image stay per widget.
 */
export const PROFILE_STYLE_KEYS: ReadonlySet<string> = new Set([
  "surface",
  "accent",
  ...STYLE_SETTINGS.flatMap(settingKeys),
  ...SURFACE_SETTINGS.flatMap(settingKeys),
]);

/** The standard settings a profile can set (see `PROFILE_STYLE_KEYS`). */
export const PROFILE_STYLE_SETTINGS: ModuleSetting[] = STANDARD_SETTINGS.filter((s) =>
  PROFILE_STYLE_KEYS.has(s.key)
);

/** Just the style keys of a settings map. */
export function styleOf(settings: ModuleSettings | undefined): ModuleSettings {
  return Object.fromEntries(
    Object.entries(settings ?? {}).filter(([key]) => PROFILE_STYLE_KEYS.has(key))
  );
}

/**
 * Give a widget another widget's (or a preset's) style: its own style
 * values are replaced wholesale — keys the source leaves unset fall back
 * to the profile / defaults again — and keys the widget has no setting for
 * are skipped. Content settings are untouched. `undefined` = no settings.
 */
export function replaceStyle(
  settings: ModuleSettings | undefined,
  style: ModuleSettings,
  supported: ReadonlySet<string>
): ModuleSettings | undefined {
  const content = Object.entries(settings ?? {}).filter(([key]) => !PROFILE_STYLE_KEYS.has(key));
  const applied = Object.entries(styleOf(style)).filter(([key]) => supported.has(key));
  const next = Object.fromEntries([...content, ...applied]);
  return Object.keys(next).length > 0 ? next : undefined;
}

/** The standard block as a settings map (defaults only). */
export const STANDARD_DEFAULTS: ModuleSettings = Object.fromEntries(
  STANDARD_SETTINGS.flatMap((s) => settingKeys(s).map((key) => [key, s.default]))
);

/** A px select value ("auto" → undefined). */
function px(value: unknown): number | undefined {
  const n = Number(value);
  return value === "auto" || value === "" || value === undefined || !Number.isFinite(n)
    ? undefined
    : Math.max(0, n);
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const percent = (value: unknown, fallback = 100): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n / 100 : fallback / 100;
};

/** A 0–100 % value as 0–1 (missing = fully opaque; 0 is allowed). */
const fraction = (value: unknown): number => {
  const n = value === "" || value === undefined ? NaN : Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n / 100)) : 1;
};

/**
 * Build a component's `chrome` prop from a module's resolved settings
 * (the output of `effectiveSettings`). Every widget passes this to its
 * component so the standard options render identically. Missing keys
 * (a module without some of the block) fall back to the defaults.
 */
export function chromeOf(cfg: ModuleSettings): ModernChrome {
  return {
    label: String(cfg.label ?? ""),
    icon: String(cfg.icon ?? ""),
    accent: String(cfg.accent ?? ""),
    background: String(cfg.background ?? ""),
    backgroundOn: Boolean(cfg.backgroundOn),
    autoScale: cfg.autoScale === undefined ? true : Boolean(cfg.autoScale),
    scale: percent(cfg.scale),
    alignX: pick(cfg.alignX, ["auto", "start", "center", "end", "between"] as const, "auto"),
    alignY: pick(cfg.alignY, ["auto", "start", "center", "end"] as const, "auto"),
    padding: px(cfg.padding),
    gap: px(cfg.gap),
    radius: px(cfg.radius),
    textColor: String(cfg.textColor ?? ""),
    mutedColor: String(cfg.mutedColor ?? ""),
    font: pick(cfg.font, ["auto", "sans", "rounded", "serif", "mono"] as const, "auto"),
    fontWeight: pick(cfg.fontWeight, ["auto", "400", "500", "600", "700", "800"] as const, "auto"),
    labelCase: pick(cfg.labelCase, ["auto", "uppercase", "none", "capitalize"] as const, "auto"),
    stroke: percent(cfg.stroke),
    borderWidth: px(cfg.borderWidth),
    borderColor: String(cfg.borderColor ?? ""),
    glow: pick(cfg.glow, ["none", "soft", "strong"] as const, "none"),
    glowColor: String(cfg.glowColor ?? ""),
    surfaceOpacity: fraction(cfg.surfaceOpacity),
    blur: px(cfg.blur),
    customCss: String(cfg.customCss ?? ""),
  };
}
