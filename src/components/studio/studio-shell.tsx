import type { ReactNode } from "react";
import { DockSplitter } from "./dock-splitter";
import type { useStudioLayout } from "./use-studio-layout";

interface StudioShellProps {
  layout: ReturnType<typeof useStudioLayout>;
  /** The icon rail. */
  rail: ReactNode;
  /** The open drawer (null = none): beside the rail, or the dock's first column. */
  drawer: ReactNode;
  /** The canvas (or the Sources view). */
  main: ReactNode;
  /** The strip under the canvas (null in the Sources view): zoom + layout switch. */
  bar: ReactNode;
  /** The inspector `<aside>`. */
  inspector: ReactNode;
}

/**
 * The studio body below the top bar. Side placement: rail, drawer, canvas
 * (with its strip under it) and the inspector in a row. Bottom placement:
 * rail and canvas on top; under a splitter, the dock holds the strip, then
 * the drawer and the inspector as columns (only the strip when collapsed).
 */
export function StudioShell({ layout, rail, drawer, main, bar, inspector }: StudioShellProps) {
  const { layout: l, collapsed } = layout;
  const docked = l.placement === "bottom";
  return (
    <div ref={layout.bodyRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        {rail}
        {!docked && drawer}
        <main className="flex min-w-[420px] flex-1 flex-col">
          {main}
          {!docked && bar}
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
          <div className="flex shrink-0 flex-col" style={{ height: l.dockHeight }}>
            {bar}
            {!collapsed && (
              <div className="flex min-h-0 flex-1">
                {drawer}
                {inspector}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
