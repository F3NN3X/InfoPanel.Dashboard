import { hslToHex, hexToHsl, THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { useInspectorAdvanced } from "./inspector/inspector-prefs";
import { ColorPill } from "./inspector/color-pill";
import { InlineRow, SelectRow, SliderRow } from "./setting-rows";
import { matchesQuery } from "./settings-model";

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
  /** The inspector search: lists only the matching rows (every row when none matches). */
  query?: string;
}

/** A theme colour: its hex and a swatch opening the native picker (stored as an HSL triplet). */
function TokenRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const hex = hslToHex(value);
  return (
    <InlineRow label={label}>
      <ColorPill value={hex} label={label} onChange={(v) => onChange(hexToHsl(v))} />
    </InlineRow>
  );
}

/**
 * Appearance › Theme (shadcn-themer style): a theme preset that changes
 * the colours only (appearance presets above change the whole look), the
 * corner radius, and per-token colour pickers — the main ones always, the
 * rest as Advanced. Changes apply live through the CSS variables.
 */
export function ThemePanel({ tokens, radius, presetName, onToken, onRadius, onPreset, query = "" }: ThemePanelProps) {
  const [advanced, setAdvanced] = useInspectorAdvanced();
  const edited = presetName === "custom";
  const row = ([key, label]: [keyof ThemeTokens, string]) => (
    <TokenRow key={key} label={label} value={tokens[key]} onChange={(v) => onToken(key, v)} />
  );
  const presetLabels = THEME_PRESETS.map((p) => p.label);
  const matched = {
    preset: matchesQuery(["Theme", ...presetLabels], query),
    radius: matchesQuery(["Corner radius", "Radius"], query),
    visible: VISIBLE_TOKENS.filter(([, label]) => matchesQuery([label], query)),
    hidden: ADVANCED_TOKENS.filter(([, label]) => matchesQuery([label], query)),
  };
  // A search that names a row lists just those rows; one that only names the section lists them all.
  const filtering =
    query.trim() !== "" && (matched.preset || matched.radius || matched.visible.length + matched.hidden.length > 0);
  const showPreset = !filtering || matched.preset;
  const showRadius = !filtering || matched.radius;
  const visibleTokens = filtering ? matched.visible : VISIBLE_TOKENS;
  const hiddenTokens = filtering ? matched.hidden : ADVANCED_TOKENS;
  return (
    <div className="space-y-2">
      {showPreset && (
        <SelectRow
          label="Theme"
          hint="Theme colours only; the corner radius stays"
          options={[
            ...THEME_PRESETS.map((p) => ({ value: p.name, label: p.label })),
            ...(edited ? [{ value: "custom", label: "Custom (edited)" }] : []),
          ]}
          value={presetName}
          onChange={(name) => name !== "custom" && onPreset(name)}
        />
      )}
      {showRadius && (
        <SliderRow
          label="Corner radius"
          unit="rem"
          value={radius}
          min={0}
          max={1.5}
          step={0.05}
          fallback={0.5}
          onChange={onRadius}
        />
      )}
      {visibleTokens.map(row)}
      {advanced || filtering ? (
        hiddenTokens.map(row)
      ) : (
        <button
          type="button"
          onClick={() => setAdvanced(true)}
          className="w-full rounded-[7px] border border-dashed border-ui-strong p-[9px] text-[12px] text-ui-3 hover:border-[#3a3a44] hover:text-ui-1"
        >
          Show {ADVANCED_TOKENS.length} advanced colors
        </button>
      )}
    </div>
  );
}
