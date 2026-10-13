import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { useSensorCatalog } from "@/lib/catalog";
import { buildDataModel } from "@/lib/data-points";
import { joinKeys, splitKeys, toggleKey } from "@/widgets/registry/settings-kit";
import { DataPicker } from "../inspector/data-picker";
import { StackRow, type RowLabelProps } from "../setting-rows";
import { sensorName } from "../widget-kinds";

/**
 * A `sensor` setting with `multiple`: the bound keys in order (stored comma-separated), each
 * removable, and `Add` opening the data picker in multi-select mode.
 */
export function SensorListField({
  value,
  onChange,
  onOpenExplorer,
  ...label
}: RowLabelProps & { value: string; onChange: (value: string) => void; onOpenExplorer: () => void }) {
  const [open, setOpen] = useState(false);
  const catalog = useSensorCatalog();
  const model = useMemo(() => buildDataModel(catalog.sources, catalog.sensors), [catalog.sources, catalog.sensors]);
  const keys = splitKeys(value);
  return (
    <StackRow {...label}>
      {keys.length === 0 ? (
        <span className="text-[11px] text-ui-4">No sensors bound</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {keys.map((key) => (
            <li key={key} className="flex items-center gap-2 rounded-[7px] border border-ui-default bg-ui-app py-1 pl-[9px] pr-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-ui-1">{model.byKey.get(key)?.name ?? sensorName(key)}</span>
                <span className="block truncate font-ui-mono text-[10.5px] text-ui-4">{key}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(joinKeys(keys.filter((k) => k !== key)))}
                aria-label={`Unbind ${key}`}
                title="Unbind sensor"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ui-4 hover:bg-ui-hover hover:text-ui-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-ui-4 hover:text-ui-1"
      >
        <Plus className="h-3.5 w-3.5" /> Add sensors
      </button>
      <DataPicker
        open={open}
        onOpenChange={setOpen}
        title={`Pick sensors for ${label.label}`}
        points={model.points}
        mode="widget"
        bound={new Set(keys)}
        onToggle={(p) => onChange(joinKeys(toggleKey(keys, p.key)))}
        onOpenExplorer={onOpenExplorer}
      />
    </StackRow>
  );
}
