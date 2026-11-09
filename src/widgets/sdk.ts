// The widget SDK (Phase 6a): what a code widget's bundle is built against, `defineWidget` and its types, the settings types and the
// core primitives. Nothing imports this file; tools/widgets/sdk-types.mjs reads it and writes its declarations, with every type they
// name, to public/widget-sdk/infopanel-widget-sdk.d.ts, the file the Widgets page links to (Gate 0 answer 6: a downloadable .d.ts now,
// an npm package later).
export type { PackageWidgetDefinition, WidgetControlsProps, WidgetDefinition, WidgetMigration, WidgetPreset, WidgetProps, WidgetRender, WidgetSample } from "./define";
export { defineWidget } from "./define";
export type { ModuleSetting, ModuleSettings } from "@/modules/types";
export * from "./core/primitives";
