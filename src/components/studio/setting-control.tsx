import type { ReactNode } from "react";
import type { ApiSources } from "@/lib/catalog";
import { sourceOptions } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { WIDGET_ICONS } from "@/lib/widget-icons";
import type { ModuleSetting, ModuleSettingValue, ModuleSettings } from "@/modules/types";
import { AlignGrid } from "./align-grid";
import { MediaField } from "./media-field";
import { ColorRow, SegmentedRow, SelectRow, SliderRow, StackRow, TextRow, ToggleRow } from "./setting-rows";
import { MediaDevicePicker, MultiSelect, WavelinkMeterPicker } from "./setting-pickers";

/** The control for one setting, chosen by its schema type. */
export function SettingRow({
  def,
  value,
  valueY,
  onChange,
  onApply,
  onPatch,
  sources,
}: {
  def: ModuleSetting;
  value: ModuleSettingValue;
  /** Type "align": the value of `def.keyY`. */
  valueY?: ModuleSettingValue;
  onChange: (value: ModuleSettingValue) => void;
  /** Preset bundles: apply extra key/values alongside the selected one. */
  onApply?: (bundle: ModuleSettings) => void;
  /** Type "align": write both keys as one change. */
  onPatch?: (patch: ModuleSettings) => void;
  sources: ApiSources | null;
}) {
  switch (def.type) {
    case "align": {
      const auto = String(def.default);
      return (
        <StackRow label={def.label}>
          <AlignGrid
            label={def.label}
            x={String(value)}
            y={String(valueY ?? def.default)}
            spread="x"
            onChange={(x, y) => onPatch?.({ [def.key]: x ?? auto, [def.keyY ?? def.key]: y ?? auto })}
          />
        </StackRow>
      );
    }

    case "boolean":
      return <ToggleRow label={def.label} value={value === true} onChange={onChange} />;

    case "color":
      return (
        <ColorRow
          label={def.label}
          value={typeof value === "string" ? value : String(def.default ?? "")}
          onChange={onChange}
        />
      );

    case "number":
      return (
        <SliderRow
          label={def.label}
          value={typeof value === "number" ? value : Number(def.default) || 0}
          min={def.min}
          max={def.max}
          step={def.step}
          fallback={Number(def.default) || 0}
          onChange={onChange}
        />
      );

    case "select": {
      // Capture devices: options come from an async `enumerateDevices()`
      // hook, so a dedicated component owns it.
      if (def.optionsFrom === "media") {
        return (
          <MediaDevicePicker def={def} value={String(value)} onChange={onChange} />
        );
      }
      // Wave Link meters: options come from the plugin's live inventory
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
            ? sourceOptions(sources, def.sourcePlugin)
            : def.options;
        return (
          <StackRow label={def.label}>
            <MultiSelect value={String(value)} onChange={onChange} options={multiOptions ?? []} />
          </StackRow>
        );
      }
      const apply = (v: string) => {
        onChange(v);
        // Preset bundle: persist the option's extra values alongside.
        const applies = def.options?.find((o) => o.value === v)?.applies;
        if (applies) onApply?.(applies);
      };
      // Dynamic options resolved from live sensor data (a plugin's
      // currently-exposed containers), falling back to the static list.
      const options =
        (def.optionsFrom === "sources" && def.sourcePlugin
          ? sourceOptions(sources, def.sourcePlugin)
          : def.options) ?? [];
      const choices = options.map((o) => ({ value: o.value, label: o.label }));
      return options.length <= 4 && options.length > 0 ? (
        <SegmentedRow label={def.label} options={choices} value={String(value)} onChange={apply} />
      ) : (
        <SelectRow label={def.label} options={choices} value={String(value)} onChange={apply} />
      );
    }

    case "icon": {
      const str = String(value);
      return (
        <StackRow label={def.label}>
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
        </StackRow>
      );
    }

    case "image": {
      // Typed, uploaded or picked from the library; "" means none.
      const url = String(value);
      return (
        <MediaField
          label={def.label}
          kind="image"
          value={url === "" ? undefined : url}
          onChange={(src) => onChange(src ?? "")}
          preview="thumb"
        />
      );
    }

    default:
      return (
        <TextRow
          label={def.label}
          value={String(value)}
          multiline={def.multiline}
          onChange={onChange}
        />
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
