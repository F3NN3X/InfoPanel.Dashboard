import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";

/** A setting reduced to what stored configs depend on: key, default, type, group and option values. */
export const settingRow = (s: ModuleSetting) => [s.key, s.default, s.type, s.group ?? null, s.options?.map((o) => o.value) ?? null, s.tab ?? null, s.advanced ?? null];

/** Every `select` setting's options as `[key, value]` (the enum values a render test should cover). */
export const enumValues = (mod: DashboardModule): [string, string][] =>
  (mod.settings ?? []).flatMap((s) => (s.type === "select" ? (s.options ?? []).map((o): [string, string] => [s.key, o.value]) : []));

/** The module's defaults with the given overrides. */
export const withDefaults = (mod: DashboardModule, over: ModuleSettings = {}): ModuleSettings => ({
  ...Object.fromEntries((mod.settings ?? []).map((s) => [s.key, s.default])),
  ...over,
});
