import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Required accessible name; also the tooltip. */
  label: string;
  size?: 28 | 32;
  /** Turns red on hover (delete). */
  danger?: boolean;
  /** Pressed / selected look. */
  active?: boolean;
  children: ReactNode;
}

/** Square icon-only button (28 or 32 px). */
export function IconButton({
  label,
  size = 28,
  danger,
  active,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-ui-3 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60 disabled:opacity-40",
        size === 28 ? "h-7 w-7" : "h-8 w-8",
        active ? "bg-ui-active text-ui-1" : "hover:bg-ui-hover hover:text-ui-1",
        danger && "hover:bg-ui-danger/15 hover:text-ui-danger",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
