import { SegmentedRow } from "./setting-rows";

/** Which global style (or background) a card edits. */
export type AppearanceTarget = "all" | "profile";

/** A profile's force switch: the dashboard's, or its own on / off. */
type EnforceChoice = "inherit" | "on" | "off";

export const SCOPES = [
  { value: "all" as const, label: "All profiles" },
  { value: "profile" as const, label: "This profile" },
];

const ENFORCE_CHOICES = [
  { value: "inherit" as const, label: "Inherit", title: "Use the dashboard's choice (off unless it is forced)" },
  { value: "on" as const, label: "On", title: "Force the global style in this profile" },
  { value: "off" as const, label: "Off", title: "Don't force it in this profile" },
];

const enforceChoice = (v: boolean | undefined): EnforceChoice => (v === undefined ? "inherit" : v ? "on" : "off");

interface GlobalStyleScopeProps {
  target: AppearanceTarget;
  onTarget: (target: AppearanceTarget) => void;
  dashboardEnforce: boolean | undefined;
  profileEnforce: boolean | undefined;
  /** Set the force switch (a profile's `undefined` = the dashboard's). */
  onEnforce: (target: AppearanceTarget, value: boolean | undefined) => void;
  /** What still hides this scope's global style: widgets with their own look, profile styles. */
  overrides: { widgets: number; profiles: number };
  /** Make the overriding widgets follow the global style. */
  onFollowAll: () => void;
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
  dashboardEnforce,
  profileEnforce,
  onEnforce,
  overrides,
  onFollowAll,
}: GlobalStyleScopeProps) {
  const all = target === "all";
  return (
    <div className="space-y-3">
      <SegmentedRow label="Apply to" options={SCOPES} value={target} onChange={(v) => onTarget(v as AppearanceTarget)} />
      <SegmentedRow
        label={FORCE_LABEL}
        hint={FORCE_HINT}
        options={ENFORCE_CHOICES}
        value={enforceChoice(all ? dashboardEnforce : profileEnforce)}
        onChange={(c) => onEnforce(target, c === "inherit" ? undefined : c === "on")}
      />
      <FollowAllRow overrides={overrides} onFollowAll={onFollowAll} />
    </div>
  );
}

/** "Make all widgets follow": drops the looks that hide the global style (they stay stored). */
function FollowAllRow({ overrides, onFollowAll }: Pick<GlobalStyleScopeProps, "overrides" | "onFollowAll">) {
  const { widgets, profiles } = overrides;
  const hidden = [
    widgets > 0 && `${widgets} widget${widgets === 1 ? "" : "s"}`,
    profiles > 0 && `${profiles} profile${profiles === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-ui-1">Make all widgets follow</div>
        <div className="text-[11px] leading-snug text-ui-4">
          {hidden.length > 0 ? `${hidden.join(" and ")} keep their own look` : "Every widget already follows"}
        </div>
      </div>
      <button
        type="button"
        onClick={onFollowAll}
        disabled={hidden.length === 0}
        className="h-7 shrink-0 rounded-md border border-ui-strong bg-ui-raised px-2.5 text-[12px] text-ui-2 hover:text-ui-1 disabled:opacity-40"
      >
        Follow
      </button>
    </div>
  );
}
