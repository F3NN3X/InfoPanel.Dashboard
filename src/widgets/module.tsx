// The factory that turns a template widget (a component over flat data, `kit.ts`) into a
// DashboardModule: standard look settings, shell props from the resolved settings, Library fields.
import { useEffect, useMemo, type ComponentType } from "react";
import { STANDARD_SETTINGS } from "@/modules/standard-settings";
import { effectiveSettings, type DashboardModule, type ModuleSetting, type ModuleSettings, type SensorMap } from "@/modules/types";
import { ensureSkinFonts } from "./core/fonts";
import { SKINS } from "./core/theme";
import type { ShellProps, WidgetMeta } from "./core/types";
import { toFlat } from "./data-adapter";

export interface TemplateOptions<P extends object> {
  meta: WidgetMeta;
  Component: ComponentType<ShellProps & { look?: ModuleSettings } & P>;
  /** The template's own settings, after the standard block. */
  settings: ModuleSetting[];
  /** The template's props from its resolved settings. */
  toProps: (settings: ModuleSettings) => P;
  isIdle?: DashboardModule["isIdle"];
  /** Further prefixes the template reads without owning them (`DashboardModule.reads`). */
  prefixes?: string[];
  /** Overrides `meta.name` as the module title. */
  title?: string;
}

/** A select value that means "unset": `auto` or empty. */
const chosen = (v: unknown): string | undefined => (v === undefined || v === "" || v === "auto" ? undefined : String(v));

/** The shell props the standard look settings set; `auto` / empty leave the shell's own choice. */
export function shellProps(s: ModuleSettings): Partial<ShellProps> {
  const radius = Number(chosen(s.radius));
  return {
    accent: chosen(s.accent),
    surface: chosen(s.surface),
    radius: chosen(s.radius) !== undefined && Number.isFinite(radius) ? radius : undefined,
    skin: chosen(s.skin),
    variant: s.variant === "studio" ? "studio" : s.variant === "default" ? "default" : undefined,
    graph: chosen(s.graph),
    meter: chosen(s.meter),
    compactView: s.compactView === "off" ? "off" : undefined,
    title: chosen(s.label),
  };
}

/**
 * The look with the surface decided: a value set at any style level wins, else a chosen skin
 * brings its own surface, else `glass` (the default, so skin `auto` configs are unchanged).
 * `effectiveSettings` always fills `surface`, so `saved` (resolved, not defaulted) says if it was set.
 */
export function withSkinSurface(look: ModuleSettings, saved: ModuleSettings | undefined): ModuleSettings {
  if (chosen(saved?.surface)) return look;
  const skin = chosen(look.skin);
  return { ...look, surface: (skin && SKINS[skin]?.surface) || "glass" };
}

export function templateModule<P extends object>({ meta, Component, settings, toProps, isIdle, prefixes, title }: TemplateOptions<P>): DashboardModule {
  const all = [...STANDARD_SETTINGS, ...settings];
  const mod: DashboardModule = {
    id: meta.id,
    title: title ?? meta.name,
    minCols: meta.minSize[0],
    minRows: meta.minSize[1],
    prefixes: meta.prefixes,
    reads: prefixes,
    settings: all,
    isIdle,
    category: meta.category,
    icon: meta.icon,
    description: meta.description,
    defaultSize: meta.defaultSize,
    render: (sensors, saved) => <TemplateZone sensors={sensors} saved={saved} />,
  };
  function TemplateZone({ sensors, saved }: { sensors: SensorMap; saved?: ModuleSettings }) {
    const data = useMemo(() => toFlat(sensors), [sensors]);
    const look = withSkinSurface(effectiveSettings(mod, saved), saved);
    const skin = chosen(look.skin);
    useEffect(() => {
      if (skin) ensureSkinFonts(skin);
    }, [skin]);
    return <Component data={data} {...shellProps(look)} {...toProps(look)} look={look} />;
  }
  return mod;
}
