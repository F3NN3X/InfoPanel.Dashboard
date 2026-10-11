import { useMemo, type ReactNode } from "react";
import { GenericCard } from "@/modules/fallback";
import { isClaimed, moduleReads, modules } from "@/modules";
import { effectiveSettings, withProfileStyle, type ModuleSettings, type SensorMap } from "@/modules/types";
import type { SensorValue } from "@/hooks/useSensors";
import { useSensors } from "@/hooks/useSensors";
import { PanelView } from "@/components/widgets/PanelView";
import type { PanelSelection } from "@/components/widgets/panel-parts";
import { YR_FORECAST_KEY, YR_FORECAST_PREFIX } from "@/lib/sensors";
import { CARDS_ID, BLANK_MODULE, type Placement } from "@/lib/layout";
import { panelSettings } from "@/lib/panel-model";

const moduleById = new Map(modules.map((m) => [m.id, m]));

export interface PlacementRender {
  content: ReactNode;
  hasData: boolean;
  title: string;
  /**
   * Has data but nothing to show right now, and the widget is set to hide
   * when idle: the kiosk hides it, the studio marks it.
   */
  idle?: boolean;
}

/**
 * The sensor keys (as prefixes) a placement renders from: a module's
 * prefixes, a panel's bound keys, `null` for the "cards" catch-all (every
 * sensor), `[]` for none.
 */
export function placementPrefixes(p: Placement): string[] | null {
  if (p.module === BLANK_MODULE) return [];
  if (p.panel) {
    const keys = new Set<string>();
    for (const w of p.panel.widgets) {
      if (!w.visible) continue;
      for (const key of [w.sensor, w.subSensor]) {
        if (key) keys.add(key === YR_FORECAST_KEY ? YR_FORECAST_PREFIX : key);
      }
    }
    return [...keys].sort();
  }
  if (p.module === CARDS_ID) return null;
  const mod = moduleById.get(p.module);
  return mod ? moduleReads(mod) : [];
}

/**
 * Render the content of a placement (module or the "cards" catch-all grid).
 * Shared by the kiosk grid and the studio canvas.
 */
export function placementContent(
  p: Placement,
  sensors: SensorMap,
  unclaimed: Array<[string, SensorValue]>,
  profileStyle?: ModuleSettings,
  /** Rendering on the studio canvas (empty panels show a hint). */
  studio?: boolean,
  /** The studio's widget selection, for the selected panel zone only. */
  selection?: PanelSelection
): PlacementRender {
  if (p.module === BLANK_MODULE) {
    // A drawn, unfilled zone: nothing to render (the kiosk shows open
    // space, the studio shows the dashed zone chrome).
    return { content: null, hasData: false, title: "Blank zone" };
  }
  if (p.panel) {
    // A custom panel renders its own widgets; it "has data" when at least
    // one widget is visible (an empty panel is hidden in kiosk mode).
    const hasData = p.panel.widgets.some((w) => w.visible);
    return {
      content: (
        <PanelView
          panel={p.panel}
          settings={withProfileStyle(panelSettings(p), profileStyle)}
          sensors={sensors}
          studio={studio}
          selection={selection}
        />
      ),
      hasData,
      title: p.panel.title,
    };
  }
  if (p.module === CARDS_ID) {
    if (unclaimed.length === 0)
      return { content: null, hasData: false, title: "Other sensors" };
    const subCols = p.colSpan >= 8 ? 4 : p.colSpan >= 4 ? 3 : 2;
    return {
      hasData: true,
      title: "Other sensors",
      content: (
        <div
          className="grid h-full w-full auto-rows-fr gap-3"
          style={{ gridTemplateColumns: `repeat(${subCols}, minmax(0, 1fr))` }}
        >
          {unclaimed.map(([key, sensor]) => (
            <GenericCard key={key} sensorKey={key} sensor={sensor} />
          ))}
        </div>
      ),
    };
  }
  const mod = moduleById.get(p.module);
  if (!mod) return { content: null, hasData: false, title: p.module };
  const settings = withProfileStyle(p.settings, profileStyle);
  const content = mod.render(sensors, settings);
  const cfg = mod.isIdle ? effectiveSettings(mod, settings) : undefined;
  return {
    content: content ?? null,
    hasData: content != null,
    title: mod.title,
    idle: Boolean(cfg?.hideWhenIdle && mod.isIdle?.(sensors, cfg)),
  };
}

interface LivePlacementProps {
  placement: Placement;
  /** The profile's style defaults (`MonitorProfile.style`). */
  profileStyle?: ModuleSettings;
  /** On the studio canvas (see `placementContent`). */
  studio?: boolean;
  /** The selected panel zone's widget selection (see `placementContent`). */
  selection?: PanelSelection;
  /** Wraps the rendered content (the zone frame). */
  children: (render: PlacementRender) => ReactNode;
}

/**
 * A placement wired to the sensor store: it subscribes to just the keys
 * it renders from, so a sensor change re-renders only the zones that show
 * it — not the whole grid.
 */
export function LivePlacement({ placement, profileStyle, studio, selection, children }: LivePlacementProps) {
  const prefixes = placementPrefixes(placement);
  const sensors = useSensors(prefixes);
  const isCards = prefixes === null;
  const unclaimed = useMemo(
    () => (isCards ? Object.entries(sensors).filter(([key]) => !isClaimed(key)) : []),
    [isCards, sensors]
  );
  return <>{children(placementContent(placement, sensors, unclaimed, profileStyle, studio, selection))}</>;
}
