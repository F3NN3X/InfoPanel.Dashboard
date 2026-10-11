import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { SHORTCUT_GROUPS } from "./use-studio-shortcuts";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The keyboard shortcut cheat sheet ("?", or ⋯ → Keyboard shortcuts). */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[26rem] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-popover text-foreground shadow-xl outline-none">
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Dialog.Title className="flex-1 text-sm font-semibold">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close
              title="Close (Esc)"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group.title}>
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.title}
                </div>
                <dl className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-xs">
                      <dt className="flex-1 text-foreground/90">{item.label}</dt>
                      <dd>
                        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[11px] tabular-nums text-muted-foreground">
                          {item.keys}
                        </kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="text-[11px] text-muted-foreground/70">
              Plain keys are ignored while typing in a field; Esc, Ctrl+S,
              undo and redo always work.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
