import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { useSensors } from "@/hooks/useSensors";
import { useSensorCatalog } from "@/lib/catalog";
import { buildDataModel } from "@/lib/data-points";
import { clearItem, itemsOf, setItemField, splitKeys, type ItemField } from "@/widgets/registry/settings-kit";
import { liveText } from "../inspector/bound-data-model";
import { FIELD, StackRow, type RowLabelProps } from "../setting-rows";
import { sensorName } from "../widget-kinds";

const DECIMALS = [0, 1, 2, 3, 4];
const NUMBERS = [
  ["max", "Max"],
  ["warn", "Warn"],
  ["crit", "Crit"],
] as const;

const cell = `${FIELD} h-[26px] w-full min-w-0 px-1.5 font-ui-mono text-[11.5px]`;

/**
 * A `sensorItems` setting: one row per bound sensor of the setting it refers to (`keys`) with
 * its live value, a label and max / warn / crit / decimals; blank = the shared value. The overrides
 * are stored as one JSON string; `onChange` gets an edit key per sensor and field so typing coalesces.
 */
export function SensorItemsField({
  value,
  keys: bound,
  onChange,
  ...label
}: RowLabelProps & { value: string; keys: string; onChange: (value: string, editKey: string) => void }) {
  const keys = splitKeys(bound);
  const items = itemsOf(value);
  const live = useSensors(keys);
  const catalog = useSensorCatalog();
  const model = useMemo(() => buildDataModel(catalog.sources, catalog.sensors), [catalog.sources, catalog.sensors]);
  const set = (key: string, field: ItemField, v: string | number | undefined) => onChange(setItemField(value, key, field, v), `items:${key}:${field}`);
  return (
    <StackRow {...label}>
      {keys.length === 0 ? (
        <span className="text-[11px] text-ui-4">Bind sensors first</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {keys.map((key) => {
            const point = model.byKey.get(key);
            const name = point?.name ?? sensorName(key);
            const own = items[key] ?? {};
            return (
              <li key={key} className="space-y-1.5 rounded-[7px] border border-ui-default bg-ui-app p-2">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ui-1" title={key}>
                    {name}
                  </span>
                  <span className="shrink-0 font-ui-mono text-[11px] text-ui-4">{liveText(live[key], point) ?? "–"}</span>
                  <button
                    type="button"
                    onClick={() => onChange(clearItem(value, key), `items:${key}:reset`)}
                    disabled={Object.keys(own).length === 0}
                    aria-label={`Reset ${name}`}
                    title="Reset this sensor"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ui-4 hover:bg-ui-hover hover:text-ui-1 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  aria-label={`${name} label`}
                  placeholder={name}
                  value={own.label ?? ""}
                  onChange={(e) => set(key, "label", e.target.value || undefined)}
                  className={`${FIELD} h-[26px] w-full`}
                />
                <div className="grid grid-cols-4 gap-1.5">
                  {NUMBERS.map(([field, text]) => (
                    <input
                      key={field}
                      type="number"
                      aria-label={`${name} ${text}`}
                      placeholder={text}
                      title={`${text} (blank = shared)`}
                      value={own[field] ?? ""}
                      onChange={(e) => set(key, field, e.target.value === "" ? undefined : Number(e.target.value))}
                      className={cell}
                    />
                  ))}
                  <select
                    aria-label={`${name} decimals`}
                    title="Decimals"
                    value={own.decimals ?? ""}
                    onChange={(e) => set(key, "decimals", e.target.value === "" ? undefined : Number(e.target.value))}
                    className={`${cell} cursor-pointer`}
                  >
                    <option value="">Auto</option>
                    {DECIMALS.map((n) => (
                      <option key={n} value={n}>
                        {n} dec
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </StackRow>
  );
}
