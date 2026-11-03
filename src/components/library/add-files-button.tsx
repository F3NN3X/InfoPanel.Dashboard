import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import { ITEM, POPUP } from "@/components/studio/menu-styles";
import { openImportDoor, openNewInfoPanel } from "@/components/studio/file-doors";

const SEGMENT =
  "flex h-(--ui-h-field) items-center bg-ui-inverse text-caption font-medium text-ui-inverse-fg hover:opacity-90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ui-accent";

/** The Library header's one primary: Add files…, with a menu for the other ways in (a new InfoPanel profile). */
export function AddFilesButton() {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-ui-md">
      <button type="button" onClick={() => openImportDoor()} className={`${SEGMENT} gap-1.5 px-3`}>
        Add files…
      </button>
      <Menu.Root>
        <Menu.Trigger aria-label="More ways to add" className={`${SEGMENT} w-7 justify-center border-l border-ui-inverse-fg/20`}>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-[80]" sideOffset={4} align="end">
            <Menu.Popup className={POPUP}>
              <Menu.Item className={ITEM} onClick={() => openNewInfoPanel()}>
                New InfoPanel profile…
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
