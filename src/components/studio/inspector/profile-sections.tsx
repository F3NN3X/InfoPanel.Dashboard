import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { BACKGROUND_DEFAULTS, type PageBackground } from "@/lib/appearance";
import type { ProfileView } from "@/lib/layout";
import { MAX_SPACING, normalizeSpacing, profileGap, profilePadding } from "@/lib/profile-grid";
import type { ThemeTokens } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { BackgroundTarget } from "../background-panel";
import type { ProfileTheme } from "../profile-theme-panel";
import { FIELD, InlineRow, SegmentedRow, SelectRow, SliderRow, StackRow, ToggleRow } from "../setting-rows";
import { GRID_REFUSED, SIZE_OPTIONS, parseSize, sizeChoice, sizeOfChoice, stepGrid } from "./profile-grid";

/**
 * Dashboard › Profile (README §4.7): the active profile's name, design
 * size, grid, fit and spacing; whether it inherits the dashboard's theme,
 * style and background; and Auto-pick by window size.
 */

type UpdateProfile = (fn: (p: ProfileView) => ProfileView, key?: string) => void;

const INPUT = cn(FIELD, "h-[30px] w-full");

/** A design-size pixel field: a draft that commits on Enter or blur, and only when it is a size. */
function SizeInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = parseSize(draft);
    if (n !== null && n !== value) onCommit(n);
    else setDraft(String(value));
  };
  return (
    <label className="block min-w-0 flex-1 space-y-1" title="Design size (px)">
      <span className="text-[12px] text-ui-4">{label}</span>
      <input
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={cn(INPUT, "font-ui-mono")}
      />
    </label>
  );
}

/** A px field for the grid spacing: empty = the default (shown as the placeholder). */
function SpacingField({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  placeholder: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <InlineRow label={label} hint={hint}>
      <input
        type="number"
        min={0}
        max={MAX_SPACING}
        value={value ?? ""}
        placeholder={`${placeholder}`}
        aria-label={`${label} (px)`}
        onChange={(e) => onChange(e.target.value === "" ? undefined : normalizeSpacing(Number(e.target.value)))}
        className={cn(FIELD, "h-[26px] w-[64px] shrink-0 px-1.5 text-right font-ui-mono text-[11.5px]")}
      />
    </InlineRow>
  );
}

/** Name, design size, grid columns / rows, Fill / Scroll, gap and padding; delete the profile. */
export function ProfileFields({
  profile,
  updateProfile,
  canRemove,
  onRemove,
}: {
  profile: ProfileView;
  updateProfile: UpdateProfile;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const toast = useToast();
  const patch = (p: Partial<ProfileView>) =>
    updateProfile((cur) => ({ ...cur, ...p }), `profile:${Object.keys(p).join()}`);
  // The refusal is decided on the profile as rendered; the update then applies the same step.
  const setGrid = (axis: "cols" | "rows", value: number) => {
    const delta = value - profile[axis];
    if (delta === 0) return;
    if (stepGrid(profile, axis, delta) === null) toast(GRID_REFUSED);
    else updateProfile((p) => stepGrid(p, axis, value - p[axis]) ?? p);
  };
  return (
    <div className="space-y-3">
      <StackRow label="Name">
        <input value={profile.name} onChange={(e) => patch({ name: e.target.value })} className={INPUT} />
      </StackRow>
      <SelectRow
        label="Design size"
        options={SIZE_OPTIONS}
        value={sizeChoice(profile.width, profile.height)}
        onChange={(choice) => {
          const size = sizeOfChoice(choice);
          if (size) patch(size);
        }}
      />
      <div className="flex gap-2">
        <SizeInput label="Width" value={profile.width} onCommit={(width) => patch({ width })} />
        <SizeInput label="Height" value={profile.height} onCommit={(height) => patch({ height })} />
      </div>
      <SliderRow label="Grid columns" value={profile.cols} min={2} max={24} fallback={12} onChange={(v) => setGrid("cols", v)} />
      <SliderRow label="Grid rows" value={profile.rows} min={1} max={24} fallback={6} onChange={(v) => setGrid("rows", v)} />
      <SegmentedRow
        label="Fit mode"
        hint="Fill: the grid fills the height. Scroll: 120 px rows and the page scrolls"
        options={[
          { value: "fill", label: "Fill", title: "Fill the viewport" },
          { value: "scroll", label: "Scroll" },
        ]}
        value={profile.fit}
        onChange={(fit) => patch({ fit: fit as ProfileView["fit"] })}
      />
      <SpacingField
        label="Gap"
        hint="Space between zones, in px"
        value={profile.gap}
        placeholder={profileGap({ fit: profile.fit })}
        onChange={(gap) => patch({ gap })}
      />
      <SpacingField
        label="Padding"
        hint="Space around the grid, in px (empty: 0 for a fill kiosk page, 24 for scroll)"
        value={profile.padding}
        placeholder={profilePadding({ fit: profile.fit }, true)}
        onChange={(padding) => patch({ padding })}
      />
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

/** This profile: Theme / Style Inherit or Custom, Background Inherit / Custom / None. */
export function ProfileInherit({
  profile,
  dashboardTheme,
  dashboardBackground,
  onProfileTheme,
  onBackground,
  updateProfile,
}: {
  profile: ProfileView;
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
      <SegmentedRow
        label="Theme"
        options={INHERIT_CUSTOM}
        value={ownTheme ? "custom" : "inherit"}
        onChange={(mode) =>
          onProfileTheme(mode === "inherit" ? {} : { theme: { ...dashboardTheme.theme }, radius: dashboardTheme.radius })
        }
      />
      <SegmentedRow
        label="Style"
        options={INHERIT_CUSTOM}
        value={profile.style ? "custom" : "inherit"}
        onChange={(mode) =>
          updateProfile((p) => ({ ...p, style: mode === "inherit" ? undefined : (p.style ?? {}) }), "profile:style")
        }
      />
      <SegmentedRow
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
      <p className="text-[11px] leading-snug text-ui-5">
        Edit the custom theme and background under Appearance (This profile), the style under Global style.
      </p>
    </div>
  );
}

/** Auto-pick: show the profile closest to the window size (else this one stays pinned). */
export function AutoPick({ auto, onAuto }: { auto: boolean; onAuto: (auto: boolean) => void }) {
  return (
    <ToggleRow label="Auto-pick profile" hint="Picks the profile closest to the window size" value={auto} onChange={onAuto} />
  );
}
