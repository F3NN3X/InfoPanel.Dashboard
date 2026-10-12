import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { BACKGROUND_DEFAULTS, type BackgroundType, type PageBackground } from "@/lib/appearance";
import { BackgroundEditor } from "./background-editor";

/** Which background the tab edits. */
export type BackgroundTarget = "all" | "profile";

/** A profile's own background: none set, its own, or explicitly none. */
type ProfileMode = "inherit" | "custom" | "none";

const SCOPES = [
  { value: "all" as const, label: "All profiles" },
  { value: "profile" as const, label: "This profile" },
];

const MODES = [
  { value: "inherit" as const, label: "Inherit", title: "Use the dashboard background" },
  { value: "custom" as const, label: "Custom", title: "A background for this profile only" },
  { value: "none" as const, label: "None", title: "No background on this profile" },
];

const ALL_TYPES: BackgroundType[] = ["none", "color", "gradient", "image", "video"];
const OWN_TYPES: BackgroundType[] = ["color", "gradient", "image", "video"];

const TYPE_NAMES: Record<BackgroundType, string> = {
  none: "none",
  color: "a color",
  gradient: "a gradient",
  image: "an image",
  video: "a video",
};

interface BackgroundPanelProps {
  /** The dashboard background (every profile without its own). */
  dashboard: PageBackground | undefined;
  /** The active profile's own background. */
  profileBackground: PageBackground | undefined;
  profileName: string;
  /** Set (or clear) the background of a target. */
  onChange: (target: BackgroundTarget, bg: PageBackground | undefined) => void;
}

function profileMode(bg: PageBackground | undefined): ProfileMode {
  if (!bg) return "inherit";
  return bg.type === "none" ? "none" : "custom";
}

/**
 * The page background: the dashboard's ("All profiles") or the active
 * profile's own ("This profile": inherit the dashboard's, a custom one,
 * or none).
 */
export function BackgroundPanel({ dashboard, profileBackground, profileName, onChange }: BackgroundPanelProps) {
  const [target, setTarget] = useState<BackgroundTarget>(profileBackground ? "profile" : "all");
  const mode = profileMode(profileBackground);
  const dashboardBg = dashboard ?? { type: "none" };

  const setMode = (next: ProfileMode) => {
    if (next === mode) return;
    if (next === "inherit") onChange("profile", undefined);
    else if (next === "none") onChange("profile", { type: "none" });
    // Custom starts from the dashboard's background, or a plain color.
    else
      onChange(
        "profile",
        dashboard && dashboard.type !== "none" ? dashboard : { type: "color", color: BACKGROUND_DEFAULTS.color }
      );
  };

  return (
    <div className="space-y-3">
      <Segmented options={SCOPES} value={target} onChange={setTarget} className="w-full *:flex-1" />

      {target === "all" ? (
        <>
          <p className="text-[11px] text-muted-foreground/70">
            Behind the grid of every profile that has no background of its own.
          </p>
          <BackgroundEditor value={dashboardBg} types={ALL_TYPES} onChange={(bg) => onChange("all", bg)} />
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground/70">
            Only for <span className="text-foreground/85">{profileName}</span>.
          </p>
          <Segmented options={MODES} value={mode} onChange={setMode} className="w-full *:flex-1" />
          {mode === "inherit" && (
            <p className="text-xs text-muted-foreground">
              Uses the dashboard background ({TYPE_NAMES[dashboardBg.type]}).{" "}
              <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={() => setTarget("all")}>
                Edit it
              </button>
            </p>
          )}
          {mode === "none" && (
            <p className="text-xs text-muted-foreground">
              No background on this profile; the theme&apos;s background color shows.
            </p>
          )}
          {mode === "custom" && profileBackground && (
            <BackgroundEditor value={profileBackground} types={OWN_TYPES} onChange={(bg) => onChange("profile", bg)} />
          )}
        </>
      )}
    </div>
  );
}
