// The one row the mixer family draws (StreamMixer, VolumeMixer): the name on the left, a level bar of the same track height in
// the middle, the value on the right. Only the bar differs (an LED ladder or a solid bar); the grid and the type are shared.
import type { ReactNode } from "react";

/** The level bar's track height, px, in every mixer. */
export const CHANNEL_TRACK = 8;

export interface ChannelRowProps {
  /** Before the name: a mute button or a state icon. */
  lead?: ReactNode;
  /** The lead's column width, px. */
  leadW?: number;
  name: ReactNode;
  /** Under the name, one micro line. */
  sub?: ReactNode;
  /** The name column's width, px; 0 hides the name column. */
  nameW?: number;
  /** The level bar (`ChannelBar`, or a fader). */
  bar: ReactNode;
  value: ReactNode;
  /** The value column's width, px. */
  valueW?: number;
  muted?: boolean;
  title?: string;
  className?: string;
  /** A tall row: 16px name and 20px value instead of 14 and 16. */
  big?: boolean;
  /** Pixels; the row's min height. */
  minHeight?: number;
}

export function ChannelRow({ lead, leadW = 18, name, sub, nameW = 96, bar, value, valueW = 40, muted, title, big, className = "", minHeight }: ChannelRowProps) {
  const cols = [lead ? `${leadW}px` : null, nameW ? `${nameW}px` : null, "minmax(0,1fr)", `${valueW}px`].filter(Boolean).join(" ");
  return (
    <li title={title} aria-label={typeof name === "string" && name ? name : title} className={`grid min-w-0 items-center gap-x-3 ${className}`} style={{ gridTemplateColumns: cols, minHeight }}>
      {lead}
      {nameW > 0 && (
        <div className="min-w-0">
          <div className={`truncate ${big ? "text-[16px]" : "text-[14px]"} font-semibold leading-tight ${muted ? "text-[color:var(--w-faint)]" : "text-[color:var(--w-fg)]"}`}>{name}</div>
          {sub && <div className="mt-0.5 truncate text-micro leading-tight text-[color:var(--w-faint)]" title={typeof sub === "string" ? sub : undefined}>{sub}</div>}
        </div>
      )}
      <div className="min-w-0">{bar}</div>
      <span className={`text-right ${big ? "text-[20px]" : "text-[16px]"} font-medium leading-none tabular-nums ${muted ? "text-[color:var(--w-faint)]" : "text-[color:var(--w-fg)]"}`}>{value}</span>
    </li>
  );
}

/** A solid level bar on the shared track height; `thumb` adds the round knob of a slider. */
export function ChannelBar({ value, color, thumb }: { value: number; color: string; thumb?: boolean }) {
  return (
    <div className="relative rounded-full bg-[color:var(--w-track)]" style={{ height: CHANNEL_TRACK }}>
      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      {thumb && <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--w-fg)] shadow" style={{ left: `${Math.max(0, Math.min(100, value))}%` }} />}
    </div>
  );
}
