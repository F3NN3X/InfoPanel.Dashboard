import { Pause, Play, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { ControlState } from "@/lib/control";

interface RotateToggleProps {
  /** The profile's entry in the control state; undefined while offline. */
  entry: ControlState["profiles"][string] | undefined;
  /** The profile's saved `rotate.enabled`. */
  saved: boolean;
  onToggle: () => void;
  /** Drop the runtime override ("Back to the saved setting"). */
  onSaved: () => void;
}

/** The toggle's tooltip: the state, and with a runtime override the saved setting too. */
export function rotateTooltip(rotating: boolean, override: "on" | "off" | null, saved: boolean): string {
  const now = rotating ? "Rotating on the kiosk" : "Auto-rotate paused";
  return override ? `${now} · saved: ${saved ? "on" : "off"}` : now;
}

/**
 * Auto-rotate for the profile's kiosk pages: Play / Pause (on = rotating).
 * A click toggles it at runtime (not config, not undoable); with an override
 * in place a second button returns to the saved setting.
 */
export function RotateToggle({ entry, saved, onToggle, onSaved }: RotateToggleProps) {
  const rotating = entry?.rotating ?? saved;
  const override = entry?.override ?? null;
  const label = rotateTooltip(rotating, override, saved);
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconButton label={label} className="h-7 w-7" active={rotating} aria-pressed={rotating} onClick={onToggle}>
        {rotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </IconButton>
      {override && (
        <IconButton label="Back to the saved setting" className="h-7 w-7" onClick={onSaved}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconButton>
      )}
    </div>
  );
}
