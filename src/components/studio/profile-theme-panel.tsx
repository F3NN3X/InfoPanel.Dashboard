import { Segmented } from "@/components/ui/segmented";
import { THEME_PRESETS, resolveTheme, type ThemeTokens } from "@/lib/theme";
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
export function ProfileThemePanel({ dashboard, profile, profileName, onChange }: ProfileThemePanelProps) {
  const custom = profile.theme !== undefined || profile.radius !== undefined;
  const { tokens, radius } = resolveTheme(dashboard, profile);
  const presetName =
    THEME_PRESETS.find((p) => JSON.stringify(p.tokens) === JSON.stringify(tokens))?.name ?? "custom";

  return (
    <div className="space-y-3">
      <Segmented
        options={MODES}
        value={custom ? "custom" : "inherit"}
        onChange={(mode) =>
          onChange(mode === "inherit" ? {} : { theme: { ...dashboard.theme }, radius: dashboard.radius })
        }
        className="w-full *:flex-1"
      />
      {custom ? (
        <ThemePanel
          tokens={tokens}
          radius={radius}
          presetName={presetName}
          onToken={(key, value) =>
            onChange({ ...profile, theme: { ...tokens, [key]: value } }, `profile-theme:${key}`)
          }
          onRadius={(r) => onChange({ ...profile, radius: r }, "profile-radius")}
          onPreset={(name) => {
            const preset = THEME_PRESETS.find((p) => p.name === name);
            if (preset) onChange({ ...profile, theme: { ...preset.tokens } });
          }}
        />
      ) : (
        <p className="text-[11px] text-muted-foreground/70">
          <span className="text-foreground/85">{profileName}</span> uses the dashboard&apos;s theme colours and
          corner radius (All profiles).
        </p>
      )}
    </div>
  );
}
