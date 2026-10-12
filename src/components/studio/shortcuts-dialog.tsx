import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { SHORTCUT_GROUPS } from "./use-studio-shortcuts";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "Ctrl+Shift+Z / Ctrl+Y" as keycaps: one per key, " / " between alternatives. */
function Keys({ keys }: { keys: string }) {
  return (
    <span className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
      {keys.split(" / ").map((alt, i) => (
        <span key={alt} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10.5px] text-ui-4">/</span>}
          {alt.split("+").map((key, j) => (
            <Kbd key={j}>{key}</Kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

/** The keyboard shortcut sheet ("?", the rail's keyboard icon, or ⋯ → Keyboard shortcuts). */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-ui-strong bg-ui-raised font-ui text-ui-1 shadow-ui-modal outline-none">
          <div className="flex items-center gap-2 border-b border-ui-subtle px-4 py-3">
            <Dialog.Title className="flex-1 text-sm font-semibold">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close
              title="Close (Esc)"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ui-4 hover:bg-ui-hover hover:text-ui-1"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group.title}>
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ui-4">{group.title}</div>
                <dl className="space-y-1.5">
                  {group.items.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-[12.5px]">
                      <dt className="min-w-0 flex-1 text-ui-2">{item.label}</dt>
                      <dd className="max-w-[55%] shrink-0">
                        <Keys keys={item.keys} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            <p className="text-[11px] text-ui-4">
              Plain keys are ignored while typing in a field; Esc, Ctrl+S, undo and redo always work.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
