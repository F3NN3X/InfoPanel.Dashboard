import type { MonitorProfile, Placement } from "@/lib/layout";
import type { Appearance, StyleMode } from "@/lib/style-resolve";
import type { ModuleSettings } from "@/modules/types";
import { withStyleMode } from "../appearance-actions";
import { HeaderSlot } from "../inspector-layout";
import { isVisible, sharedDefs, type InspectorContext, type InspectorSection } from "../inspector-model";
import type { FieldsApi } from "../settings-panel";
import { StyleModeBar } from "../style-mode-bar";
import { MultiHeader } from "../zone-inspector-parts";
import { InspectorView, type SectionParts } from "./inspector-view";
import { shownValue, shownValues, withoutSettings, withSettings, zoneDefs, zoneLookValues } from "./zone-fields";
import { zoneName } from "./zone-meta";

interface MultiInspectorProps {
  /** The selected zones, the primary last (its values show). */
  zones: Placement[];
  appearance: Appearance;
  /** Edit the active profile (one undo step per `key`). */
  updateProfile: (fn: (p: MonitorProfile) => MonitorProfile, key?: string) => void;
  onDeselect: (id: string) => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  query: string;
  onQuery: (query: string) => void;
  jumpTo?: { id: string; seq: number };
}

/**
 * Several zones selected: no tabs, only the Style sections of the look
 * they share. The rows show the primary zone's values; every edit applies
 * to each selected zone in one undo step (a look edit switches a following
 * zone to Custom, as on one zone).
 */
export function MultiInspector({
  zones,
  appearance,
  updateProfile,
  onDeselect,
  onToggleVisible,
  onDuplicate,
  onRemove,
  query,
  onQuery,
  jumpTo,
}: MultiInspectorProps) {
  const primary = zones[zones.length - 1];
  const ids = new Set(zones.map((z) => z.id));
  const defs = sharedDefs(zones.map(zoneDefs));
  const context: InspectorContext = { kind: "multi", defs };
  const values = zoneLookValues(primary, appearance);
  const enforce = appearance.enforce;

  /** Every selected zone through `fn`, as one change. */
  const each = (fn: (z: Placement) => Placement, key?: string) =>
    updateProfile((p) => ({ ...p, placements: p.placements.map((z) => (ids.has(z.id) ? fn(z) : z)) }), key);

  const fields: FieldsApi = {
    values,
    shown: (key, def) => shownValue(values, key, def),
    onChange: (key, v) => each((z) => withSettings(z, { [key]: v }, enforce), `multi-setting:${key}`),
    onPatch: (patch: ModuleSettings) =>
      each((z) => withSettings(z, patch, enforce), `multi-setting:${Object.keys(patch).join()}`),
    onClear: (keys) => each((z) => withoutSettings(z, keys)),
  };
  const effective = shownValues(values, defs);

  const parts = (s: InspectorSection): SectionParts =>
    s.extras.some((e) => e.kind === "styleMode")
      ? {
          top: (
            <StyleModeBar
              mode={primary.styleMode}
              onMode={(mode: StyleMode) => each((z) => withStyleMode(z, mode), "multi-style-mode")}
            />
          ),
        }
      : {};

  return (
    <InspectorView
      context={context}
      contextKey="multi"
      header={
        <HeaderSlot className="w-80 shrink-0">
        <MultiHeader
          zones={zones.map((z) => ({ id: z.id, name: zoneName(z), visible: z.visible }))}
          onDeselect={onDeselect}
          onToggleVisible={onToggleVisible}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
        />
        </HeaderSlot>
      }
      fields={fields}
      visible={(def) => isVisible(def, effective)}
      parts={parts}
      query={query}
      onQuery={onQuery}
      jumpTo={jumpTo}
    />
  );
}
