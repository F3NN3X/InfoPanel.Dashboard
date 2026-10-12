import type { ApiSources } from "@/lib/catalog";
import {
  settingKeys,
  type ModuleSetting,
  type ModuleSettingValue,
  type ModuleSettings,
} from "@/modules/types";
import { SourceDot } from "./inspector/source-dot";
import { sourceState, type LookValues } from "./inspector-model";
import { SettingRow } from "./setting-control";

/** What the fields of one inspector read and write (a zone, several zones, a global style). */
export interface FieldsApi {
  /** Where each value comes from (the source dots, changed counts, resets). */
  values: LookValues;
  /** The value a row shows for one key. */
  shown: (key: string, def: ModuleSetting) => ModuleSettingValue;
  onChange: (key: string, value: ModuleSettingValue) => void;
  /** Set several keys as one change (an "align" picker's two axes). */
  onPatch: (patch: ModuleSettings) => void;
  /** Drop settings' own values (back to the inherited / default ones) as one change. */
  onClear: (keys: string[]) => void;
  /** Sensor settings: the data picker's "Open data explorer". */
  onOpenExplorer?: () => void;
}

/**
 * One setting as a field row (padding 6px 16px): the source dot (none at the
 * default) before its label (clicking a dot set here resets the setting), the hint, and the
 * control chosen by its schema type.
 */
export function SettingField({
  def,
  fields,
  sources,
}: {
  def: ModuleSetting;
  fields: FieldsApi;
  sources: ApiSources | null;
}) {
  const state = sourceState(def, fields.values);
  return (
    <div data-setting-key={def.key} className="break-inside-avoid px-4 py-1.5">
      <SettingRow
        def={def}
        value={fields.shown(def.key, def)}
        valueY={def.keyY ? fields.shown(def.keyY, def) : undefined}
        onChange={(v) => fields.onChange(def.key, v)}
        onPatch={fields.onPatch}
        onApply={fields.onPatch}
        onOpenExplorer={fields.onOpenExplorer}
        sources={sources}
        hint={def.hint}
        lead={state === "default" ? undefined : <SourceDot state={state} onReset={() => fields.onClear(settingKeys(def))} />}
      />
    </div>
  );
}
