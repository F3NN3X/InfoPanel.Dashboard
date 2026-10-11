import { useAudioDevices } from "@/hooks/use-audio-devices";
import { meterKey, useWavelinkState } from "@/lib/wavelink";
import type { ModuleSetting, ModuleSettingValue } from "@/modules/types";

/**
 * A checkbox list bound to a comma-separated string ("" = none). Used for
 * `multiple` select settings.
 */
export function MultiSelect({
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
export function MediaDevicePicker({
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
 * Picker for the Wave Link meter inventory (the plugin's live
 * channels + output devices). Handles both single-select and multi-select
 * (`def.multiple`); "" means all meters.
 */
export function WavelinkMeterPicker({
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
