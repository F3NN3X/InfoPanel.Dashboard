import { Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSensors } from "@/hooks/useSensors";
import type { DataModel, DataPoint } from "@/lib/data-points";
import { bindPoint, unbindPoint, type UsageIndex } from "@/lib/data-usage";
import type { DashboardConfig, MonitorProfile, Placement } from "@/lib/layout";
import { modules } from "@/modules";
import { TypeIcon } from "../explorer/explorer-parts";
import { boundRows, inProfile, liveText, pointPlace } from "./bound-data-model";
import { DataPicker } from "./data-picker";
import { zoneName } from "./zone-meta";

interface BoundDataProps {
  zone: Placement;
  config: DashboardConfig;
  data: { model: DataModel; usage: UsageIndex };
  /** A panel's selected widget: Bind sets its sensor. */
  selectedWidgetId: string | null;
  /** Edit the active profile (one undo step per `key`). */
  updateProfile: (fn: (p: MonitorProfile) => MonitorProfile, key?: string) => void;
  /** Open a point in Sources mode. */
  onOpenPoint: (key: string) => void;
  /** Open Sources mode (the picker's "Open data explorer"). */
  onOpenExplorer: () => void;
  /** The picker is open (kept by the inspector: "Bind data…" opens it too). */
  picker: boolean;
  onPicker: (open: boolean) => void;
}

/**
 * The Data tab's "Bound data" (README §4.9): the points the zone reads with
 * their live values, Bind (the picker) and unbind. A widget binds through
 * its source setting (a whole container); a panel binds its selected
 * widget's sensor.
 */
export function BoundData({
  zone,
  config,
  data,
  selectedWidgetId,
  updateProfile,
  onOpenPoint,
  onOpenExplorer,
  picker,
  onPicker,
}: BoundDataProps) {
  const toast = useToast();
  const { model, usage } = data;
  const rows = boundRows(zone, usage, model);
  const live = useSensors(rows.map((r) => r.key));
  const title = zoneName(zone);
  const widget = zone.panel?.widgets.find((w) => w.id === selectedWidgetId);
  const mode = zone.panel ? "item" : "widget";

  const apply = (fn: (c: DashboardConfig) => DashboardConfig, key: string) => updateProfile(inProfile(config, fn), key);
  const unbind = (key: string, panelWidgetId: string | undefined) => {
    apply((c) => unbindPoint(c, zone.id, panelWidgetId, key, modules, model), `bind:${key}`);
    toast(`Unbound from ${title}`);
  };
  const bind = (p: DataPoint) => {
    const panelWidgetId = widget?.id;
    if (bindPoint(config, zone.id, panelWidgetId, p.key, modules, model) === config) {
      toast(`${title} can't bind a single value`);
      return;
    }
    apply((c) => bindPoint(c, zone.id, panelWidgetId, p.key, modules, model), `bind:${p.key}`);
    toast(`Bound to ${title}`);
  };
  const bound = new Set(mode === "item" ? [widget?.sensor].filter((k): k is string => !!k) : rows.map((r) => r.key));
  const canUnbind = (key: string, panelWidgetId: string | undefined) =>
    panelWidgetId !== undefined || unbindPoint(config, zone.id, undefined, key, modules, model) !== config;

  const openPicker = () => {
    if (zone.panel && !widget) return toast("Select a widget in the panel first");
    onPicker(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-ui-mono text-[11px] text-ui-4">
          {rows.length} bound
        </span>
        <button
          type="button"
          onClick={openPicker}
          className="flex h-7 items-center gap-1 rounded-md border border-ui-strong bg-ui-raised px-2.5 text-[12px] text-ui-2 hover:text-ui-1"
        >
          <Plus className="h-3.5 w-3.5" /> Bind
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-[12px] leading-snug text-ui-4">No data bound yet. Bind a value to make this widget live.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map(({ key, point, panelWidgetId }) => {
            const value = liveText(live[key], point);
            return (
              <li
                key={`${panelWidgetId ?? ""}:${key}`}
                className="flex items-center gap-2 rounded-[7px] border border-ui-subtle bg-ui-app pl-2 pr-1 hover:border-ui-strong"
              >
                <button
                  type="button"
                  onClick={() => onOpenPoint(key)}
                  title={`Open ${key} in Sources`}
                  className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                >
                  <TypeIcon type={point?.type ?? "empty"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] text-ui-1">{point?.name ?? key}</span>
                    <span className="block truncate text-[10.5px] text-ui-4">{pointPlace(point)}</span>
                  </span>
                  <span
                    className={
                      value === null
                        ? "shrink-0 text-[11px] text-ui-warning"
                        : "max-w-[40%] shrink-0 truncate font-ui-mono text-[11.5px] text-ui-2"
                    }
                  >
                    {value ?? "No data"}
                  </span>
                </button>
                {canUnbind(key, panelWidgetId) && (
                  <button
                    type="button"
                    onClick={() => unbind(key, panelWidgetId)}
                    aria-label={`Unbind ${point?.name ?? key}`}
                    title="Unbind"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ui-4 hover:bg-ui-hover hover:text-ui-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <DataPicker
        open={picker}
        onOpenChange={onPicker}
        points={model.points}
        mode={mode}
        bound={bound}
        onToggle={(p) => {
          if (mode === "item" || !bound.has(p.key)) return bind(p);
          if (canUnbind(p.key, undefined)) return unbind(p.key, undefined);
          toast(`${title} always reads this value`);
        }}
        onOpenExplorer={onOpenExplorer}
      />
    </div>
  );
}
