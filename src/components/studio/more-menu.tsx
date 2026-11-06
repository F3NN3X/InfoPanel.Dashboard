import { Menu } from "@base-ui/react/menu";
import { FileInput, FileOutput, MoreHorizontal, Radio, Redo2, Save, Undo2 } from "lucide-react";
import type { StudioTopBarProps } from "./studio-top-bar";

const POPUP =
  "min-w-52 rounded-ui-menu border border-ui-menu bg-ui-raised p-1 font-ui text-body text-ui-2 shadow-ui-menu outline-none";
const ITEM =
  "flex h-8 cursor-default items-center gap-2 rounded-ui-sm px-2 outline-none select-none data-disabled:text-ui-hint data-highlighted:bg-ui-active data-highlighted:text-ui-1";
const SEPARATOR = "mx-1 my-1 h-px bg-ui-subtle";

/** "⋯", on a phone only (the bar has no room there for Undo / Redo and the file actions). */
export default function MoreMenu({
  onExport,
  onImport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onLiveOpenChange,
  onSave,
}: Pick<StudioTopBarProps, "onExport" | "onImport" | "canUndo" | "canRedo" | "onUndo" | "onRedo" | "onLiveOpenChange" | "onSave">) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="More actions"
        title="More actions"
        className="flex h-8 w-8 items-center justify-center rounded-ui-md text-ui-3 transition-colors hover:bg-ui-hover hover:text-ui-1 data-popup-open:bg-ui-hover data-popup-open:text-ui-1"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-[80]" sideOffset={4} align="end">
          <Menu.Popup className={POPUP}>
            <Menu.Item className={ITEM} disabled={!canUndo} onClick={onUndo}>
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Menu.Item>
            <Menu.Item className={ITEM} disabled={!canRedo} onClick={onRedo}>
              <Redo2 className="h-3.5 w-3.5" /> Redo
            </Menu.Item>
            <Menu.Item className={ITEM} onClick={onSave}>
              <Save className="h-3.5 w-3.5" /> Save now
            </Menu.Item>
            <Menu.Separator className={SEPARATOR} />
            <Menu.Item className={ITEM} onClick={() => onLiveOpenChange(true)}>
              <Radio className="h-3.5 w-3.5" /> Live control…
            </Menu.Item>
            <Menu.Item className={ITEM} onClick={onImport}>
              <FileInput className="h-3.5 w-3.5" /> Import…
            </Menu.Item>
            <Menu.Item className={ITEM} onClick={onExport}>
              <FileOutput className="h-3.5 w-3.5" /> Export &amp; back up…
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
