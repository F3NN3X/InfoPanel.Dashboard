import type { ReactNode } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { BACKGROUND_DEFAULTS, type PageBackground } from "@/lib/appearance";
import type { MonitorProfile } from "@/lib/layout";
import { MAX_SPACING, normalizeSpacing, profileGap, profilePadding } from "@/lib/profile-grid";
import type { ThemeTokens } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { BackgroundTarget } from "../background-panel";
import type { ProfileTheme } from "../profile-theme-panel";
import { FIELD } from "../setting-rows";
import { changeCols, changeRows } from "../studio-actions";

/**
 * Dashboard › Profile (README §4.7): the active profile's name, design
 * size, grid, fit and spacing; whether it inherits the dashboard's theme,
 * style and background; and Auto-pick by window size.
 */

type UpdateProfile = (fn: (p: MonitorProfile) => MonitorProfile, key?: string) => void;

const LABEL = "text-[12.5px] text-ui-2";

function Field({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 flex-1 space-y-1" title={title}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

function Stepper({
  label,
  value,
  onStep,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
}) {
  const button = "flex h-[30px] w-7 items-center justify-center text-ui-3 hover:bg-ui-hover hover:text-ui-1";
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <span className={LABEL}>{label}</span>
      <div className="flex items-center overflow-hidden rounded-md border border-ui-default bg-ui-app">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => onStep(-1)} className={button}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="flex-1 text-center font-ui-mono text-[12px] text-ui-1">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onStep(1)} className={button}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const INPUT = cn(FIELD, "h-[30px] w-full");

/** A px field for the grid spacing: empty = the default (shown as the placeholder). */
function SpacingField({
  label,
  title,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  title: string;
  value: number | undefined;
  placeholder: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Field label={label} title={title}>
      <input
        type="number"
        min={0}
        max={MAX_SPACING}
        value={value ?? ""}
        placeholder={`${placeholder} (default)`}
        onChange={(e) => onChange(e.target.value === "" ? undefined : normalizeSpacing(Number(e.target.value)))}
        className={cn(INPUT, "font-ui-mono")}
      />
    </Field>
  );
}

/** Name, design size, grid columns / rows, Fill / Scroll, gap and padding; delete the profile. */
export function ProfileFields({
  profile,
  updateProfile,
  canRemove,
  onRemove,
}: {
  profile: MonitorProfile;
  updateProfile: UpdateProfile;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const patch = (p: Partial<MonitorProfile>) =>
    updateProfile((cur) => ({ ...cur, ...p }), `profile:${Object.keys(p).join()}`);
  return (
    <div className="space-y-3">
      <Field label="Name">
        <input value={profile.name} onChange={(e) => patch({ name: e.target.value })} className={INPUT} />
      </Field>
      <div className="flex gap-2">
        <Field label="Width" title="Design size (px)">
          <input
            type="number"
            value={profile.width}
            onChange={(e) => patch({ width: parseInt(e.target.value, 10) || 0 })}
            className={cn(INPUT, "font-ui-mono")}
          />
        </Field>
        <Field label="Height" title="Design size (px)">
          <input
            type="number"
            value={profile.height}
            onChange={(e) => patch({ height: parseInt(e.target.value, 10) || 0 })}
            className={cn(INPUT, "font-ui-mono")}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Stepper label="Columns" value={profile.cols} onStep={(d) => updateProfile((p) => changeCols(p, d))} />
        <Stepper label="Rows" value={profile.rows} onStep={(d) => updateProfile((p) => changeRows(p, d))} />
      </div>
      <div className="space-y-1">
        <span className={LABEL}>Fit</span>
        <Segmented
          label="Fit"
          options={[
            { value: "fill", label: "Fill", title: "Fill the viewport" },
            { value: "scroll", label: "Scroll" },
          ]}
          value={profile.fit}
          onChange={(fit) => patch({ fit })}
          className="w-full *:flex-1"
        />
      </div>
      <div className="flex gap-2">
        <SpacingField
          label="Gap px"
          title="Space between zones"
          value={profile.gap}
          placeholder={profileGap({ fit: profile.fit })}
          onChange={(gap) => patch({ gap })}
        />
        <SpacingField
          label="Padding px"
          title="Space around the grid (empty: 0 for a fill kiosk page, 24 for scroll)"
          value={profile.padding}
          placeholder={profilePadding({ fit: profile.fit }, true)}
          onChange={(padding) => patch({ padding })}
        />
      </div>
      <button
        type="button"
        disabled={!canRemove}
        onClick={onRemove}
        title={canRemove ? "Delete this profile (Auto picks one afterwards)" : "The only profile can't be deleted"}
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-ui-3 hover:bg-ui-danger/15 hover:text-ui-danger disabled:pointer-events-none disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete profile
      </button>
    </div>
  );
}

const INHERIT_CUSTOM = [
  { value: "inherit" as const, label: "Inherit" },
  { value: "custom" as const, label: "Custom" },
];

const BACKGROUND_MODES = [
  { value: "inherit" as const, label: "Inherit", title: "Use the dashboard background" },
  { value: "custom" as const, label: "Custom", title: "A background for this profile only" },
  { value: "none" as const, label: "None", title: "No background on this profile" },
];

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className={LABEL}>{label}</span>
      <Segmented label={label} options={options} value={value} onChange={onChange} className="w-full *:flex-1" />
    </div>
  );
}

/** This profile: Theme / Style Inherit or Custom, Background Inherit / Custom / None. */
export function ProfileInherit({
  profile,
  dashboardTheme,
  dashboardBackground,
  onProfileTheme,
  onBackground,
  updateProfile,
}: {
  profile: MonitorProfile;
  dashboardTheme: { theme: ThemeTokens; radius: number };
  dashboardBackground: PageBackground | undefined;
  onProfileTheme: (next: ProfileTheme) => void;
  onBackground: (target: BackgroundTarget, bg: PageBackground | undefined) => void;
  updateProfile: UpdateProfile;
}) {
  const ownTheme = profile.theme !== undefined || profile.radius !== undefined;
  const background = !profile.background ? "inherit" : profile.background.type === "none" ? "none" : "custom";
  return (
    <div className="space-y-3">
      <ChoiceRow
        label="Theme"
        options={INHERIT_CUSTOM}
        value={ownTheme ? "custom" : "inherit"}
        onChange={(mode) =>
          onProfileTheme(mode === "inherit" ? {} : { theme: { ...dashboardTheme.theme }, radius: dashboardTheme.radius })
        }
      />
      <ChoiceRow
        label="Style"
        options={INHERIT_CUSTOM}
        value={profile.style ? "custom" : "inherit"}
        onChange={(mode) =>
          updateProfile((p) => ({ ...p, style: mode === "inherit" ? undefined : (p.style ?? {}) }), "profile:style")
        }
      />
      <ChoiceRow
        label="Background"
        options={BACKGROUND_MODES}
        value={background}
        onChange={(mode) => {
          if (mode === background) return;
          if (mode === "inherit") onBackground("profile", undefined);
          else if (mode === "none") onBackground("profile", { type: "none" });
          // Custom starts from the dashboard's background, or a plain color.
          else
            onBackground(
              "profile",
              dashboardBackground && dashboardBackground.type !== "none"
                ? dashboardBackground
                : { type: "color", color: BACKGROUND_DEFAULTS.color }
            );
        }}
      />
      <p className="text-[11px] leading-snug text-ui-4">
        Edit the custom theme and background under Appearance (This profile), the style under Global style.
      </p>
    </div>
  );
}

/** Auto-pick: show the profile closest to the window size (else this one stays pinned). */
export function AutoPick({ auto, onAuto }: { auto: boolean; onAuto: (auto: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={LABEL}>Auto-pick by window size</span>
      <Toggle checked={auto} onChange={onAuto} label="Auto-pick by window size" />
    </div>
  );
}
