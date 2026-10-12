import { SegmentedRow, ToggleRow } from "./setting-rows";

/** Which global style (or background) a card edits. */
export type AppearanceTarget = "all" | "profile";

/** A profile's force switch: the dashboard's, or its own on / off. */
type EnforceChoice = "inherit" | "on" | "off";

export const SCOPES = [
  { value: "all" as const, label: "All profiles" },
  { value: "profile" as const, label: "This profile" },
];

const ENFORCE_CHOICES = [
  { value: "inherit" as const, label: "Inherit", title: "Use the dashboard's choice" },
  { value: "on" as const, label: "On", title: "Force the global style in this profile" },
  { value: "off" as const, label: "Off", title: "Don't force it in this profile" },
];

const enforceChoice = (v: boolean | undefined): EnforceChoice => (v === undefined ? "inherit" : v ? "on" : "off");

interface GlobalStyleScopeProps {
  target: AppearanceTarget;
  onTarget: (target: AppearanceTarget) => void;
  profileName: string;
  dashboardEnforce: boolean | undefined;
  profileEnforce: boolean | undefined;
  /** Set the force switch (a profile's `undefined` = the dashboard's). */
  onEnforce: (target: AppearanceTarget, value: boolean | undefined) => void;
}

const FORCE_LABEL = "Force global style";
const FORCE_HINT = "Every widget shows the global style; their own look values are ignored";

/**
 * Appearance › Scope: which style the presets, theme, background and
 * Global style tab edit (all profiles, or this one over the dashboard's)
 * and its "Force global style" switch. A widget's own look overrides the
 * style unless the widget follows it or the style is forced.
 */
export function GlobalStyleScope({
  target,
  onTarget,
  profileName,
  dashboardEnforce,
  profileEnforce,
  onEnforce,
}: GlobalStyleScopeProps) {
  const all = target === "all";
  return (
    <div className="space-y-3">
      <SegmentedRow label="Apply to" options={SCOPES} value={target} onChange={(v) => onTarget(v as AppearanceTarget)} />
      <p className="text-[11px] leading-snug text-ui-4">
        {all ? (
          <>Defaults for every widget in every profile.</>
        ) : (
          <>
            Defaults for every widget in <span className="text-ui-2">{profileName}</span>, over the dashboard&apos;s.
          </>
        )}{" "}
        A widget&apos;s own setting overrides them unless it follows the global style.
      </p>
      {all ? (
        <ToggleRow
          label={FORCE_LABEL}
          hint={FORCE_HINT}
          value={dashboardEnforce === true}
          onChange={(v) => onEnforce("all", v)}
        />
      ) : (
        <SegmentedRow
          label={FORCE_LABEL}
          hint={FORCE_HINT}
          options={ENFORCE_CHOICES}
          value={enforceChoice(profileEnforce)}
          onChange={(c) => onEnforce("profile", c === "inherit" ? undefined : c === "on")}
        />
      )}
    </div>
  );
}
