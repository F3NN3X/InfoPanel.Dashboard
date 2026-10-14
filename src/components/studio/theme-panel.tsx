import { hslToHex, hexToHsl, THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { useInspectorAdvanced } from "./inspector/inspector-prefs";
import { ColorPill } from "./inspector/color-pill";
import { cn } from "@/lib/utils";
import { InlineRow } from "./setting-rows";
import { ADVANCED_TOKENS, themeRows, type TokenRow } from "./theme-rows";

interface ThemePanelProps {
  tokens: ThemeTokens;
  presetName: string;
  onToken: (key: keyof ThemeTokens, value: string) => void;
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

/** A theme preset at thumbnail size: its page, a card on it and the primary colour. */
function ThemeSwatch({ tokens }: { tokens: ThemeTokens }) {
  const c = (key: keyof ThemeTokens) => `hsl(${tokens[key]})`;
  return (
    <div className="flex h-9 items-end rounded-[8px] p-1.5" style={{ background: c("background") }}>
      <div
        className="flex h-full w-full items-center gap-1 rounded-[5px] border px-1.5"
        style={{ background: c("card"), borderColor: c("border") }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c("primary") }} />
        <span className="h-[3px] min-w-0 flex-1 rounded-full" style={{ background: c("muted-foreground") }} />
      </div>
    </div>
  );
}

/** The theme presets as swatches; an edited theme shows as Custom (no swatch active). */
function ThemeSwatches({ presetName, edited, onPreset }: { presetName: string; edited: boolean; onPreset: (name: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[12.5px] text-ui-1">Theme</span>
        <span className="text-[11px] text-ui-4">{edited ? "Custom (edited)" : "Colours only"}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPreset(p.name)}
            aria-label={`Theme ${p.label}`}
            aria-pressed={p.name === presetName}
            className="min-w-0 text-left outline-none"
          >
            <div
              className={cn(
                "rounded-[10px] p-[2px]",
                p.name === presetName ? "ring-2 ring-ui-accent" : "hover:ring-1 hover:ring-ui-strong"
              )}
            >
              <ThemeSwatch tokens={p.tokens} />
            </div>
            <div className={cn("mt-1 truncate text-[10.5px]", p.name === presetName ? "text-ui-1" : "text-ui-3")}>{p.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Appearance › Theme (shadcn-themer style): a theme preset that changes
 * the colours only (the corner radius is per profile, in the Profile tab),
 * and per-token colour pickers — the main ones always, the
 * rest as Advanced. Changes apply live through the CSS variables.
 */
export function ThemePanel({ tokens, presetName, onToken, onPreset, query = "" }: ThemePanelProps) {
  const [advanced, setAdvanced] = useInspectorAdvanced();
  const edited = presetName === "custom";
  const row = ([key, label]: TokenRow) => (
    <TokenRow key={key} label={label} value={tokens[key]} onChange={(v) => onToken(key, v)} />
  );
  const {
    filtering,
    preset: showPreset,
    visible: visibleTokens,
    advanced: hiddenTokens,
  } = themeRows(query);
  return (
    <div className="space-y-2">
      {showPreset && <ThemeSwatches presetName={presetName} edited={edited} onPreset={onPreset} />}
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
