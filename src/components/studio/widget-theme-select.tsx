import type { ModuleSettings } from "@/modules/types";
import { GALLERY_IDS, lookName } from "./look-gallery-model";
import { SelectRow, type RowLabelProps } from "./setting-rows";

/** Every theme the studio lists (Browse themes' built-in ones), as a widget's Theme options. */
const OPTIONS = GALLERY_IDS.map((id) => ({ value: id, label: lookName(id) }));

/**
 * A widget's Theme select (P-8): all the themes, theme packs included, not only the 14 skins. Picking one sets the card to
 * Auto, so the theme shows with its own card, as the skin options always did.
 */
export default function WidgetThemeSelect({ label, value, onChange, onApply }: { label: RowLabelProps; value: string; onChange: (value: string) => void; onApply?: (patch: ModuleSettings) => void }) {
  // A theme the list lacks (an imported pack a widget wears) stays selectable as it is.
  const options = OPTIONS.some((o) => o.value === value) ? OPTIONS : [...OPTIONS, { value, label: lookName(value) }];
  return (
    <SelectRow
      {...label}
      options={options}
      value={value}
      onChange={(v) => {
        onChange(v);
        onApply?.({ surface: "auto" });
      }}
    />
  );
}
