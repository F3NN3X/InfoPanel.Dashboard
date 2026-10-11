import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => void;
  onReset: () => void;
}

/** Confirm "Reset everything…": it wipes the whole config. */
export function ResetConfigDialog({ open, onOpenChange, onExport, onReset }: ResetConfigDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[26rem] -translate-x-1/2 -translate-y-1/2 space-y-3 rounded-lg border border-border bg-popover p-4 text-foreground shadow-xl outline-none">
          <AlertDialog.Title className="text-sm font-semibold">Reset everything?</AlertDialog.Title>
          <AlertDialog.Description className="text-xs leading-relaxed text-muted-foreground">
            This wipes every profile and its zones, the theme, style presets
            and all widget settings, and restores the default dashboard. Undo
            (Ctrl+Z) brings it back only until you leave the studio — export
            the config first to keep a copy.
          </AlertDialog.Description>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onExport}>
              <Download className="h-3.5 w-3.5" /> Export first
            </Button>
            <AlertDialog.Close
              render={<Button size="sm" variant="outline" className="ml-auto h-8 text-xs" />}
            >
              Cancel
            </AlertDialog.Close>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={() => {
                onReset();
                onOpenChange(false);
              }}
            >
              Reset everything
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
