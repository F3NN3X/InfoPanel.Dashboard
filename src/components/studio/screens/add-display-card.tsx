import { Copy, MonitorUp } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { serverOrigin } from "./shown-on";

/** The address a kiosk opens: the dashboard's origin with `?kiosk=1` (it follows "When the app opens"). */
export const kioskAddress = (origin: string): string => `${origin.replace(/\/+$/, "")}/?kiosk=1`;

/** "Add a display": the kiosk address to open on another screen, and a button that copies it. */
export function AddDisplayCard() {
  const toast = useToast();
  const address = kioskAddress(serverOrigin());
  const copy = () =>
    navigator.clipboard.writeText(address).then(
      () => toast("Kiosk link copied"),
      () => toast(`Could not copy. The link is ${address}`),
    );
  return (
    <section aria-label="Add a display" className="flex items-center gap-3 rounded-ui-lg border border-dashed border-ui-strong p-3">
      <MonitorUp className="h-5 w-5 shrink-0 text-ui-hint" strokeWidth={1.5} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium text-ui-1">Add a display</div>
        <div className="truncate font-ui-mono text-caption text-ui-3" title={address}>
          Open {address.replace(/^https?:\/\//, "")}
        </div>
        {address.includes("127.0.0.1") && <div className="text-micro text-ui-3">From another device, use this PC's address in place of 127.0.0.1.</div>}
      </div>
      <IconButton label="Copy kiosk link" onClick={() => void copy()}>
        <Copy className="h-4 w-4" strokeWidth={1.5} />
      </IconButton>
    </section>
  );
}
