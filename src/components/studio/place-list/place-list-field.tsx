// A recipe placement's place list in its Content tab (Phase 5c): the setting holds the list as JSON text (a placement's settings are
// scalars), edited as places. Its own chunk, loaded when such a row is drawn.
import type { ModuleSetting, ModuleSettingValue } from "@/modules/types";
import { PlaceListEditor } from "./place-list-editor";
import { placeList } from "./place-search";

export interface PlaceListFieldProps {
  def: ModuleSetting;
  value: ModuleSettingValue;
  onChange: (value: ModuleSettingValue) => void;
}

export default function PlaceListField({ def, value, onChange }: PlaceListFieldProps) {
  return <PlaceListEditor label={def.label} places={placeList(value === "" ? def.default : value)} onChange={(places) => onChange(JSON.stringify(places))} />;
}
