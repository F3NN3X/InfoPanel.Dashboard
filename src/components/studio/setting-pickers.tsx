import { DeviceChecklist } from "@/components/ui/device-checklist";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { cn } from "@/lib/utils";
import { meterKey, useWavelinkState } from "@/lib/wavelink";
import type { ModuleSetting, ModuleSettingValue } from "@/modules/types";
import { FIELD, StackRow, type RowLabelProps } from "./setting-rows";

/** A comma-separated list ("" = none) as its items. */
const splitList = (value: string): string[] => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : []);

/**
 * A checklist bound to a comma-separated string ("" = none). Used for
 * `multiple` select settings.
 */
export function MultiSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: ModuleSettingValue) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  if (options.length === 0) return <span className="text-[11px] text-ui-4">No options available</span>;
  return (
    <DeviceChecklist
      label={label}
      devices={options.map((o) => ({ id: o.value, label: o.label }))}
      value={splitList(value)}
      onChange={(ids) => onChange(ids.join(","))}
    />
  );
}

const SELECT = cn(FIELD, "h-7 w-full bg-ui-hover");
const LINK = "text-[11px] text-ui-4 hover:text-ui-1";

interface PickerProps {
  def: ModuleSetting;
  value: string;
  onChange: (value: ModuleSettingValue) => void;
  lead?: RowLabelProps["lead"];
  hint?: string;
}

/**
 * Picker for the browser's audio capture devices (the ones Web Audio can read
 * directly). Device ids are always enumerable; labels only resolve once the
 * microphone permission is granted, so a button unlocks them. Handles both
 * single-select and multi-select (`def.multiple`).
 */
export function MediaDevicePicker({ def, value, onChange, lead, hint }: PickerProps) {
  const { devices, status, request } = useAudioDevices();
  const options = devices.map((d) => ({ value: d.deviceId, label: d.label }));
  return (
    <StackRow label={def.label} lead={lead} hint={hint}>
      {def.multiple ? (
        <MultiSelect value={value} onChange={onChange} options={options} label={def.label} />
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={def.label} className={SELECT}>
          <option value="">None (loudest live device)</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {status !== "unsupported" && (
        <button type="button" onClick={() => void request()} className={LINK}>
          {status === "denied" ? "Microphone blocked — allow access" : "Enable microphone access"}
        </button>
      )}
    </StackRow>
  );
}

/**
 * Picker for the Wave Link meter inventory (the plugin's live
 * channels + output devices). Handles both single-select and multi-select
 * (`def.multiple`); "" means all meters.
 */
export function WavelinkMeterPicker({ def, value, onChange, lead, hint }: PickerProps) {
  const state = useWavelinkState();
  const options = [
    ...state.channels.map((c) => ({ value: meterKey.channel(c.id), label: `Channel · ${c.name}` })),
    ...state.devices.map((d) => ({ value: meterKey.device(d.id), label: `Device · ${d.name}` })),
  ];
  return (
    <StackRow label={def.label} lead={lead} hint={hint}>
      {def.multiple ? (
        <MultiSelect value={value} onChange={onChange} options={options} label={def.label} />
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={def.label} className={SELECT}>
          <option value="">All meters</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {state.status === "absent" && options.length === 0 && (
        <span className="text-[11px] text-ui-4">
          Wave Link is not running — start the app and its meters appear here.
        </span>
      )}
    </StackRow>
  );
}
