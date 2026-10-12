import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, MoreHorizontal, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import type { MonitorProfile } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { copyProfileJson } from "./config-file";

interface ProfilesPanelProps {
  profiles: MonitorProfile[];
  /** The config's activeProfile: a pinned id, or "auto". */
  activeProfile: string;
  /** The profile being edited (pinned, or what "auto" resolves to). */
  profile: MonitorProfile;
  /** The profile "auto" resolves to for the current window size. */
  autoProfileId: string;
  /** Switch to a profile id, or "auto" to match the window size. */
  onActivate: (id: string) => void;
  onAddProfile: () => void;
  /** Delete the active profile. */
  onRemoveProfile: () => void;
  /** Patch the active profile's own fields (name). */
  onProfileChange: (patch: Partial<MonitorProfile>) => void;
  /** Open Dashboard › Profile (size, grid, spacing, theme, style, background). */
  onOpenSettings: () => void;
}

const MENU_POPUP =
  "min-w-44 rounded-[9px] border border-ui-menu bg-ui-raised p-1 font-ui text-[12.5px] text-ui-2 shadow-ui-menu outline-none";
const MENU_ITEM =
  "flex h-[30px] cursor-default items-center gap-2 rounded-md px-2 outline-none select-none data-highlighted:bg-ui-hover";

const THUMB_W = 34;

/** The meta line of a row: `1920×550 · 12×6 · Fill`. */
export function profileMeta(p: MonitorProfile): string {
  return `${p.width}×${p.height} · ${p.cols}×${p.rows} · ${p.fit === "fill" ? "Fill" : "Scroll"}`;
}

/** A 34-wide outline in the profile's aspect ratio (height clamped to a sane band). */
function Thumb({ profile, active }: { profile: MonitorProfile; active: boolean }) {
  const ratio = profile.width > 0 && profile.height > 0 ? profile.height / profile.width : 9 / 16;
  const height = Math.round(Math.min(Math.max(THUMB_W * ratio, 10), 44));
  return (
    <span className="flex w-[34px] shrink-0 items-center justify-center">
      <span
        className={cn("block w-full rounded-[3px] border bg-ui-app", active ? "border-ui-accent" : "border-ui-strong")}
        style={{ height }}
      />
    </span>
  );
}

/** The row's rarely used actions. */
function RowMenu({
  profile,
  canDelete,
  onRename,
  onSettings,
  onDelete,
}: {
  profile: MonitorProfile;
  /** Only the active profile can be deleted (and never the last one). */
  canDelete: boolean;
  onRename: () => void;
  onSettings: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  return (
    <Menu.Root>
      <Menu.Trigger
        onClick={(e) => e.stopPropagation()}
        title="Profile actions"
        aria-label="Profile actions"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ui-4 hover:bg-ui-active hover:text-ui-1 data-popup-open:bg-ui-active data-popup-open:text-ui-1"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-[80]" sideOffset={4} align="end">
          <Menu.Popup className={MENU_POPUP} onClick={(e) => e.stopPropagation()}>
            <Menu.Item className={MENU_ITEM} onClick={onRename}>
              Rename…
            </Menu.Item>
            <Menu.Item className={MENU_ITEM} onClick={onSettings}>
              Size, grid and spacing…
            </Menu.Item>
            <Menu.Item
              className={MENU_ITEM}
              onClick={() =>
                copyProfileJson(profile)
                  .then(() => toast("Copied to clipboard"))
                  .catch(() => {})
              }
            >
              Copy profile JSON
            </Menu.Item>
            {canDelete && (
              <Menu.Item className={cn(MENU_ITEM, "text-ui-danger")} onClick={onDelete}>
                Delete profile
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** The inline name input of the profile being renamed. */
function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [name, setName] = useState(initial);
  const commit = () => onDone(name.trim() || null);
  return (
    <input
      autoFocus
      value={name}
      onChange={(e) => setName(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone(null);
      }}
      onBlur={commit}
      aria-label="Profile name"
      className="w-full rounded border border-ui-strong bg-ui-app px-1.5 py-0.5 text-[12.5px] text-ui-1 outline-none focus:border-ui-accent"
    />
  );
}

/**
 * The Profiles panel: pick a profile, add one, rename / delete / jump to its
 * settings from a row's "⋯", and switch Auto-pick.
 */
export function ProfilesPanel({
  profiles,
  activeProfile,
  profile,
  autoProfileId,
  onActivate,
  onAddProfile,
  onRemoveProfile,
  onProfileChange,
  onOpenSettings,
}: ProfilesPanelProps) {
  const toast = useToast();
  const [renaming, setRenaming] = useState(false);
  const auto = activeProfile === "auto";
  const autoName = profiles.find((p) => p.id === autoProfileId)?.name ?? "—";
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-ui-subtle py-2.5 pl-3 pr-2.5">
        <span className="flex-1 text-[13px] font-semibold text-ui-1">Profiles</span>
        <IconButton
          label="New profile"
          className="h-[26px] w-[26px]"
          onClick={() => {
            onAddProfile();
            toast("Profile created");
          }}
        >
          <Plus className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
        {profiles.map((p) => {
          const active = p.id === profile.id;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => onActivate(p.id)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onActivate(p.id);
                }
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-[7px] py-1.5 pl-2 pr-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60",
                active ? "bg-ui-accent-soft" : "hover:bg-ui-hover"
              )}
            >
              <Thumb profile={p} active={active} />
              <span className="min-w-0 flex-1">
                {active && renaming ? (
                  <RenameInput
                    initial={p.name}
                    onDone={(name) => {
                      setRenaming(false);
                      if (name && name !== p.name) onProfileChange({ name });
                    }}
                  />
                ) : (
                  <span className="block truncate text-[12.5px] text-ui-1">{p.name}</span>
                )}
                <span className="block truncate font-ui-mono text-[10.5px] text-ui-5">{profileMeta(p)}</span>
              </span>
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-ui-accent-text" aria-label="Active" />}
              <RowMenu
                profile={p}
                canDelete={active && profiles.length > 1}
                onRename={() => {
                  if (!active) onActivate(p.id);
                  setRenaming(true);
                }}
                onSettings={() => {
                  if (!active) onActivate(p.id);
                  onOpenSettings();
                }}
                onDelete={onRemoveProfile}
              />
            </div>
          );
        })}
      </div>
      <div className="shrink-0 space-y-2 border-t border-ui-subtle px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex-1 text-[12.5px] text-ui-2">Auto-pick by window size</span>
          <Toggle
            checked={auto}
            label="Auto-pick by window size"
            onChange={(on) => onActivate(on ? "auto" : profile.id)}
          />
        </div>
        <p className="text-[10.5px] leading-snug text-ui-5">
          {auto ? "Showing" : "Would show"} {autoName}. Each profile has its own size, grid, zones, theme, style and
          background.
        </p>
      </div>
    </>
  );
}
