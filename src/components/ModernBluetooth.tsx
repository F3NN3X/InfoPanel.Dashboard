import { Bluetooth as BluetoothIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern Bluetooth widget.
 *
 * The BTData plugin's paired devices with battery levels: a status line
 * and device rows (name, status, battery bar colored by level). One
 * component, four layouts picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: status header, stacked device rows
 * - `standard` — wide zones: status block left, device grid right
 * - `compact`  — very short zones: one pill (icon · status · n · battery)
 * - `simple`   — small zones: icon + status + count
 */

export type BluetoothVariant = "card" | "standard" | "compact" | "simple";

export interface ModernBtDevice {
  name: string;
  status?: string;
  /** Battery 0-100; 0/undefined = no battery reporting. */
  battery?: number;
}

export interface ModernBluetoothProps {
  status?: string;
  devices: ModernBtDevice[];
  showStatus?: boolean;
  layout?: BluetoothVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

function pickVariant(
  w: number,
  h: number,
  forced: BluetoothVariant | "auto"
): BluetoothVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function batteryColor(pct: number): string {
  if (pct > 50) return "var(--wp-accent, #34d399)";
  if (pct > 20) return "#fbbf24";
  return "#f87171";
}

function BatteryBar({
  battery,
  width = "100%",
}: {
  battery: number | undefined;
  width?: string;
}) {
  const has = battery !== undefined && battery > 0;
  return (
    <div
      className="overflow-hidden rounded-full"
      style={{ height: 5, width, background: "rgba(128,128,140,0.22)" }}
    >
      {has && (
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(clamp01(battery! / 100) * 100)}%`,
            background: batteryColor(battery!),
            transition: "width 0.3s ease",
          }}
        />
      )}
    </div>
  );
}

function DeviceRow({
  device,
  small,
}: {
  device: ModernBtDevice;
  small?: boolean;
}) {
  const hasBattery = device.battery !== undefined && device.battery > 0;
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className={cn("truncate font-semibold", small ? "text-xs" : "text-sm")}
          title={device.name}
        >
          {device.name}
        </span>
        {device.status && (
          <span className="truncate text-[10px] text-current/60">{device.status}</span>
        )}
        <span
          className={cn(
            "ml-auto shrink-0 font-bold tabular-nums",
            small ? "text-sm" : "text-base"
          )}
        >
          {hasBattery ? `${Math.round(device.battery!)}%` : "—"}
        </span>
      </div>
      <div className="mt-1">
        <BatteryBar battery={device.battery} width={small ? "80px" : "100%"} />
      </div>
    </div>
  );
}

export function ModernBluetooth({
  status,
  devices,
  showStatus = true,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernBluetoothProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);

  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;
  const muted = sv.muted;
  const count = devices.length;
  const shown = devices.slice(0, v === "compact" ? 1 : v === "simple" ? 0 : 6);

  let body: React.ReactNode;
  if (v === "card") {
    body = (
      <div
        className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-[20px] p-4"
        style={box}
      >
        <div className="flex shrink-0 items-center gap-2">
          <BluetoothIcon className="h-4 w-4" style={{ color: muted }} />
          {showStatus && status && (
            <span className="text-sm font-semibold">{status}</span>
          )}
          <span className="ml-auto text-xs" style={{ color: muted }}>
            {count} device{count === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5 overflow-y-auto">
          {shown.map((d) => (
            <DeviceRow key={d.name} device={d} />
          ))}
        </div>
      </div>
    );
  } else if (v === "standard") {
    body = (
      <div
        className="flex h-full w-full items-center gap-5 overflow-hidden rounded-xl p-4"
        style={box}
      >
        <div className="flex w-[30%] min-w-[140px] shrink-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <BluetoothIcon className="h-5 w-5" style={{ color: muted }} />
            {showStatus && status && (
              <span className="text-sm font-semibold">{status}</span>
            )}
          </div>
          <span className="text-xs" style={{ color: muted }}>
            {count} device{count === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid min-w-0 flex-1 auto-rows-min grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto">
          {shown.map((d) => (
            <DeviceRow key={d.name} device={d} small />
          ))}
        </div>
      </div>
    );
  } else if (v === "compact") {
    const d = shown[0];
    body = (
      <div
        className="flex h-full w-full items-center gap-3 overflow-hidden rounded-full px-4"
        style={box}
      >
        <BluetoothIcon className="h-4 w-4 shrink-0" style={{ color: muted }} />
        <span className="truncate text-sm font-semibold">
          {status ?? "Bluetooth"}
        </span>
        <span className="shrink-0 text-xs" style={{ color: muted }}>
          {count} device{count === 1 ? "" : "s"}
        </span>
        {d && d.battery !== undefined && d.battery > 0 && (
          <span className="ml-auto shrink-0 text-sm font-bold tabular-nums">
            {Math.round(d.battery)}%
            <span className="ml-1 text-[10px] font-normal" style={{ color: muted }}>
              {d.name}
            </span>
          </span>
        )}
      </div>
    );
  } else {
    body = (
      <div
        className="flex h-full w-full items-center gap-3 overflow-hidden rounded-xl p-3"
        style={box}
      >
        <BluetoothIcon className="h-5 w-5 shrink-0" style={{ color: muted }} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {status ?? "Bluetooth"}
          </div>
          <div className="text-xs" style={{ color: muted }}>
            {count} device{count === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
