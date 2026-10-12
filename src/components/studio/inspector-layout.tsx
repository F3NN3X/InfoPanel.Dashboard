import { createContext, useContext, type ReactNode } from "react";

/**
 * Where the inspector lives: the narrow column beside the canvas ("side")
 * or the full-width dock under it ("dock"), where its sections flow into
 * columns. The inspectors read it to switch their wrapper classes.
 */
export type InspectorLayout = "side" | "dock";

const InspectorLayoutContext = createContext<InspectorLayout>("side");

export const InspectorLayoutProvider = InspectorLayoutContext.Provider;

export function useInspectorLayout(): InspectorLayout {
  return useContext(InspectorLayoutContext);
}

/** The scrolling element of a docked inspector (the aside scrolls itself beside the canvas). */
export const INSPECTOR_SCROLL = "data-inspector-scroll";

/**
 * The inspector's header: a sticky stack beside the canvas, a single wrapping
 * row in the dock. `sticky` classes are the side ones; children go through
 * `HeaderSlot` to size themselves in the row.
 */
export function InspectorHeader({
  side,
  inspectorHeader,
  children,
}: {
  side: string;
  /** Marks the header for `revealWidgetEditor` (it covers the aside's top). */
  inspectorHeader?: boolean;
  children: ReactNode;
}) {
  const dock = useInspectorLayout() === "dock";
  return (
    <div
      data-inspector-header={inspectorHeader ? "" : undefined}
      className={
        dock
          ? "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b bg-popover px-3 py-2"
          : side
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

/**
 * The inspector's body. Beside the canvas it is a plain padded stack; in the
 * dock it is the scroller, and its children flow into ~280px columns that
 * balance (sections and rows carry `break-inside-avoid` themselves).
 */
export function InspectorBody({ side, children }: { side: string; children: ReactNode }) {
  if (useInspectorLayout() !== "dock") return <div className={side}>{children}</div>;
  return (
    <div {...{ [INSPECTOR_SCROLL]: "" }} className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="columns-[17.5rem] gap-x-4 [&>*]:mb-4 [&>.contents>*]:mb-3">{children}</div>
    </div>
  );
}
