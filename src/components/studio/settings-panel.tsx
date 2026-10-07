import { Segmented } from "@/components/ui/segmented";
import {
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
} from "@/modules/types";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  module: DashboardModule;
  /** The placement's saved settings (undefined = all defaults). */
  value?: ModuleSettings;
  onChange: (key: string, value: ModuleSettingValue) => void;
  onReset: () => void;
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
}: {
  def: ModuleSetting;
  value: ModuleSettingValue;
  onChange: (value: ModuleSettingValue) => void;
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
      const hex =
        typeof value === "string" && value.length > 0
          ? value
          : String(def.default);
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
              {hex}
            </span>
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
      const str = String(value);
      if (def.options && def.options.length <= 3) {
        return (
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
            <Segmented
              options={def.options.map((o) => ({ value: o.value, label: o.label }))}
              value={str}
              onChange={(v) => onChange(v)}
            />
          </div>
        );
      }
      return (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">{def.label}</div>
          <select
            value={str}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
          >
            {def.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
