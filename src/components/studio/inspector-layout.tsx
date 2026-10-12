import { createContext, useContext, type ReactNode } from "react";

/**
 * Where the inspector lives: the narrow column beside the canvas ("side")
 * or the full-width dock under it ("dock"), where its sections flow into
 * 300 px columns. The inspectors read it to switch their wrapper classes.
 */
export type InspectorLayout = "side" | "dock";

const InspectorLayoutContext = createContext<InspectorLayout>("side");

export const InspectorLayoutProvider = InspectorLayoutContext.Provider;

export function useInspectorLayout(): InspectorLayout {
  return useContext(InspectorLayoutContext);
}

/** The scrolling element of the inspector (under its header, in either layout). */
export const INSPECTOR_SCROLL = "data-inspector-scroll";

/**
 * The inspector's header: a stack beside the canvas, a single wrapping row
 * in the dock. Children go through `HeaderSlot` to size themselves in the row.
 */
export function InspectorHeader({ children }: { children: ReactNode }) {
  const dock = useInspectorLayout() === "dock";
  return (
    <div
      data-inspector-header=""
      className={
        dock
          ? "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-ui-subtle px-4 py-2.5"
          : "shrink-0 space-y-3 border-b border-ui-subtle px-4 pb-3 pt-3.5"
      }
    >
      {children}
    </div>
  );
}

/** A header child: sized in the dock's row, untouched beside the canvas. */
export function HeaderSlot({ className, children }: { className: string; children: ReactNode }) {
  return useInspectorLayout() === "dock" ? <div className={className}>{children}</div> : <>{children}</>;
}
