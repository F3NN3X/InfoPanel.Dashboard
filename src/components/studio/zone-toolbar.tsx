import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FoldHorizontal,
  FoldVertical,
  Paintbrush,
  Trash2,
  UnfoldHorizontal,
  UnfoldVertical,
} from "lucide-react";
import type { Placement } from "@/lib/layout";
import { placementTitle } from "./studio-modules";
import { KEYS } from "./use-studio-shortcuts";
import { toolbarPosition, type ToolbarPosition } from "./zone-toolbar-position";

interface Size {
  cols: number;
  rows: number;
}

interface ZoneToolbarProps {
  placement: Placement;
  /** The selected panel widget's name: a second crumb after the zone's. */
  widgetLabel?: string;
  /** Open the widget picker for this zone. */
  onPickWidget: () => void;
  /** Whether the zone can take this size (grid and other zones). */
  canResize: (size: Size) => boolean;
  onResize: (size: Size) => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** Switch the inspector to the Style tab. */
  onStyle: () => void;
}

const ICON_BUTTON =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40";
const DIVIDER = "mx-0.5 h-4 w-px bg-border";

function ToolButton({
  title,
  onClick,
  disabled,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={className ? `${ICON_BUTTON} ${className}` : ICON_BUTTON}
    >
      {children}
    </button>
  );
}

/**
 * The selected zone's actions: widget (and the selected panel widget as a
 * second crumb), size steps, hide, duplicate, remove, style.
 */
export function ZoneToolbar({
  placement: p,
  widgetLabel,
  onPickWidget,
  canResize,
  onResize,
  onToggleVisible,
  onDuplicate,
  onRemove,
  onStyle,
}: ZoneToolbarProps) {
  /** Ctrl+D / Del act on the zone only while no widget is selected. */
  const zoneKeys = widgetLabel === undefined;
  /** A size-step button: disabled when the new size is blocked. */
  const step = (title: string, cols: number, rows: number, icon: ReactNode) => {
    const size = { cols: p.colSpan + cols, rows: p.rowSpan + rows };
    return (
      <ToolButton title={title} disabled={!canResize(size)} onClick={() => onResize(size)}>
        {icon}
      </ToolButton>
    );
  };
  return (
    <div className="flex items-center gap-0.5 whitespace-nowrap rounded-lg border border-border bg-popover/95 p-0.5 text-xs shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={onPickWidget}
        title="Change widget"
        className="flex h-6 max-w-44 items-center gap-1 rounded-md px-1.5 font-medium text-foreground transition-colors hover:bg-accent"
      >
        <span className="truncate">{placementTitle(p)}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>
      {widgetLabel !== undefined && (
        <span
          className="flex max-w-36 items-center gap-0.5 font-medium text-foreground"
          title={`Selected widget — ${KEYS.deselect} selects the panel`}
        >
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate rounded-sm bg-ring/15 px-1 py-0.5">{widgetLabel}</span>
        </span>
      )}
      <span className="px-1 tabular-nums text-muted-foreground" title="Zone size (grid cells)">
        {p.colSpan}×{p.rowSpan}
      </span>
      <div className={DIVIDER} />
      {step("Narrower (Shift+←)", -1, 0, <FoldHorizontal className="h-3.5 w-3.5" />)}
      {step("Wider (Shift+→)", 1, 0, <UnfoldHorizontal className="h-3.5 w-3.5" />)}
      {step("Shorter (Shift+↑)", 0, -1, <FoldVertical className="h-3.5 w-3.5" />)}
      {step("Taller (Shift+↓)", 0, 1, <UnfoldVertical className="h-3.5 w-3.5" />)}
      <div className={DIVIDER} />
      <ToolButton title={`${p.visible ? "Hide" : "Show"} (${KEYS.hide})`} onClick={onToggleVisible}>
        {p.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </ToolButton>
      <ToolButton title={zoneKeys ? `Duplicate (${KEYS.duplicate})` : "Duplicate zone"} onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" />
      </ToolButton>
      <ToolButton
        title={zoneKeys ? `Remove (${KEYS.remove})` : "Remove zone"}
        onClick={onRemove}
        className="hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ToolButton>
      <div className={DIVIDER} />
      <button
        type="button"
        onClick={onStyle}
        title="Edit the zone's style"
        className="flex h-6 items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Paintbrush className="h-3.5 w-3.5" /> Style
      </button>
    </div>
  );
}

interface ZoneToolbarLayerProps {
  /** The canvas scroll container (the toolbar is placed over it). */
  scrollRef: RefObject<HTMLDivElement | null>;
  zoneId: string;
  /** Changes whenever the zone can have moved (zoom, box, grid). */
  layoutKey: string;
  children: ReactNode;
}

/**
 * Keeps the toolbar next to the zone's frame. It lives outside the zoomed
 * canvas (constant size) and follows scrolling, zoom and resizes.
 */
export function ZoneToolbarLayer({ scrollRef, zoneId, layoutKey, children }: ZoneToolbarLayerProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<ToolbarPosition | null>(null);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const bar = barRef.current;
    if (!scroller || !bar) return;
    const frame = scroller.querySelector(`[data-zone-id="${CSS.escape(zoneId)}"]`);
    const update = () => {
      if (!frame) return setPos(null);
      const s = scroller.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      setPos(
        toolbarPosition(
          { left: f.left - s.left, top: f.top - s.top, width: f.width, height: f.height },
          { width: scroller.clientWidth, height: scroller.clientHeight },
          { width: bar.offsetWidth, height: bar.offsetHeight }
        )
      );
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(bar);
    if (frame) observer.observe(frame);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scrollRef, zoneId, layoutKey]);

  return (
    <div
      ref={barRef}
      data-zone-toolbar
      className="absolute z-30"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
    >
      {children}
    </div>
  );
}
