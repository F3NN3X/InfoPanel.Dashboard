import type { useConfigHistory } from "@/hooks/use-config-history";
import type { ToastOptions } from "@/components/ui/toast";
import type { useStepNames } from "./use-step-names";

interface StepUndoArgs {
  history: ReturnType<typeof useConfigHistory>;
  steps: ReturnType<typeof useStepNames>;
  /** Edit is open: Undo and Redo name the step. */
  design: boolean;
  toast: (message: string, options?: ToastOptions) => number;
  /** Open the zone a step happened on, and the setting to light. */
  jump: (at: { profileId: string; pageId: string; zoneId: string; key?: string }) => void;
}

/**
 * Undo and Redo for Edit: a toast says what happened and offers the way back, and the restored setting lights up.
 * An empty stack, or a drag in progress, changes nothing and raises no toast, so its button can't revert a real edit. The
 * step is named when the button is pressed, not when the toast was raised.
 */
export function useStepUndo({ history, steps, design, toast, jump }: StepUndoArgs) {
  const undo = () => {
    if (!design) return history.undo();
    if (history.dragging() || history.stack.current.past.length === 0) return;
    const step = steps.peek().undo;
    history.undo();
    show("Undid", step, redo);
  };
  const redo = () => {
    if (!design) return history.redo();
    if (history.dragging() || history.stack.current.future.length === 0) return;
    const step = steps.peek().redo;
    history.redo();
    show("Redid", step, undo);
  };
  const show = (verb: "Undid" | "Redid", step: ReturnType<typeof steps.peek>["undo"], back: () => void) => {
    toast(steps.kit ? steps.kit.stepSentence(verb, step) : `${verb} the last change`, { action: { label: verb === "Undid" ? "Redo" : "Undo", onClick: back }, ms: 6000 });
    const at = step?.target;
    if (!at) return;
    const page = history.latest.current.profiles.find((p) => p.id === at.profileId)?.pages.find((p) => p.id === at.pageId);
    if (page?.placements.some((p) => p.id === at.zoneId)) jump(at);
  };
  return { undo, redo };
}
