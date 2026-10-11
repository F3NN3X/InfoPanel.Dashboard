import { Fragment, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useSensorCatalog, type ApiSources } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  settingKeys,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
} from "@/modules/types";
import { CollapsibleSection } from "./collapsible-section";
import { SettingRow } from "./setting-control";
import { settingStateOf, type SettingState } from "./settings-model";

interface SettingsPanelProps {
  /** The settings schema (a module's `settings`, or the profile style). */
  defs: ModuleSetting[] | undefined;
  /** The saved settings (undefined = all defaults). */
  value?: ModuleSettings;
  /**
   * Values inherited from the profile's style: shown when `value` has no
   * own entry; a row's dot says where its value comes from.
   */
  inherited?: ModuleSettings;
  onChange: (key: string, value: ModuleSettingValue) => void;
  /** Set several keys as one change (an "align" picker's two axes). */
  onPatch: (patch: ModuleSettings) => void;
  /**
   * Drop a setting's own values (fall back to the inherited / default
   * ones) — every key it stores, as one change.
   */
  onClear?: (keys: string[]) => void;
  /** Reset every setting in `defs`; omit to hide the Reset link. */
  onReset?: () => void;
  title?: string;
  /** Extra controls in the header row, before Reset. */
  actions?: ReactNode;
  /** Prefix of the remembered section ids ("widget", "profile", …). */
  sectionScope?: string;
  /** Open every group (e.g. while searching). */
  openAll?: boolean;
  /**
   * Search results: render the rows flat, each under this breadcrumb
   * ("Style › Colors & type") instead of in collapsible groups.
   */
  breadcrumb?: (def: ModuleSetting) => string;
}

/**
 * Schema-driven settings editor. Renders one control per entry in `defs`;
 * values are stored on the placement (or profile), merged over the
 * profile's style and the module's defaults at render time.
 */
export function SettingsPanel({
  defs,
  value,
  inherited,
  onChange,
  onPatch,
  onClear,
  onReset,
  title = "Settings",
  actions,
  sectionScope = "widget",
  openAll = false,
  breadcrumb,
}: SettingsPanelProps) {
  // Options of `optionsFrom: "sources"` come from the Data API's plugin tree.
  const { sources } = useSensorCatalog();
  if (!defs || defs.length === 0) return null;

  const field = (def: ModuleSetting) => (
    <SettingField
      key={def.key}
      def={def}
      value={value}
      inherited={inherited}
      onChange={onChange}
      onPatch={onPatch}
      onClear={onClear}
      sources={sources}
      crumb={breadcrumb?.(def)}
    />
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onReset && (
            <button
              onClick={onReset}
              className="text-[11px] text-muted-foreground hover:text-foreground"
              title="Reset to defaults"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {breadcrumb
          ? defs.map(field)
          : groupDefs(defs).map((block, i) => {
              const rows = block.defs.map(field);
              if (!block.group) return <Fragment key={`top-${i}`}>{rows}</Fragment>;
              const changed = block.defs.filter(
                (d) => settingKeys(d).some((k) => value?.[k] !== undefined && value[k] !== d.default)
              ).length;
              return (
                <CollapsibleSection
                  key={block.group}
                  id={`${sectionScope}:${block.group}`}
                  title={block.group}
                  aside={changed > 0 ? `${changed} changed` : ""}
                  forceOpen={openAll}
                >
                  {rows}
                </CollapsibleSection>
              );
            })}
      </div>
    </div>
  );
}

const STATE_DOT: Record<Exclude<SettingState, "default">, string> = {
  own: "bg-ring",
  profile: "bg-amber-400",
  override: "bg-ring ring-[1.5px] ring-amber-400",
};

const STATE_TITLE: Record<Exclude<SettingState, "default">, string> = {
  own: "Set on this widget",
  profile: "From the profile style",
  override: "Overrides the profile style",
};

/**
 * One setting: its control plus a state dot in the left gutter (where the
 * value comes from). Hovering a row with an own value turns the dot into a
 * reset button that drops it (back to the profile style / the default).
 */
function SettingField({
  def,
  value,
  inherited,
  onChange,
  onPatch,
  onClear,
  sources,
  crumb,
}: {
  def: ModuleSetting;
  value: ModuleSettings | undefined;
  inherited: ModuleSettings | undefined;
  onChange: (key: string, value: ModuleSettingValue) => void;
  onPatch: (patch: ModuleSettings) => void;
  onClear?: (keys: string[]) => void;
  sources: ApiSources | null;
  crumb?: string;
}) {
  const state = settingStateOf(def, value, inherited);
  const keys = settingKeys(def);
  const reset = () =>
    onClear ? onClear(keys) : onPatch(Object.fromEntries(keys.map((k) => [k, def.default])));
  const shown = (key: string) => value?.[key] ?? inherited?.[key] ?? def.default;
  return (
    <div>
      {crumb && <div className="mb-1 pl-3.5 text-[10px] text-muted-foreground/60">{crumb}</div>}
      <div className="group/row relative pl-3.5">
        {state !== "default" && (
          <span
            className={cn(
              "absolute left-0 flex h-3 w-3 items-center justify-center",
              def.type === "boolean" ? "top-[11px]" : "top-[2px]"
            )}
          >
            <span
              title={STATE_TITLE[state]}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                STATE_DOT[state],
                state !== "profile" && "group-hover/row:hidden"
              )}
            />
            {state !== "profile" && (
              <button
                type="button"
                onClick={reset}
                title={
                  state === "override"
                    ? `${STATE_TITLE.override} — reset to the profile value`
                    : `${STATE_TITLE.own} — reset to the default`
                }
                className="hidden text-muted-foreground hover:text-foreground group-hover/row:flex"
              >
                <RotateCcw className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        )}
        <SettingRow
          def={def}
          value={shown(def.key)}
          valueY={def.keyY ? shown(def.keyY) : undefined}
          onChange={(v) => onChange(def.key, v)}
          onPatch={onPatch}
          onApply={(bundle) => {
            // Preset bundle: persist each value alongside.
            for (const [k, v] of Object.entries(bundle)) onChange(k, v);
          }}
          sources={sources}
        />
      </div>
    </div>
  );
}

interface SettingBlock {
  /** Undefined for top-level settings. */
  group?: string;
  defs: ModuleSetting[];
}

/**
 * Settings in display order: ungrouped ones as they come, each group
 * collected into one block where its first setting appears.
 */
export function groupDefs(defs: ModuleSetting[]): SettingBlock[] {
  const blocks: SettingBlock[] = [];
  const byGroup = new Map<string, SettingBlock>();
  for (const def of defs) {
    if (!def.group) {
      const last = blocks.at(-1);
      if (last && !last.group) last.defs.push(def);
      else blocks.push({ defs: [def] });
      continue;
    }
    let block = byGroup.get(def.group);
    if (!block) {
      block = { group: def.group, defs: [] };
      byGroup.set(def.group, block);
      blocks.push(block);
    }
    block.defs.push(def);
  }
  return blocks;
}
