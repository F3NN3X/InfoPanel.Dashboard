import { Tag } from "@/components/ui/tag";
import { Toggle } from "@/components/ui/toggle";
import { GROUP_LABEL } from "./explorer-parts";
import type { TypeFilter } from "./explorer-model";

const TYPES: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "number", label: "Numbers" },
  { value: "text", label: "Text" },
  { value: "image", label: "Images" },
  { value: "list", label: "Lists" },
  { value: "url", label: "Links" },
];

interface TypeFiltersProps {
  type: TypeFilter;
  onType: (type: TypeFilter) => void;
  /** Points with no value in the scope: the count beside Hide empty. */
  emptyCount: number;
  hideEmpty: boolean;
  onHideEmpty: (on: boolean) => void;
  inUse: boolean;
  onInUse: (on: boolean) => void;
}

/** The Data page's Type tags and its two switches, under the Sources list. */
export function TypeFilters({ type, onType, emptyCount, hideEmpty, onHideEmpty, inUse, onInUse }: TypeFiltersProps) {
  return (
    <section aria-label="Filters" className="flex flex-col gap-3 px-3 pb-4 pt-5 font-ui">
      <h2 className={`${GROUP_LABEL} m-0 px-2`}>Type</h2>
      <div role="group" aria-label="Type" className="flex flex-wrap gap-1.5 px-2">
        {TYPES.map((t) => (
          <Tag key={t.value} selected={type === t.value} onClick={() => onType(t.value)}>
            {t.label}
          </Tag>
        ))}
      </div>
      <div className="flex flex-col gap-1 px-2 pt-1">
        <label className="flex h-8 items-center gap-2 text-body text-ui-2">
          <span className="flex-1">
            Hide empty <span className="ml-1 font-ui-mono text-caption text-ui-hint">{emptyCount}</span>
          </span>
          <Toggle label="Hide empty" checked={hideEmpty} onChange={onHideEmpty} />
        </label>
        <label className="flex h-8 items-center gap-2 text-body text-ui-2">
          <span className="flex-1">Only in use</span>
          <Toggle label="Only in use" checked={inUse} onChange={onInUse} />
        </label>
      </div>
    </section>
  );
}
