import { hslToHex, hexToHsl, THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { useInspectorAdvanced } from "./inspector/inspector-prefs";
import { InlineRow, SelectRow, SliderRow } from "./setting-rows";

/** Tokens with an editor row; the first six are always shown (DECISIONS.md #8), the rest are Advanced. */
const VISIBLE_TOKENS: [keyof ThemeTokens, string][] = [
  ["primary", "Primary"],
  ["accent", "Accent"],
  ["background", "Background"],
  ["foreground", "Foreground"],
  ["card", "Card"],
  ["card-foreground", "Card text"],
];

const ADVANCED_TOKENS: [keyof ThemeTokens, string][] = [
  ["primary-foreground", "Primary text"],
  ["secondary", "Secondary"],
  ["muted", "Muted"],
  ["muted-foreground", "Muted text"],
  ["destructive", "Destructive"],
  ["border", "Border"],
  ["ring", "Ring"],
];

interface ThemePanelProps {
  tokens: ThemeTokens;
  radius: number;
  presetName: string;
  onToken: (key: keyof ThemeTokens, value: string) => void;
  onRadius: (radius: number) => void;
  onPreset: (name: string) => void;
}

/** A theme colour: its hex and a swatch opening the native picker (stored as an HSL triplet). */
function TokenRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const hex = hslToHex(value);
  return (
    <InlineRow label={label}>
      <span className="flex items-center gap-1.5">
        <span className="font-ui-mono text-[11.5px] text-ui-2">{hex.toUpperCase()}</span>
        <label
          className="relative h-[22px] w-[22px] shrink-0 cursor-pointer overflow-hidden rounded-md border border-ui-strong"
          style={{ backgroundColor: hex }}
        >
          <input
            type="color"
            aria-label={label}
            value={hex}
            onChange={(e) => onChange(hexToHsl(e.currentTarget.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </span>
    </InlineRow>
  );
}

/**
 * Appearance › Theme (shadcn-themer style): a theme preset that changes
 * the colours only (appearance presets above change the whole look), the
 * corner radius, and per-token colour pickers — the main ones always, the
 * rest as Advanced. Changes apply live through the CSS variables.
 */
export function ThemePanel({ tokens, radius, presetName, onToken, onRadius, onPreset }: ThemePanelProps) {
  const [advanced, setAdvanced] = useInspectorAdvanced();
  const edited = presetName === "custom";
  const row = ([key, label]: [keyof ThemeTokens, string]) => (
    <TokenRow key={key} label={label} value={tokens[key]} onChange={(v) => onToken(key, v)} />
  );
  return (
    <div className="space-y-2">
      <SelectRow
        label="Preset"
        hint="Theme colours only; the corner radius stays"
        options={[
          ...THEME_PRESETS.map((p) => ({ value: p.name, label: p.label })),
          ...(edited ? [{ value: "custom", label: "Custom (edited)" }] : []),
        ]}
        value={presetName}
        onChange={(name) => name !== "custom" && onPreset(name)}
      />
      <SliderRow label="Corner radius (rem)" value={radius} min={0} max={1.25} step={0.25} fallback={0.5} onChange={onRadius} />
      {VISIBLE_TOKENS.map(row)}
      {advanced ? (
        ADVANCED_TOKENS.map(row)
      ) : (
        <button
          type="button"
          onClick={() => setAdvanced(true)}
          className="w-full rounded-lg border border-dashed border-ui-strong py-1.5 text-[12px] text-ui-3 hover:border-ui-accent hover:text-ui-1"
        >
          Show {ADVANCED_TOKENS.length} advanced colors
        </button>
      )}
    </div>
  );
}
