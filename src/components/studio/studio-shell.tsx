import type { ReactNode } from "react";
import { DockSplitter } from "./dock-splitter";
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
  /** The bottom dock's collapse toggle (its top row). */
  dockToggle: ReactNode;
}

/**
 * The studio body below the top bar: rail, left panel, then the canvas
 * (the zoom bar floats over it) with the inspector beside it or, in the
 * bottom placement, in a dock under a splitter (only its top row when
 * collapsed).
 */
export function StudioShell({ layout, rail, drawer, main, bar, inspector, dockToggle }: StudioShellProps) {
  const { layout: l, collapsed } = layout;
  const docked = l.placement === "bottom" && inspector !== null;
  return (
    <div ref={layout.bodyRef} className="flex min-h-0 flex-1 overflow-x-auto">
      {rail}
      {drawer}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <main className="relative flex min-w-[420px] flex-1 flex-col">
            {main}
            {bar}
          </main>
          {!docked && inspector}
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
              className="flex shrink-0 flex-col border-t border-ui-subtle bg-ui-panel"
              style={{ height: l.dockHeight }}
            >
              <div className="flex h-7 shrink-0 items-center px-1.5">{dockToggle}</div>
              {!collapsed && <div className="flex min-h-0 flex-1">{inspector}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
