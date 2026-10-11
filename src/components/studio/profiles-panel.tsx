import type { ReactNode } from "react";
import { Minus, Pin, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { MonitorProfile } from "@/lib/layout";
import { cn } from "@/lib/utils";

interface ProfilesPanelProps {
  profiles: MonitorProfile[];
  /** The config's activeProfile: a pinned id, or "auto". */
  activeProfile: string;
  /** The profile being edited (pinned, or what "auto" resolves to). */
  profile: MonitorProfile;
  /** The profile "auto" resolves to for the current window size. */
  autoProfileId: string;
  /** Pin a profile id, or "auto" to match the window size. */
  onActivate: (id: string) => void;
  onAddProfile: () => void;
  onRemoveProfile: () => void;
  /** Patch the active profile's own fields (name, size, fit). */
  onProfileChange: (patch: Partial<MonitorProfile>) => void;
  onCols: (delta: number) => void;
  onRows: (delta: number) => void;
}

const LABEL = "text-xs font-medium uppercase tracking-wider text-muted-foreground";
const INPUT = "w-full rounded-md border bg-background px-2 py-1 text-xs text-foreground";

/** Stepper for the grid's column / row count. */
function CountStepper({
  label,
  value,
  fewer,
  more,
  onStep,
}: {
  label: string;
  value: number;
  fewer: string;
  more: string;
  onStep: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="w-8">{label}</span>
      <button
        onClick={() => onStep(-1)}
        className="rounded-md border p-1 hover:bg-accent"
        title={fewer}
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-6 text-center tabular-nums">{value}</span>
      <button
        onClick={() => onStep(1)}
        className="rounded-md border p-1 hover:bg-accent"
        title={more}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

/** One selectable entry of the profile list. */
function ProfileEntry({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border px-2 py-1.5 text-left text-xs",
        active ? "border-ring bg-accent" : "border-border hover:border-ring/50"
      )}
    >
      {children}
    </button>
  );
}

/** The active profile's name, design size, grid and fit. */
function ProfileSettings({
  profile,
  onProfileChange,
  onCols,
  onRows,
}: Pick<ProfilesPanelProps, "profile" | "onProfileChange" | "onCols" | "onRows">) {
  return (
    <section className="space-y-2 border-t p-3">
      <div className={LABEL}>Active profile</div>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Name
        <input
          value={profile.name}
          onChange={(e) => onProfileChange({ name: e.target.value })}
          className={INPUT}
        />
      </label>
      <div className="flex gap-2">
        <label className="flex-1 space-y-1 text-xs text-muted-foreground">
          W
          <input
            type="number"
            value={profile.width}
            onChange={(e) => onProfileChange({ width: parseInt(e.target.value, 10) || 0 })}
            className={INPUT}
          />
        </label>
        <label className="flex-1 space-y-1 text-xs text-muted-foreground">
          H
          <input
            type="number"
            value={profile.height}
            onChange={(e) => onProfileChange({ height: parseInt(e.target.value, 10) || 0 })}
            className={INPUT}
          />
        </label>
      </div>
      <CountStepper label="Cols" value={profile.cols} fewer="Fewer columns" more="More columns" onStep={onCols} />
      <CountStepper label="Rows" value={profile.rows} fewer="Fewer rows" more="More rows" onStep={onRows} />
      <Segmented
        options={[
          { value: "scroll", label: "Scroll" },
          { value: "fill", label: "Fill viewport" },
        ]}
        value={profile.fit}
        onChange={(fit) => onProfileChange({ fit })}
      />
    </section>
  );
}

/**
 * The Profiles drawer: pick a profile (or Auto), add / delete, and edit
 * the active profile's size and grid.
 */
export function ProfilesPanel(props: ProfilesPanelProps) {
  const { profiles, activeProfile, profile, autoProfileId, onActivate, onAddProfile, onRemoveProfile } =
    props;
  const auto = activeProfile === "auto";
  const autoName = profiles.find((p) => p.id === autoProfileId)?.name ?? "—";
  return (
    <>
      <section className="space-y-2 p-3">
        <div className="space-y-1">
          <ProfileEntry active={auto} onClick={() => onActivate("auto")}>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Wand2 className="h-3 w-3" /> Auto (match window)
            </div>
            <div className="truncate text-muted-foreground">
              {auto ? "Showing" : "Would show"} {autoName}
            </div>
          </ProfileEntry>
          {profiles.map((p) => (
            <ProfileEntry key={p.id} active={!auto && p.id === profile.id} onClick={() => onActivate(p.id)}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{p.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                  {p.id === autoProfileId && "auto"}
                  {!auto && p.id === profile.id && <Pin className="h-3 w-3" aria-label="Pinned" />}
                </span>
              </div>
              <div className="text-muted-foreground">
                {p.width}×{p.height} · {p.cols}×{p.rows}
                {p.fit === "fill" ? " · fill" : ""}
              </div>
            </ProfileEntry>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={onAddProfile}>
            <Plus className="h-3 w-3" /> New
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-9 text-xs hover:text-destructive"
            onClick={onRemoveProfile}
            disabled={profiles.length <= 1}
            title="Delete active profile"
            aria-label="Delete active profile"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Click a profile to pin it; Auto picks the profile closest to the window size.
        </p>
      </section>
      <ProfileSettings {...props} />
    </>
  );
}
