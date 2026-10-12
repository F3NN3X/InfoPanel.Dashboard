import { useState } from "react";
import { LayoutDashboard, X } from "lucide-react";
import { TIPS, dismissTips, tipsDismissed } from "./quick-tips";

interface EmptyLayoutCardProps {
  /** Open the Add drawer. */
  onBrowse: () => void;
  /** Load the shipped sample layout into this profile. */
  onUseSample: () => void;
}

/** The card over a canvas whose profile has no zones. */
export function EmptyLayoutCard({ onBrowse, onUseSample }: EmptyLayoutCardProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="pointer-events-auto flex w-72 flex-col items-center gap-3 rounded-xl border border-ui-menu bg-ui-raised px-6 py-6 text-center font-ui shadow-ui-float">
        <LayoutDashboard className="h-7 w-7 text-ui-4" strokeWidth={1.5} />
        <div className="text-[14px] font-semibold text-ui-1">This layout is empty</div>
        <p className="text-[12px] leading-relaxed text-ui-3">
          Draw a zone on the grid, or drag a widget from Add.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBrowse}
            className="h-8 rounded-lg bg-ui-accent px-3 text-[12px] font-semibold text-ui-inverse-fg transition-opacity hover:opacity-90"
          >
            Browse widgets
          </button>
          <button
            type="button"
            onClick={onUseSample}
            className="h-8 rounded-lg border border-ui-strong px-3 text-[12px] font-medium text-ui-2 transition-colors hover:bg-ui-hover hover:text-ui-1"
          >
            Use sample layout
          </button>
        </div>
      </div>
    </div>
  );
}

/** The first-run tips card (bottom-left, 64 px up, 250 wide); dismissing it is remembered. */
export function QuickTipsCard() {
  const [open, setOpen] = useState(() => !tipsDismissed());
  if (!open) return null;
  return (
    <div className="absolute bottom-16 left-4 z-20 w-[250px] rounded-xl border border-ui-menu bg-ui-raised p-3 font-ui shadow-ui-float">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ui-1">Quick tips</span>
        <button
          type="button"
          title="Dismiss"
          onClick={() => {
            dismissTips();
            setOpen(false);
          }}
          className="flex h-5 w-5 items-center justify-center rounded-md text-ui-4 transition-colors hover:bg-ui-hover hover:text-ui-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {TIPS.map((tip) => (
          <li key={tip.title} className="text-[11.5px] leading-snug text-ui-3">
            <span className="font-medium text-ui-2">{tip.title}.</span> {tip.body}
          </li>
        ))}
      </ul>
    </div>
  );
}
