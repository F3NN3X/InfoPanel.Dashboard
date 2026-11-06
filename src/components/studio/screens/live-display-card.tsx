import { Moon, PanelTop, RefreshCw, RotateCw, Settings2, Sun, Monitor, X } from "lucide-react";
import { DISPLAY_FOLLOW, postControl, type ControlState } from "@/lib/control";
import type { MonitorProfile } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { liveActions } from "../live-model";
import { CardMenu, type CardAction } from "./card-actions";
import { displaySubtitle, displayTitle, rotationButton, type LiveDisplay } from "./display-model";
import { aspectOf, previewBox } from "./profile-card";
import { ScreenThumb } from "./screen-thumb";

/** The two selects of a card's switcher share one bordered box: `Perf heavy / Main`. */
const SELECT = cn("h-8 min-w-0 cursor-pointer bg-transparent px-2 text-body text-ui-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-accent");

/** A dim level the card's menu switches to; the Live popover's slider takes any step. */
const DIM_LEVEL = 0.5;

interface LiveDisplayCardProps {
  live: LiveDisplay;
  profiles: readonly MonitorProfile[];
  control: ControlState | null;
  now: number;
  /** Open the screen's settings on its Rotation group. */
  onRotationSettings: (screenId: string) => void;
}

/**
 * One connected kiosk (Q9): a preview of the screen it shows, a switcher, the screen's rotation and a menu. The page
 * and the rotation belong to the screen, so they act on every display showing it; the screen can be switched here
 * only for a named display, which is the one the server lets the studio assign.
 */
export function LiveDisplayCard({ live, profiles, control, now, onRotationSettings }: LiveDisplayCardProps) {
  const { kiosk, display, screen } = live;
  const title = displayTitle(live);
  const entry = screen ? control?.profiles[screen.id] : undefined;
  const rotation = screen ? rotationButton(screen, entry) : undefined;
  const dimmed = (entry?.dim ?? 0) > 0;
  const island = entry?.island ?? screen?.island?.enabled === true;
  const page = screen ? (screen.pages.find((p) => p.id === (kiosk.page ?? entry?.page))?.id ?? screen.pages[0]?.id) : undefined;

  const previewPage = screen?.pages.find((p) => p.id === page);
  // The server shows a link's pin before the screen chosen here: the choice and what it shows then differ.
  const pinnedTo = display && display.screen !== DISPLAY_FOLLOW && display.shows && display.shows !== display.screen ? profiles.find((p) => p.id === display.shows) : undefined;

  const actions: CardAction[] = [
    ...(screen ? [{ id: "rotation", label: `${screen.name} rotation settings…`, icon: Settings2, run: () => onRotationSettings(screen.id) }] : []),
    ...(screen
      ? [
          { id: "dim", label: dimmed ? `Stop dimming ${screen.name}` : `Dim ${screen.name}`, icon: dimmed ? Sun : Moon, run: () => void liveActions.setDim(screen.id, dimmed ? 0 : DIM_LEVEL) },
          {
            id: "island",
            label: island ? `Hide Dynamic Island on ${screen.name}` : `Show Dynamic Island on ${screen.name}`,
            icon: PanelTop,
            run: () => void liveActions.setIsland(screen.id, !island, screen.island?.enabled === true),
          },
          { id: "reload-screen", label: `Reload displays showing ${screen.name}`, icon: RefreshCw, run: () => void postControl("kiosk", { action: "reload", profile: screen.id }) },
        ]
      : []),
    { id: "reload-all", label: "Reload all kiosks", icon: RefreshCw, run: () => void liveActions.reload() },
    ...(display ? [{ id: "forget", label: "Forget display", icon: X, run: () => void postControl("display", { action: "forget", display: display.name }), danger: true }] : []),
  ];

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-ui-lg border border-ui-default bg-ui-panel">
      <div className="relative grid h-[150px] place-items-center border-b border-ui-subtle bg-ui-chrome p-3.5">
        <StatusChip tone="ok" className="absolute left-2.5 top-2.5 z-10 h-5 bg-ui-panel/80 text-micro">
          Live
        </StatusChip>
        {screen ? (
          <div title={`${screen.name}, page ${previewPage?.name ?? ""}`} className="overflow-hidden rounded-ui-sm border border-ui-strong bg-s-well" style={previewBox(aspectOf(screen.width, screen.height))}>
            <ScreenThumb profile={screen} pageId={page} still />
          </div>
        ) : (
          <Monitor className="h-8 w-8 text-ui-hint" strokeWidth={1.5} aria-hidden />
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Monitor className="h-4 w-4 shrink-0 text-ui-hint" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-body font-medium text-ui-1">{title}</div>
            <div className="truncate font-ui-mono text-micro text-ui-3">{displaySubtitle(live, now)}</div>
          </div>
          <CardMenu actions={actions} label={`Display actions, ${title}`} />
        </div>
        {screen ? (
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-ui-md border border-ui-control bg-ui-chrome">
              {display ? (
                <select
                  aria-label={`Screen for ${title}`}
                  title={pinnedTo ? `This display's link pins it to ${pinnedTo.name}; the choice applies once the link no longer pins.` : undefined}
                  value={display.screen}
                  onChange={(e) => void postControl("display", { action: "assign", display: display.name, screen: e.target.value })}
                  className={cn(SELECT, "max-w-[55%] flex-1")}
                >
                  <option value={DISPLAY_FOLLOW}>Follow default</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span title="This kiosk's link pins its screen. Open the link with a display name to switch screens from here." className="max-w-[55%] flex-1 truncate px-2 text-body text-ui-1">
                  {screen.name}
                </span>
              )}
              <span aria-hidden className="text-ui-hint">
                /
              </span>
              <select
                aria-label={`Page of ${screen.name}`}
                value={page ?? ""}
                onChange={(e) => void liveActions.showPage(screen.id, e.target.value)}
                className={cn(SELECT, "flex-1 text-ui-2")}
              >
                {screen.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {rotation && (
              <button
                type="button"
                title={rotation.title}
                aria-label={`Rotation for ${screen.name}: ${rotation.label}`}
                aria-pressed={rotation.toggles ? rotation.running : undefined}
                disabled={!rotation.toggles || control === null}
                onClick={() => void liveActions.setRotation(screen.id, !rotation.running, screen.rotate?.enabled === true)}
                className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-ui-md px-2 font-ui-mono text-caption text-ui-2 hover:bg-ui-raised hover:text-ui-1 disabled:pointer-events-none disabled:opacity-60", FOCUS_RING)}
              >
                <RotateCw className={cn("h-3.5 w-3.5", !rotation.running && "opacity-60")} strokeWidth={1.5} aria-hidden />
                {rotation.label}
              </button>
            )}
          </div>
        ) : (
          <p className="text-caption text-ui-3">This kiosk shows a screen that no longer exists</p>
        )}
      </div>
    </li>
  );
}
