import { useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { DataPoint } from "@/lib/data-points";
import type { Usage } from "@/lib/data-usage";
import type { SampleHistory } from "@/lib/sample-history";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import { displayValue } from "./explorer-model";
import { CAPTION, Chip, TypeIcon } from "./explorer-parts";
import { useCopy } from "./use-copy";

/** A zone the point can be bound to; panel zones list their bindable widgets. */
export interface BindZone {
  id: string;
  title: string;
  widgets?: { id: string; label: string }[];
}

interface PointInspectorProps {
  point: DataPoint;
  values: SensorMap;
  history: SampleHistory;
  /** Bumps with every sample so the sparkline redraws. */
  tick: number;
  apiBase: string;
  usedBy: Usage[];
  zones: BindZone[];
  onBind: (zoneId: string, widgetId: string | undefined) => void;
  onUnbind: (zoneId: string, widgetId: string | undefined) => void;
  onNewWidget: () => void;
  onOpenZone: (zoneId: string) => void;
  onClose: () => void;
}

const LIVE_TYPES = new Set(["number"]);

/** The explorer's right column for one selected data point. */
export function PointInspector({
  point,
  values,
  history,
  tick,
  apiBase,
  usedBy,
  zones,
  onBind,
  onUnbind,
  onNewWidget,
  onOpenZone,
  onClose,
}: PointInspectorProps) {
  const copy = useCopy();
  const live = point.key in values;
  const value = displayValue(point, values);
  const streamUrl = `${apiBase}/events?prefix=${point.key}`;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-ui-panel font-ui text-ui-2">
      <div className="flex items-center gap-2 border-b border-ui-subtle px-4 py-3">
        <div className="min-w-0 flex-1 truncate text-[11.5px] text-ui-4">
          {point.sourceName}
          {point.containerTitle && point.containerTitle !== point.sourceName ? ` › ${point.containerTitle}` : ""}
        </div>
        <IconButton label="Close point inspector" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <div className="mb-2 break-words text-[13px] font-medium text-ui-1">{point.name}</div>
          <div className="rounded-lg border border-ui-default bg-ui-tile p-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Chip>
                <TypeIcon type={point.type} className="mr-1 h-3 w-3" />
                {point.type}
              </Chip>
              {point.kind && <Chip>{point.kind}</Chip>}
              {live && <Chip className="text-ui-success">● Live</Chip>}
            </div>
            {point.type === "list" ? (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-ui-mono text-[11.5px] text-ui-2">
                {values[point.key]?.text ?? point.raw}
              </pre>
            ) : (
              <div className="break-words text-[24px] font-semibold leading-tight text-ui-1">{value || "—"}</div>
            )}
            {LIVE_TYPES.has(point.type) && live && <History history={history} pointKey={point.key} tick={tick} />}
          </div>
        </div>

        <CopyField label="Key" value={point.key} onCopy={copy} />
        <CopyField label="Stream URL" value={streamUrl} onCopy={copy} />

        <div>
          <div className={cn(CAPTION, "mb-1.5")}>Used by</div>
          {usedBy.length === 0 ? (
            <div className="text-[12px] text-ui-4">Not used in this layout yet.</div>
          ) : (
            <div className="space-y-1">
              {usedBy.map((u) => (
                <button
                  key={`${u.zoneId}:${u.panelWidgetId ?? ""}`}
                  type="button"
                  onClick={() => onOpenZone(u.zoneId)}
                  className="block w-full truncate rounded-md border border-ui-default bg-ui-tile px-2.5 py-1.5 text-left text-[12px] text-ui-2 hover:bg-ui-hover hover:text-ui-1"
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <BindControls zones={zones} usedBy={usedBy} onBind={onBind} onUnbind={onUnbind} />

        <button
          type="button"
          onClick={onNewWidget}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-ui-strong text-[12.5px] text-ui-1 hover:bg-ui-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          New widget from this value
        </button>
      </div>
    </div>
  );
}

function History({ history, pointKey, tick }: { history: SampleHistory; pointKey: string; tick: number }) {
  void tick;
  const samples = history.get(pointKey);
  const stats = history.stats(pointKey);
  if (!stats || samples.length < 2) return null;
  const W = 264;
  const H = 40;
  const span = stats.max - stats.min || 1;
  const points = samples
    .map((s, i) => `${((i / (samples.length - 1)) * W).toFixed(1)},${(H - 3 - ((s - stats.min) / span) * (H - 6)).toFixed(1)}`)
    .join(" ");
  const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1)).replace(/\.0$/, "");
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full text-ui-accent" role="img" aria-label="Last 24 samples">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between font-ui-mono text-[10.5px] text-ui-4">
        <span>Min {fmt(stats.min)}</span>
        <span>Avg {fmt(stats.avg)}</span>
        <span>Max {fmt(stats.max)}</span>
      </div>
    </div>
  );
}

export function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: (text: string) => void }) {
  return (
    <div>
      <div className={cn(CAPTION, "mb-1.5")}>{label}</div>
      <div className="flex items-center gap-1 rounded-md border border-ui-default bg-ui-app py-1 pl-2.5 pr-1">
        <span className="min-w-0 flex-1 truncate font-ui-mono text-[11px] text-ui-2" title={value}>
          {value}
        </span>
        <IconButton label={`Copy ${label.toLowerCase()}`} onClick={() => onCopy(value)}>
          <Copy className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

interface BindControlsProps {
  zones: BindZone[];
  usedBy: Usage[];
  onBind: (zoneId: string, widgetId: string | undefined) => void;
  onUnbind: (zoneId: string, widgetId: string | undefined) => void;
}

const SELECT =
  "h-8 w-full rounded-md border border-ui-default bg-ui-app px-2 text-[12.5px] text-ui-1 focus:border-ui-accent/60 focus:outline-none";

function BindControls({ zones, usedBy, onBind, onUnbind }: BindControlsProps) {
  const [zoneId, setZoneId] = useState("");
  const [widgetId, setWidgetId] = useState("");
  const zone = zones.find((z) => z.id === zoneId);
  const widget = zone?.widgets ? (widgetId || undefined) : undefined;
  const bound = usedBy.some((u) => u.zoneId === zoneId && (!zone?.widgets || u.panelWidgetId === widget));

  return (
    <div>
      <div className={cn(CAPTION, "mb-1.5")}>Bind to a widget</div>
      <div className="space-y-1.5">
        <select
          aria-label="Zone to bind"
          value={zoneId}
          onChange={(e) => {
            setZoneId(e.target.value);
            setWidgetId("");
          }}
          className={SELECT}
        >
          <option value="">Choose a widget…</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.title}
            </option>
          ))}
        </select>
        {zone?.widgets && (
          <select aria-label="Panel widget to bind" value={widgetId} onChange={(e) => setWidgetId(e.target.value)} className={SELECT}>
            <option value="">Choose a panel widget…</option>
            {zone.widgets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={!zone}
          onClick={() => (bound ? onUnbind(zoneId, widget) : onBind(zoneId, widget))}
          className="h-8 w-full rounded-md bg-ui-accent text-[12.5px] font-medium text-ui-inverse-fg hover:brightness-110 disabled:opacity-40"
        >
          {bound ? "Unbind" : "Bind"}
        </button>
      </div>
    </div>
  );
}
