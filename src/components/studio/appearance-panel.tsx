import { Segmented } from "@/components/ui/segmented";
import type { ModuleSetting } from "@/modules/types";
import { SettingRow } from "./setting-control";

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

const ENFORCE: ModuleSetting = {
  key: "styleEnforce",
  label: "Force global style on every widget",
  type: "boolean",
  default: false,
};

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

/**
 * The top of the global style: which style the cards below edit (all
 * profiles, or this one over the dashboard's) and its "Force global style"
 * switch. A widget's own look overrides the style unless the widget follows
 * it or the style is forced.
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
    <div className="space-y-2">
      <Segmented options={SCOPES} value={target} onChange={onTarget} className="w-full *:flex-1" />
      <p className="text-[11px] leading-snug text-muted-foreground/70">
        {all ? (
          <>Defaults for every widget in every profile.</>
        ) : (
          <>
            Defaults for every widget in <span className="text-foreground/85">{profileName}</span>, over the
            dashboard&apos;s.
          </>
        )}{" "}
        A widget&apos;s own setting overrides them unless it follows the global style.
      </p>
      {all ? (
        <SettingRow
          def={ENFORCE}
          value={dashboardEnforce === true}
          onChange={(v) => onEnforce("all", v === true)}
          sources={null}
        />
      ) : (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{ENFORCE.label}</div>
          <Segmented
            options={ENFORCE_CHOICES}
            value={enforceChoice(profileEnforce)}
            onChange={(c) => onEnforce("profile", c === "inherit" ? undefined : c === "on")}
            className="w-full *:flex-1"
          />
        </div>
      )}
    </div>
  );
}
