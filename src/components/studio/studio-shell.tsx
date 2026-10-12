import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DockSplitter } from "./dock-splitter";
import { CollapseTab, DockToggle, ExpandStrip } from "./dock-toggle";
import type { useStudioLayout } from "./use-studio-layout";

interface StudioShellProps {
  layout: ReturnType<typeof useStudioLayout>;
  /** The icon rail. */
  rail: ReactNode;
  /** The open left panel (null = none). */
  drawer: ReactNode;
  /** The canvas (or the Sources view). */
  main: ReactNode;
  /** The floating zoom bar over the canvas (null in the Sources view). */
  bar: ReactNode;
  /** The inspector `<aside>` (null in the Sources view). */
  inspector: ReactNode;
  /** What the collapsed inspector holds (the bottom dock's bar says it). */
  summary: string;
}

/**
 * The studio body below the top bar: rail, left panel, then the canvas
 * (the zoom bar floats over it) with the inspector beside it or, in the
 * bottom placement, in a dock under a splitter. Collapsed (Ctrl+\), the side
 * inspector leaves a slim strip and the dock only its bar; either way the
 * inspector stays mounted behind it.
 */
export function StudioShell({ layout, rail, drawer, main, bar, inspector, summary }: StudioShellProps) {
  const { layout: l, collapsed } = layout;
  const docked = l.placement === "bottom" && inspector !== null;
  return (
    <div ref={layout.bodyRef} className="relative flex min-h-0 flex-1 overflow-x-auto">
      {rail}
      {drawer && layout.leftOverlay ? (
        // Too narrow to sit beside the canvas: the left panel floats over it as a drawer.
        <div className="absolute inset-y-0 left-[52px] z-40 flex shadow-ui-drawer">{drawer}</div>
      ) : (
        drawer
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <main className="relative flex min-w-[420px] flex-1 flex-col">
            {main}
            {bar}
          </main>
          {inspector !== null && !docked && (
            <>
              <div className={collapsed ? "hidden" : "relative flex shrink-0"}>
                {inspector}
                <CollapseTab placement="side" onToggle={layout.toggleCollapsed} className="absolute -left-4 top-1/2 z-30 -translate-y-1/2" />
              </div>
              {collapsed && <ExpandStrip onToggle={layout.toggleCollapsed} />}
            </>
          )}
        </div>
        {docked && (
          <>
            {!collapsed && (
              <DockSplitter
                dockHeight={l.dockHeight}
                bodyHeight={layout.body.height}
                autoHeight={layout.autoDockHeight}
                onCommit={layout.setDockHeight}
              />
            )}
            <div
              // The inspector's own top border is the dock's edge; the bar needs one of its own.
              className={cn("relative flex shrink-0 flex-col bg-ui-panel", collapsed && "border-t border-ui-subtle")}
              style={{ height: l.dockHeight }}
            >
              {collapsed ? (
                <div className="flex h-7 shrink-0 items-center px-1.5">
                  <DockToggle onToggle={layout.toggleCollapsed} summary={summary} />
                </div>
              ) : (
                <CollapseTab placement="bottom" onToggle={layout.toggleCollapsed} className="absolute -top-4 right-4 z-30" />
              )}
              {/* Collapsed, the inspector stays mounted (its tab, scroll and search survive) but out of sight and focus. */}
              <div className={collapsed ? "invisible h-0 overflow-hidden" : "flex min-h-0 flex-1"}>{inspector}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
