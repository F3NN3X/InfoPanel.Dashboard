import { THEME_PRESETS, resolveTheme, type ThemeTokens } from "@/lib/theme";
import { SegmentedRow } from "./setting-rows";
import { matchesQuery } from "./settings-model";
import { ThemePanel } from "./theme-panel";

/** A profile's own theme: unset fields = the dashboard's. */
export interface ProfileTheme {
  theme?: Partial<ThemeTokens>;
  radius?: number;
}

interface ProfileThemePanelProps {
  /** The dashboard's theme (what Inherit shows, and where Custom starts). */
  dashboard: { theme: ThemeTokens; radius: number };
  profile: ProfileTheme;
  profileName: string;
  /** Replace the profile's own theme (both fields undefined = inherit). */
  onChange: (next: ProfileTheme, key?: string) => void;
  /** The inspector search (see ThemePanel). */
  query?: string;
}

const MODES = [
  { value: "inherit" as const, label: "Inherit", title: "Use the dashboard's theme colours" },
  { value: "custom" as const, label: "Custom", title: "Own theme colours for this profile" },
];

/**
 * "This profile" › Theme colours: Inherit the dashboard's theme, or give
 * the profile its own colours and corner radius (the kiosk shows them for
 * this profile; the studio canvas previews them, its chrome keeps the
 * dashboard's). Custom starts from the dashboard's current theme.
 */
export function ProfileThemePanel({ dashboard, profile, profileName, onChange, query = "" }: ProfileThemePanelProps) {
  const custom = profile.theme !== undefined;
  const { tokens } = resolveTheme(dashboard, profile);
  const presetName = THEME_PRESETS.find((p) => JSON.stringify(p.tokens) === JSON.stringify(tokens))?.name ?? "custom";

  // While searching the mode switch only lists when it is what matches.
  const showMode = matchesQuery(["This profile", "Inherit", "Custom"], query) || !custom;
  return (
    <div className="space-y-3">
      {showMode && (
        <SegmentedRow
          label="This profile"
          options={MODES}
          value={custom ? "custom" : "inherit"}
          onChange={(mode) =>
            onChange({ theme: mode === "inherit" ? undefined : { ...dashboard.theme }, radius: profile.radius })
          }
        />
      )}
      {custom ? (
        <ThemePanel
          tokens={tokens}
          presetName={presetName}
          query={query}
          onToken={(key, value) => onChange({ ...profile, theme: { ...tokens, [key]: value } }, `profile-theme:${key}`)}
          onPreset={(name) => {
            const preset = THEME_PRESETS.find((p) => p.name === name);
            if (preset) onChange({ ...profile, theme: { ...preset.tokens } });
          }}
        />
      ) : (
        <p className="text-[11px] leading-snug text-ui-4">
          <span className="text-ui-2">{profileName}</span> uses the dashboard&apos;s theme colours (All profiles).
        </p>
      )}
    </div>
  );
}
