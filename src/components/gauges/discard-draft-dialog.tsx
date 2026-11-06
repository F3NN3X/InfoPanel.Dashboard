/** "Discard draft": the draft the autosave made is deleted from the library and the editor closes (P-3). */
import { useRef } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export interface DiscardDraftDialogProps {
  open: boolean;
  name: string;
  busy: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export function DiscardDraftDialog({ open, name, busy, onDiscard, onCancel }: DiscardDraftDialogProps) {
  // Keep is the safe way out, so it has focus.
  const keep = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup initialFocus={keep} className="fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-3 rounded-ui-lg border border-ui-strong bg-ui-raised p-4 font-ui text-ui-1 shadow-ui-modal outline-none">
          <Dialog.Title className="text-body font-medium text-ui-1">Discard this draft?</Dialog.Title>
          <Dialog.Description className="text-caption leading-relaxed text-ui-3">“{name}” is deleted from your library. Gauges already placed on a screen keep their own copy.</Dialog.Description>
          <div className="flex justify-end gap-2 pt-1">
            <button ref={keep} type="button" onClick={onCancel} className="h-8 rounded-ui-md border border-ui-strong bg-ui-raised px-3 text-body font-medium text-ui-1 hover:border-ui-hover-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
              Keep draft
            </button>
            <Button variant="danger" onClick={onDiscard} disabled={busy}>
              Discard draft
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
