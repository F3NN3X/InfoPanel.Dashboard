// audiocn's `badge` registry dependency (shadcn's Badge), for `ChannelStripStatus`: a copy of the app's own
// (src/components/ui/badge.tsx), so the lazy mixer chunk doesn't pull the app's badge into a chunk of its own on the
// kiosk's first load (the kiosk request budget).
import type * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" &&
          "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" &&
          "border-transparent bg-secondary text-secondary-foreground",
        variant === "destructive" &&
          "border-transparent bg-destructive text-destructive-foreground",
        variant === "outline" && "text-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
