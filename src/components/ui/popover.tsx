import type { ReactNode } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

interface PopoverProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  /** Accessible name of the trigger when it is icon-only. */
  triggerLabel?: string;
  triggerClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  children: ReactNode;
}

/** A click-to-open floating panel on the chrome tokens. */
export function Popover({
  trigger,
  triggerLabel,
  triggerClassName,
  side = "bottom",
  align = "start",
  className,
  children,
}: PopoverProps) {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger aria-label={triggerLabel} className={triggerClassName}>
        {trigger}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner side={side} align={align} sideOffset={6} className="z-[80]">
          <BasePopover.Popup
            className={cn(
              "rounded-[9px] border border-ui-menu bg-ui-raised p-2 font-ui text-[12.5px] text-ui-2 shadow-ui-menu outline-none",
              className
            )}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
