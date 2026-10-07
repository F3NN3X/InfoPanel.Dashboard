import { Palette } from "lucide-react";
import {
  hslToHex,
  hexToHsl,
  THEME_PRESETS,
  type ThemeTokens,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const TOKEN_ROWS: [keyof ThemeTokens, string][] = [
  ["background", "Background"],
  ["foreground", "Foreground"],
  ["card", "Card"],
  ["card-foreground", "Card text"],
  ["primary", "Primary"],
  ["primary-foreground", "Primary text"],
  ["secondary", "Secondary"],
  ["muted", "Muted"],
  ["muted-foreground", "Muted text"],
  ["accent", "Accent"],
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

/**
 * shadcn-themer-style theme editor: preset swatches, per-token color
 * pickers (native color inputs converted to HSL triplets) and a corner
 * radius slider. Changes apply live through the CSS variables.
 */
export function ThemePanel({
  tokens,
  radius,
  presetName,
  onToken,
  onRadius,
  onPreset,
}: ThemePanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Presets
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onPreset(preset.name)}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 text-left text-xs",
                presetName === preset.name
                  ? "border-ring ring-2 ring-ring/40"
                  : "border-border hover:border-ring/50"
              )}
            >
              <span className="flex shrink-0 -space-x-1.5">
                <span
                  className="h-4 w-4 rounded-full border border-foreground/20"
                  style={{ backgroundColor: hslToHex(preset.tokens.background) }}
                />
                <span
                  className="h-4 w-4 rounded-full border border-foreground/20"
                  style={{ backgroundColor: hslToHex(preset.tokens.primary) }}
                />
                <span
                  className="h-4 w-4 rounded-full border border-foreground/20"
                  style={{ backgroundColor: hslToHex(preset.tokens.accent) }}
                />
              </span>
              <span className="truncate text-foreground/85">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tokens
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {TOKEN_ROWS.map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
            >
              <span className="truncate">{label}</span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-3.5 w-3.5 rounded border border-border"
                  style={{ backgroundColor: hslToHex(tokens[key]) }}
                />
                <input
                  type="color"
                  value={hslToHex(tokens[key])}
                  onChange={(e) => onToken(key, hexToHsl(e.target.value))}
                  className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent"
                />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-muted-foreground">
            <Palette className="mr-1 inline h-3.5 w-3.5" />
            Corner radius
          </span>
          <span className="tabular-nums text-muted-foreground">
            {radius}rem
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1.25}
          step={0.25}
          value={radius}
          onChange={(e) => onRadius(parseFloat(e.target.value))}
          className="w-full accent-ring"
        />
      </div>
    </div>
  );
}
