import { Ban } from "lucide-react";
import { IconGrid, type IconGridItem } from "@/components/ui/icon-grid";
import type { ApiSources } from "@/lib/catalog";
import { sourceOptions } from "@/lib/sources";
import { WIDGET_ICONS } from "@/lib/widget-icons";
import type { ModuleSetting, ModuleSettingValue, ModuleSettings } from "@/modules/types";
import { AlignGrid } from "./align-grid";
import { splitUnit } from "./inspector/number-box";
import { MediaField } from "./media-field";
import {
  ColorRow,
  SegmentedRow,
  SelectRow,
  SliderRow,
  StackRow,
  TextRow,
  ToggleRow,
  type RowLabelProps,
} from "./setting-rows";
import { MediaDevicePicker, MultiSelect, WavelinkMeterPicker } from "./setting-pickers";

/** The icon grid's cells: "none" first, then every widget icon. */
const ICONS: IconGridItem[] = [
  { id: "", label: "None", icon: <Ban /> },
  ...Object.entries(WIDGET_ICONS).map(([name, Icon]) => ({ id: name, label: name, icon: <Icon /> })),
];

/** Placeholders of text settings by key (a panel's title, empty = hidden, has none). */
const PLACEHOLDERS: Record<string, string> = {
  label: "Uses the widget name",
};

const placeholderOf = (def: ModuleSetting): string | undefined =>
  def.label.startsWith("Title") ? undefined : PLACEHOLDERS[def.key];

/** The control for one setting, chosen by its schema type. */
export function SettingRow({
  def,
  value,
  valueY,
  onChange,
  onApply,
  onPatch,
  sources,
  lead,
  hint,
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
  /** Before the label (the source dot). */
  lead?: RowLabelProps["lead"];
  hint?: string;
}) {
  const label: RowLabelProps = { label: def.label, lead, hint };
  switch (def.type) {
    case "align": {
      const auto = String(def.default);
      return (
        <StackRow {...label}>
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
      return <ToggleRow {...label} value={value === true} onChange={onChange} />;

    case "color":
      return (
        <ColorRow {...label} value={typeof value === "string" ? value : String(def.default ?? "")} onChange={onChange} />
      );

    case "number": {
      // "Size (%)": the unit moves to the value box.
      const { label: name, unit } = splitUnit(def.label);
      return (
        <SliderRow
          {...label}
          label={name}
          unit={unit}
          value={typeof value === "number" ? value : Number(def.default) || 0}
          min={def.min}
          max={def.max}
          step={def.step}
          fallback={Number(def.default) || 0}
          onChange={onChange}
        />
      );
    }

    case "select": {
      // Capture devices: options come from an async `enumerateDevices()`
      // hook, so a dedicated component owns it.
      if (def.optionsFrom === "media") {
        return <MediaDevicePicker def={def} value={String(value)} onChange={onChange} lead={lead} hint={hint} />;
      }
      // Wave Link meters: options come from the plugin's live inventory
      // (channels + output devices), so a dedicated component owns it.
      if (def.optionsFrom === "wavelink") {
        return <WavelinkMeterPicker def={def} value={String(value)} onChange={onChange} lead={lead} hint={hint} />;
      }
      // Dynamic options resolved from live sensor data (a plugin's
      // currently-exposed containers), falling back to the static list.
      const options =
        (def.optionsFrom === "sources" && def.sourcePlugin ? sourceOptions(sources, def.sourcePlugin) : def.options) ??
        [];
      // Multi-select (stored comma-separated): a checklist.
      if (def.multiple) {
        return (
          <StackRow {...label}>
            <MultiSelect value={String(value)} onChange={onChange} options={options} label={def.label} />
          </StackRow>
        );
      }
      const apply = (v: string) => {
        onChange(v);
        // Preset bundle: persist the option's extra values alongside.
        const applies = def.options?.find((o) => o.value === v)?.applies;
        if (applies) onApply?.(applies);
      };
      const choices = options.map((o) => ({ value: o.value, label: o.label }));
      // Up to four options share a row; Layout (five) does too, the other long lists are selects.
      return (options.length <= 4 || def.key === "layout") && options.length > 0 ? (
        <SegmentedRow {...label} options={choices} value={String(value)} onChange={apply} />
      ) : (
        <SelectRow {...label} options={choices} value={String(value)} onChange={apply} />
      );
    }

    case "icon":
      return (
        <StackRow {...label}>
          <IconGrid
            icons={ICONS}
            value={String(value)}
            onChange={onChange}
            label={def.label}
            className="grid-cols-[repeat(auto-fill,minmax(30px,1fr))]!"
          />
        </StackRow>
      );

    case "image": {
      // Typed, uploaded, dropped or picked from the library; "" means none.
      const url = String(value);
      // The field draws its own label (with Upload and the library); the dot sits before it.
      return (
        <div className="flex gap-2">
          {lead && <span className="pt-[5px]">{lead}</span>}
          <div className="min-w-0 flex-1">
            <MediaField
              label={def.label}
              kind="image"
              value={url === "" ? undefined : url}
              onChange={(src) => onChange(src ?? "")}
              preview="thumb"
            />
          </div>
        </div>
      );
    }

    default:
      return (
        <TextRow
          {...label}
          value={String(value)}
          multiline={def.multiline}
          placeholder={placeholderOf(def)}
          onChange={onChange}
        />
      );
  }
}
