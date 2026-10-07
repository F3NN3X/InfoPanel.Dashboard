import { type CSSProperties } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Gauge } from "@/components/Gauge";
import { isImageUrl } from "@/lib/image";
import { hexToHsl } from "@/lib/theme";
import type { SensorValue } from "@/hooks/useSensors";
import type { Widget } from "@/lib/layout";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import { widgetPercent, widgetValue } from "./format";
import { useHistory, useNow } from "./hooks";

interface Ctx {
  widget: Widget;
  sensor?: SensorValue;
  text: string;
  unit?: string;
}

function colorStyle(color?: string): CSSProperties | undefined {
  return color ? { color } : undefined;
}

/* ---------------- individual renderers ---------------- */

function Stat({ widget, text, unit }: Ctx) {
  return (
    <div className="flex flex-col gap-0.5">
      {widget.label && (
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {widget.label}
        </div>
      )}
      <div
        className="text-2xl font-bold tracking-tight tabular-nums text-foreground"
        style={colorStyle(widget.color)}
      >
        {text}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Value({ widget, text, unit }: Ctx) {
  return (
    <div className="flex items-baseline gap-1">
      <span
        className="text-lg font-semibold tabular-nums text-foreground"
        style={colorStyle(widget.color)}
      >
        {text}
        {unit && (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
      {widget.label && (
        <span className="text-xs text-muted-foreground">{widget.label}</span>
      )}
    </div>
  );
}

function Bar({ widget, sensor, text, unit }: Ctx) {
  const pct = widgetPercent(sensor, widget);
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">
          {widget.label ?? "—"}
        </span>
        <span className="tabular-nums text-foreground">
          {text}
          {unit && (
            <span className="ml-0.5 text-muted-foreground">{unit}</span>
          )}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            ...(widget.color ? { backgroundColor: widget.color } : {}),
          }}
        />
      </div>
    </div>
  );
}

function GaugeWidget({ widget, sensor, text, unit }: Ctx) {
  const pct = widgetPercent(sensor, widget);
  const scope = widget.color
    ? ({ "--accent": hexToHsl(widget.color) } as CSSProperties)
    : undefined;
  return (
    <div style={scope} className="shrink-0">
      <Gauge
        label={widget.label ?? ""}
        value={text}
        unit={unit}
        percent={pct}
        size={80}
      />
    </div>
  );
}

function Sparkline({ widget, sensor }: { widget: Widget; sensor?: SensorValue }) {
  const history = useHistory(sensor?.value, widget.history ?? 40);
  const last = history[history.length - 1];
  const W = 200;
  const H = 48;

  const points =
    history.length > 1
      ? (() => {
          const min = Math.min(...history);
          const max = Math.max(...history);
          const range = max - min || 1;
          return history
            .map((v, i) => {
              const x = (i / (history.length - 1)) * W;
              const y = H - 2 - ((v - min) / range) * (H - 6);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ");
        })()
      : undefined;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">
          {widget.label ?? "graph"}
        </span>
        <span
          className="tabular-nums text-foreground"
          style={colorStyle(widget.color)}
        >
          {last !== undefined ? Math.round(last) : "—"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
      >
        {points ? (
          <>
            <polyline
              points={`0,${H} ${points} ${W},${H}`}
              fill={widget.color ? `${widget.color}22` : undefined}
              stroke="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke={widget.color ?? "hsl(var(--accent))"}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <line
            x1={0}
            y1={H / 2}
            x2={W}
            y2={H / 2}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

function Table({ widget, lines }: { widget: Widget; lines: string[] }) {
  const rows = widget.rows ?? 7;
  return (
    <div className="space-y-1">
      {lines.slice(0, rows).map((line, i) => {
        const idx = line.indexOf(", ");
        const head = idx > 0 ? line.slice(0, idx) : line;
        const rest = idx > 0 ? line.slice(idx + 2) : "";
        return (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <span className="shrink-0 font-medium text-foreground/85">
              {head}
            </span>
            {rest && (
              <span
                className="min-w-0 truncate text-right tabular-nums text-muted-foreground"
                title={rest}
              >
                {rest}
              </span>
            )}
          </div>
        );
      })}
      {lines.length === 0 && (
        <div className="text-xs text-muted-foreground/60">no data</div>
      )}
    </div>
  );
}

function Text({ widget, text }: { widget: Widget; text: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {widget.label && (
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {widget.label}
        </div>
      )}
      <div
        className={cn(
          "break-words text-sm text-foreground/90",
          !text && "text-muted-foreground/60"
        )}
        style={colorStyle(widget.color)}
      >
        {text || "—"}
      </div>
    </div>
  );
}

function ImageWidget({ widget, src }: { widget: Widget; src?: string }) {
  return (
    <div className="relative">
      {src ? (
        <img
          src={src}
          alt={widget.label ?? "image"}
          className="max-h-40 w-full rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center rounded-md bg-muted text-muted-foreground/50">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
      {widget.label && (
        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
          {widget.label}
        </div>
      )}
    </div>
  );
}

function Clock({ widget }: { widget: Widget }) {
  const now = useNow(1000);
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const mode = widget.clock ?? "both";
  return (
    <div className="flex flex-col" style={colorStyle(widget.color)}>
      {mode !== "date" && (
        <div className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
          {time}
        </div>
      )}
      {mode !== "time" && (
        <div className="text-sm text-muted-foreground">{date}</div>
      )}
    </div>
  );
}

/* ---------------- dispatcher ---------------- */

interface WidgetViewProps {
  widget: Widget;
  sensors: SensorMap;
}

/**
 * Resolve a widget's bound sensor + display text, then dispatch to the
 * matching renderer. Hidden widgets render nothing.
 */
export function WidgetView({ widget, sensors }: WidgetViewProps) {
  if (!widget.visible) return null;
  const s = widget.sensor ? sensors[widget.sensor] : undefined;
  const { text, unit } = widgetValue(s, widget);
  const ctx: Ctx = { widget, sensor: s, text, unit };

  switch (widget.kind) {
    case "stat":
      return <Stat {...ctx} />;
    case "value":
      return <Value {...ctx} />;
    case "bar":
      return <Bar {...ctx} />;
    case "gauge":
      return <GaugeWidget {...ctx} />;
    case "sparkline":
      return <Sparkline widget={widget} sensor={s} />;
    case "table": {
      const raw = s?.text ?? widget.text ?? "";
      const lines = raw.split("\n").filter((l) => l.trim() !== "");
      return (
        <div className="w-full">
          {widget.label && (
            <div className="mb-1 text-xs text-muted-foreground">
              {widget.label}
            </div>
          )}
          <Table widget={widget} lines={lines} />
        </div>
      );
    }
    case "text":
      return (
        <Text
          widget={widget}
          text={widget.sensor ? text : (widget.text ?? "")}
        />
      );
    case "image": {
      const src =
        widget.text && isImageUrl(widget.text, widget.sensor ?? "image")
          ? widget.text
          : s?.text && isImageUrl(s.text, widget.sensor ?? "image")
            ? s.text
            : widget.text && isImageUrl(widget.text, "image")
              ? widget.text
              : undefined;
      return <ImageWidget widget={widget} src={src} />;
    }
    case "clock":
      return <Clock widget={widget} />;
    default:
      return null;
  }
}
