import { WIDGET_ICONS } from "@/lib/widget-icons";
import { Segmented } from "@/components/ui/segmented";
import { sourceOptions } from "@/lib/sources";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { meterKey, useWavelinkState } from "@/lib/wavelink";
import type { ReactNode } from "react";
import {
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
  type SensorMap,
} from "@/modules/types";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  module: DashboardModule;
  /** The placement's saved settings (undefined = all defaults). */
  value?: ModuleSettings;
  onChange: (key: string, value: ModuleSettingValue) => void;
  onReset: () => void;
  /**
   * Live sensor map — needed for settings whose options resolve from real
   * sensor data (e.g. `optionsFrom: "sources"`).
   */
  sensors?: SensorMap;
}

/**
 * Schema-driven module settings editor. Renders one control per entry in
 * `module.settings`; values are stored on the placement, merged over the
 * module's defaults at render time.
 */
export function SettingsPanel({
  module,
  value,
  onChange,
  onReset,
  sensors,
}: SettingsPanelProps) {
  const defs = module.settings;
  if (!defs || defs.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Settings
        </div>
        <button
          onClick={onReset}
          className="text-[11px] text-muted-foreground hover:text-foreground"
          title="Reset to module defaults"
        >
          Reset
        </button>
      </div>
      <div className="space-y-3">
        {defs.map((def) => (
          <SettingRow
            key={def.key}
            def={def}
            value={value?.[def.key] ?? def.default}
            onChange={(v) => onChange(def.key, v)}
            onApply={(bundle) => {
              // Preset bundle: persist each value alongside.
              for (const [k, v] of Object.entries(bundle)) onChange(k, v);
            }}
            sensors={sensors}
          />
        ))}
      </div>
    </div>
  );
}

function SettingRow({
  def,
  value,
  onChange,
  onApply,
  sensors,
}: {
  def: ModuleSetting;
  value: ModuleSettingValue;
  onChange: (value: ModuleSettingValue) => void;
  /** Preset bundles: apply extra key/values alongside the selected one. */
  onApply?: (bundle: ModuleSettings) => void;
  sensors?: SensorMap;
}) {
  switch (def.type) {
    case "boolean":
      return (
        <button
          type="button"
          onClick={() => onChange(value !== true)}
          className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
        >
          <span className="text-xs text-muted-foreground">{def.label}</span>
          <span
            className={cn(
              "relative h-4 w-7 rounded-full transition-colors",
              value === true ? "bg-ring" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
                value === true ? "left-3.5" : "left-0.5"
              )}
            />
          </span>
        </button>
      );

    case "color": {
      // "" means "auto" (the widget's own theme color). The native input
      // can't hold an empty value, so it always gets a valid hex.
      const raw = typeof value === "string" ? value : String(def.default ?? "");
      const hasValue = raw.length > 0;
      const hex = hasValue ? raw : "#000000";
      return (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hex}
              onChange={(e) => onChange(e.target.value)}
              className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <span className="text-xs tabular-nums text-muted-foreground">
              {hasValue ? raw : "auto"}
            </span>
            {hasValue && (
              <button
                onClick={() => onChange("")}
                title="Reset to auto (the widget's theme color)"
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                auto
              </button>
            )}
          </div>
        </div>
      );
    }

    case "number": {
      const num =
        typeof value === "number" ? value : Number(def.default) || 0;
      return (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{def.label}</span>
            <span className="tabular-nums">{String(num)}</span>
          </div>
          {def.min !== undefined || def.max !== undefined ? (
            <input
              type="range"
              min={def.min}
              max={def.max}
              step={def.step}
              value={num}
              onChange={(e) => onChange(parseInt(e.target.value, 10))}
              className="w-full accent-ring"
            />
          ) : (
            <input
              type="number"
              min={def.min}
              max={def.max}
              step={def.step}
              value={num}
              onChange={(e) =>
                onChange(e.target.value === "" ? def.default : Number(e.target.value))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            />
          )}
        </div>
      );
    }

    case "select": {
      // Capture devices: options come from an async `enumerateDevices()`
      // hook, so a dedicated component owns it.
      if (def.optionsFrom === "media") {
        return (
          <MediaDevicePicker def={def} value={String(value)} onChange={onChange} />
        );
      }
      // Wave Link meters: options come from the bridge's live inventory
      // (channels + output devices), so a dedicated component owns it.
      if (def.optionsFrom === "wavelink") {
        return (
          <WavelinkMeterPicker def={def} value={String(value)} onChange={onChange} />
        );
      }
      // Multi-select (stored comma-separated) over static or source options.
      if (def.multiple) {
        const multiOptions =
          def.optionsFrom === "sources" && def.sourcePlugin
            ? sourceOptions(sensors ?? {}, def.sourcePlugin)
            : def.options;
        return (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              {def.label}
            </div>
            <MultiSelect
              value={String(value)}
              onChange={onChange}
              options={multiOptions ?? []}
            />
          </div>
        );
      }
      const str = String(value);
      const apply = (v: string) => {
        onChange(v);
        // Preset bundle: persist the option's extra values alongside.
        const applies = def.options?.find((o) => o.value === v)?.applies;
        if (applies) onApply?.(applies);
      };
      // Dynamic options resolved from live sensor data (a plugin's
      // currently-exposed containers), falling back to the static list.
      const options =
        def.optionsFrom === "sources" && def.sourcePlugin
          ? sourceOptions(sensors ?? {}, def.sourcePlugin)
          : def.options;
      if (options && options.length <= 4) {
        return (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
            <Segmented
              options={options.map((o) => ({ value: o.value, label: o.label }))}
              value={str}
              onChange={apply}
            />
          </div>
        );
      }
      return (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
          <select
            value={str}
            onChange={(e) => apply(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    case "icon": {
      const str = String(value);
      return (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
          <div className="flex flex-wrap gap-1">
            <IconButton active={str === ""} onClick={() => onChange("")} title="None">
              <span className="text-xs">—</span>
            </IconButton>
            {Object.entries(WIDGET_ICONS).map(([name, Icon]) => (
              <IconButton
                key={name}
                active={str === name}
                onClick={() => onChange(name)}
                title={name}
              >
                <Icon className="h-3.5 w-3.5" />
              </IconButton>
            ))}
          </div>
        </div>
      );
    }

    case "image": {
      const url = String(value);
      return (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              placeholder="https://…"
              onChange={(e) => onChange(e.target.value)}
              className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50"
            />
            {url !== "" && (
              <img
                src={url}
                alt=""
                className="h-7 w-7 shrink-0 rounded border border-border object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
            )}
          </div>
        </div>
      );
    }

    default:
      return (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
          <input
            type="text"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          />
        </div>
      );
  }
}

function IconButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground",
        active ? "border-ring bg-accent text-foreground" : "border-border"
      )}
    >
      {children}
    </button>
  );
}

/**
 * A checkbox list bound to a comma-separated string ("" = none). Used for
 * `multiple` select settings.
 */
function MultiSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: ModuleSettingValue) => void;
  options: { value: string; label: string }[];
}) {
  const selected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const toggle = (v: string) => {
    const next = selected.includes(v)
      ? selected.filter((x) => x !== v)
      : [...selected, v];
    onChange(next.join(","));
  };
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
        >
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="accent-ring"
          />
          <span className="truncate">{o.label}</span>
        </label>
      ))}
      {options.length === 0 && (
        <span className="text-[11px] text-muted-foreground/60">
          No options available
        </span>
      )}
    </div>
  );
}

/**
 * Picker for the browser's audio capture devices (the ones Web Audio can read
 * directly). Device ids are always enumerable; labels only resolve once the
 * microphone permission is granted, so a button unlocks them. Handles both
 * single-select and multi-select (`def.multiple`).
 */
function MediaDevicePicker({
  def,
  value,
  onChange,
}: {
  def: ModuleSetting;
  value: string;
  onChange: (value: ModuleSettingValue) => void;
}) {
  const { devices, status, request } = useAudioDevices();
  const options = devices.map((d) => ({ value: d.deviceId, label: d.label }));
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
      {def.multiple ? (
        <MultiSelect value={value} onChange={onChange} options={options} />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          <option value="">None (loudest live device)</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {status !== "unsupported" && (
        <button
          type="button"
          onClick={() => void request()}
          className="mt-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {status === "denied"
            ? "Microphone blocked — allow access"
            : "Enable microphone access"}
        </button>
      )}
    </div>
  );
}

/**
 * Picker for the Wave Link meter inventory (the bridge's live
 * channels + output devices). Handles both single-select and multi-select
 * (`def.multiple`); "" means all meters.
 */
function WavelinkMeterPicker({
  def,
  value,
  onChange,
}: {
  def: ModuleSetting;
  value: string;
  onChange: (value: ModuleSettingValue) => void;
}) {
  const state = useWavelinkState();
  const options = [
    ...state.channels.map((c) => ({
      value: meterKey.channel(c.id),
      label: `Channel · ${c.name}`,
    })),
    ...state.devices.map((d) => ({
      value: meterKey.device(d.id),
      label: `Device · ${d.name}`,
    })),
  ];
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
      {def.multiple ? (
        <MultiSelect value={value} onChange={onChange} options={options} />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        >
          <option value="">All meters</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {state.status === "absent" && options.length === 0 && (
        <span className="text-[11px] text-muted-foreground/60">
          Wave Link is not running — start the app and its meters appear here.
        </span>
      )}
    </div>
  );
}
