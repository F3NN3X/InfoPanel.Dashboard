import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Info,
  Keyboard,
  Monitor,
  MoreHorizontal,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Undo2,
  Upload,
  Wand2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { BUILD_ID } from "@/lib/buildInfo";
import type { MonitorProfile } from "@/lib/layout";
import { copyProfileJson } from "./config-file";
import { ResetConfigDialog } from "./reset-config-dialog";
import { KEYS } from "./use-studio-shortcuts";

export type StudioMode = "design" | "sources";

interface StudioTopBarProps {
  profiles: MonitorProfile[];
  /** The config's activeProfile: a pinned id, or "auto". */
  activeProfile: string;
  /** The profile on the canvas (pinned, or what "auto" resolves to). */
  profile: MonitorProfile;
  /** Pin a profile id, or "auto" to match the window size. */
  onActivate: (id: string) => void;
  mode: StudioMode;
  onMode: (mode: StudioMode) => void;
  /** Briefly true after a save (shows "Saved"). */
  saved: boolean;
  onSave: () => void;
  onExitStudio: () => void;
  onExport: () => void;
  /** Open the file picker for "Import config…". */
  onImport: () => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPalette: () => void;
  onShortcuts: () => void;
}

const MODES = [
  { value: "design" as const, label: "Design" },
  { value: "sources" as const, label: "Sources", title: "Data sources: bind widgets to their data" },
];

const POPUP =
  "min-w-48 rounded-md border border-border bg-popover p-1 text-xs text-foreground shadow-lg outline-none";
const ITEM =
  "flex cursor-default items-center gap-2 rounded-[5px] px-2 py-1.5 outline-none select-none data-disabled:text-muted-foreground/60 data-highlighted:bg-accent";
const SEPARATOR = "mx-1 my-1 h-px bg-border";

/** Profile name + menu to switch profile (or Auto), like the Profiles drawer. */
function ProfileSwitcher({
  profiles,
  activeProfile,
  profile,
  onActivate,
}: Pick<StudioTopBarProps, "profiles" | "activeProfile" | "profile" | "onActivate">) {
  const auto = activeProfile === "auto";
  return (
    <Menu.Root>
      <Menu.Trigger
        title="Switch profile"
        className="flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm text-foreground transition-colors hover:bg-accent data-popup-open:bg-accent"
      >
        <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{profile.name}</span>
        {auto && <span className="shrink-0 text-[10px] text-muted-foreground">auto</span>}
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} align="start">
          <Menu.Popup className={POPUP}>
            <Menu.Item className={ITEM} onClick={() => onActivate("auto")}>
              <Wand2 className="h-3.5 w-3.5" />
              <span className="flex-1">Auto (match window)</span>
              {auto && <Check className="h-3.5 w-3.5" />}
            </Menu.Item>
            <Menu.Separator className={SEPARATOR} />
            {profiles.map((p) => (
              <Menu.Item key={p.id} className={ITEM} onClick={() => onActivate(p.id)}>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {p.width}×{p.height}
                </span>
                <span className="w-3.5">{!auto && p.id === profile.id && <Check className="h-3.5 w-3.5" />}</span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * "⋯": export / import / copy profile JSON / reset, the command palette
 * and shortcut cheat sheet, and the build id.
 */
function MoreMenu({
  profile,
  onExport,
  onImport,
  onReset,
  onPalette,
  onShortcuts,
}: Pick<
  StudioTopBarProps,
  "profile" | "onExport" | "onImport" | "onReset" | "onPalette" | "onShortcuts"
>) {
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const copyProfile = () => {
    copyProfileJson(profile)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {});
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label="More actions"
          title={copied ? "Profile JSON copied" : "More actions"}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <MoreHorizontal className="h-4 w-4" />}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-50" sideOffset={4} align="end">
            <Menu.Popup className={POPUP}>
              <Menu.Item className={ITEM} onClick={onExport}>
                <Download className="h-3.5 w-3.5" /> Export config
              </Menu.Item>
              <Menu.Item className={ITEM} onClick={onImport}>
                <Upload className="h-3.5 w-3.5" /> Import config…
              </Menu.Item>
              <Menu.Item className={ITEM} onClick={copyProfile}>
                <Copy className="h-3.5 w-3.5" /> Copy profile JSON
              </Menu.Item>
              <Menu.Separator className={SEPARATOR} />
              <Menu.Item className={ITEM} onClick={onPalette}>
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1">Command palette…</span>
                <span className="text-muted-foreground">{KEYS.palette}</span>
              </Menu.Item>
              <Menu.Item className={ITEM} onClick={onShortcuts}>
                <Keyboard className="h-3.5 w-3.5" />
                <span className="flex-1">Keyboard shortcuts</span>
                <span className="text-muted-foreground">{KEYS.cheatsheet}</span>
              </Menu.Item>
              <Menu.Separator className={SEPARATOR} />
              <Menu.Item className={`${ITEM} text-destructive`} onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset everything…
              </Menu.Item>
              <Menu.Separator className={SEPARATOR} />
              <Menu.Item className={ITEM} disabled>
                <Info className="h-3.5 w-3.5" />
                <span className="tabular-nums">build {BUILD_ID}</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <ResetConfigDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        onExport={onExport}
        onReset={onReset}
      />
    </>
  );
}

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

/**
 * The studio's top bar: profile switcher and size, Design | Sources, then
 * undo / redo, Save, Kiosk view and the "⋯" menu.
 */
export function StudioTopBar(props: StudioTopBarProps) {
  const { profile, mode, onMode, saved, onSave, onExitStudio, canUndo, canRedo, onUndo, onRedo } =
    props;
  return (
    <header className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b bg-popover/40 px-2">
      <div className="flex min-w-0 items-center gap-2">
        <ProfileSwitcher {...props} />
        <span className="shrink-0 truncate text-xs tabular-nums text-muted-foreground">
          {profile.width}×{profile.height} · {profile.cols}×{profile.rows} ·{" "}
          {profile.placements.length} zones
        </span>
      </div>

      <Segmented options={MODES} value={mode} onChange={onMode} />

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          aria-label="Undo"
          title={`Undo (${KEYS.undo})`}
          disabled={!canUndo}
          onClick={onUndo}
          className={ICON_BUTTON}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Redo"
          title={`Redo (${KEYS.redo})`}
          disabled={!canRedo}
          onClick={onRedo}
          className={ICON_BUTTON}
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onSave}
          title={`Save to the dashboard server and refresh the kiosk view (${KEYS.save})`}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Saved" : "Save"}
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onExitStudio}>
          <Wrench className="h-3.5 w-3.5" /> Kiosk view
        </Button>
        <MoreMenu {...props} />
      </div>
    </header>
  );
}
