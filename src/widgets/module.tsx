// The factory that turns a template widget (a component over flat data, `kit.ts`) into a
// DashboardModule: standard look settings, shell props from the resolved settings, Library fields.
import { useEffect, useMemo, type ComponentType } from "react";
import { STANDARD_SETTINGS } from "@/modules/standard-settings";
import { effectiveSettings, type DashboardModule, type ModuleSetting, type ModuleSettings, type SensorMap } from "@/modules/types";
import { ensureSkinFonts } from "./core/fonts";
import { SKINS } from "./core/theme";
import type { ShellProps, WidgetMeta } from "./core/types";
import { toFlat } from "./data-adapter";

/**
 * A legacy module id that renders through a template: its own identity, footprint and full
 * settings, hidden from the Library. Its category, icon, description and drop size come from the
 * Library's legacy tables, as before the port.
 */
export interface AliasOptions {
  id: string;
  title: string;
  minCols: number;
  minRows: number;
  prefixes: string[];
  /** The legacy settings array, kept key for key; default the settings block + the template's own. */
  settings?: ModuleSetting[];
  /** The legacy "nothing to show" rule over the resolved settings: the zone renders nothing while it holds. */
  hidden?: (sensors: SensorMap, settings: ModuleSettings) => boolean;
}

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
  /** The settings block before the template's own; default `STANDARD_SETTINGS`. */
  base?: ModuleSetting[];
  /** Makes this a Library-hidden alias of the template under a legacy id. */
  alias?: AliasOptions;
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
 * `fallback` is the module's own surface default (`theme` for the plain card widgets).
 */
export function withSkinSurface(look: ModuleSettings, saved: ModuleSettings | undefined, fallback = "glass"): ModuleSettings {
  if (chosen(saved?.surface)) return look;
  const skin = chosen(look.skin);
  return { ...look, surface: (skin && SKINS[skin]?.surface) || fallback };
}

/**
 * Template ids whose data is not a sensor key (the browser clock, the Wave Link socket, a URL), so
 * they render with an empty sensor map; every other template renders nothing until a key shows up.
 */
export const SENSORLESS: ReadonlySet<string> = new Set(["Clock", "Calendar", "WebPage", "WaveLink"]);

/** Whether the map holds a key under any prefix (a module with no prefixes reads any key). */
function hasKeys(sensors: SensorMap, prefixes: readonly string[]): boolean {
  const keys = Object.keys(sensors);
  return prefixes.length === 0 ? keys.length > 0 : keys.some((k) => prefixes.some((p) => k.startsWith(p)));
}

export function templateModule<P extends object>({ meta, Component, settings, toProps, isIdle, prefixes, title, base, alias }: TemplateOptions<P>): DashboardModule {
  const all = alias?.settings ?? [...(base ?? STANDARD_SETTINGS), ...settings];
  const surfaceDefault = String(all.find((d) => d.key === "surface")?.default ?? "glass");
  const mod: DashboardModule = {
    id: alias?.id ?? meta.id,
    title: alias?.title ?? title ?? meta.name,
    minCols: alias?.minCols ?? meta.minSize[0],
    minRows: alias?.minRows ?? meta.minSize[1],
    prefixes: alias?.prefixes ?? meta.prefixes,
    reads: prefixes,
    settings: all,
    libraryHidden: alias ? true : undefined,
    isIdle,
    category: alias ? undefined : meta.category,
    icon: alias ? undefined : meta.icon,
    description: alias ? undefined : meta.description,
    defaultSize: alias ? undefined : meta.defaultSize,
    // No data renders nothing, so the kiosk hides the zone and the studio says "no live data yet".
    render: (sensors, saved) =>
      (!SENSORLESS.has(meta.id) && !hasKeys(sensors, [...mod.prefixes, ...(mod.reads ?? [])])) || alias?.hidden?.(sensors, effectiveSettings(mod, saved)) ? null : (
        <TemplateZone sensors={sensors} saved={saved} />
      ),
  };
  function TemplateZone({ sensors, saved }: { sensors: SensorMap; saved?: ModuleSettings }) {
    const data = useMemo(() => toFlat(sensors), [sensors]);
    const look = withSkinSurface(effectiveSettings(mod, saved), saved, surfaceDefault);
    const skin = chosen(look.skin);
    useEffect(() => {
      if (skin) ensureSkinFonts(skin);
    }, [skin]);
    return <Component data={data} {...shellProps(look)} {...toProps(look)} look={look} />;
  }
  return mod;
}
