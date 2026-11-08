// The shape of a widget folder's widget.ts (`src/widgets/<kebab-id>/`). Built-ins and (later) widget packages share it;
// `folder-module.ts` turns one into the DashboardModule the registry groups make with templateModule.
import type { ComponentType } from "react";
import type { ApiSources } from "@/lib/catalog";
import type { IslandSourceDef } from "@/lib/island/sources";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import type { ShellProps, WidgetMeta } from "./core/types";
import type { TemplateOptions } from "./module";
import type { InspectorMeta } from "./registry/inspector-meta";

/** The props templateModule hands every widget component. */
export type WidgetProps<P extends object> = ShellProps & { look?: ModuleSettings } & P;

/** How the widget draws: its component's chunk and the props its stored settings make. */
export interface WidgetRender<P extends object> {
  /** A dynamic import of the folder's component. The registry wraps it in lazyWidget, so it is its own chunk. */
  load: () => Promise<{ default: ComponentType<WidgetProps<P>> }>;
  /** Resolved settings (and the zone's saved values) to props. */
  toProps: TemplateOptions<P>["toProps"];
  /** Prefixes read but not owned (`DashboardModule.reads`). */
  reads?: string[];
  /** Overrides `meta.name` as the module title. */
  title?: string;
  /** The settings block before the widget's own; default the standard block. */
  base?: ModuleSetting[];
}

/** A slot whose data stays central for built-ins: settings migrations (`src/lib/settings-migrate*.ts`), demo and QA data. */
export type Central = "central";

/** Reserved for packages: a widget's own settings version and its steps. Built-ins say "central". */
export interface WidgetMigration {
  from: number;
  up: (saved: ModuleSettings) => ModuleSettings;
}

/** A named bundle of a view, option values and a size. */
export interface WidgetPreset {
  id: string;
  name: string;
  view?: string;
  settings: ModuleSettings;
  size: [number, number];
  default?: true;
}

/** What a package ships for previews and QA (built-ins keep `src/widgets/__fixtures__` and widget-qa). */
export interface WidgetSample {
  sensors: Record<string, string | number>;
  settings?: ModuleSettings;
}

/** controls.tsx's default export: shown in the Content tab next to the schema rows. */
export interface WidgetControlsProps {
  values: ModuleSettings;
  onPatch: (patch: ModuleSettings) => void;
  sources: ApiSources | null;
}

export interface WidgetDefinition<P extends object = object> {
  /** The catalog entry, views and view key included, from the folder's meta.ts. */
  meta: WidgetMeta;
  /** Header, small-zone shape, Units & Thresholds rows (what `INSPECTOR_META` holds for the group widgets). */
  inspector: InspectorMeta;
  /** The widget's own settings, after the standard block. */
  settings: ModuleSetting[];
  render: WidgetRender<P>;
  /** "Send to island": for built-ins, a def from the central island files. */
  island?: IslandSourceDef;
  /** Built-ins: "central". Packages: their own steps and version. */
  migrations: Central | { version: number; steps: readonly WidgetMigration[] };
  /** Built-ins: "central" (fixtures, widget-qa demo settings) or `{ none: why }`. Packages: a loader. */
  sample: Central | { none: string } | (() => Promise<{ default: WidgetSample }>);
  /** Packages only. A built-in ships presets.ts and controls.tsx as files, which the generator wires into a studio-only module. */
  presets?: () => Promise<{ default: readonly WidgetPreset[] }>;
  controls?: () => Promise<{ default: ComponentType<WidgetControlsProps> }>;
}

/** Identity at run time: the type is the point. */
export const defineWidget = <P extends object>(def: WidgetDefinition<P>): WidgetDefinition<P> => def;
