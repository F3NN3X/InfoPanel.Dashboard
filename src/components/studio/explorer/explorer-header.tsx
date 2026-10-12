import { ExternalLink, Link2, Plus, RefreshCw, Trash2, Waypoints } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Popover } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { refreshCatalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useEndpoints } from "./explorer-endpoints";
import { useCopy } from "./use-copy";

interface ExplorerHeaderProps {
  pointCount: number;
  sourceCount: number;
  apiBase: string;
  /** `system.bridge.status` is "running". */
  running: boolean;
  loading: boolean;
}

const MENU_ITEM =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-ui-2 hover:bg-ui-hover hover:text-ui-1";

/** The explorer's top bar: title and counts, the API status pill, Endpoints and Add source. */
export function ExplorerHeader({ pointCount, sourceCount, apiBase, running, loading }: ExplorerHeaderProps) {
  const copy = useCopy();
  const toast = useToast();
  const endpoints = useEndpoints();

  const clearPushed = () => {
    fetch(`${apiBase}/api/clear`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("clear failed");
        toast("Cleared pushed values");
        return refreshCatalog();
      })
      .catch(() => toast("Could not clear pushed values"));
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ui-subtle bg-ui-chrome px-4 py-2.5 font-ui">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ui-1">Data sources</div>
        <div className="text-[12px] text-ui-4">
          {pointCount} data points from {sourceCount} sources
        </div>
      </div>

      <span
        className={cn(
          "inline-flex h-7 items-center gap-2 rounded-full border border-ui-default px-3 text-[12px]",
          running ? "text-ui-2" : "text-ui-4"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", running ? "bg-ui-success" : "bg-[#5a5a63]")} />
        {running ? "Data API running" : "Data API"} · live via SSE
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <IconButton label="Reload from the Data API" onClick={() => void refreshCatalog()}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </IconButton>
        <a
          href={`${apiBase}/`}
          target="_blank"
          rel="noreferrer"
          title="Open the Data API index (every key, grouped by source)"
          aria-label="Open the Data API index"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ui-3 hover:bg-ui-hover hover:text-ui-1"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <Popover
          align="end"
          className="w-[460px] p-1.5"
          triggerClassName="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] border border-ui-strong bg-ui-raised px-2.5 text-[12px] text-ui-1 hover:bg-ui-hover"
          trigger={
            <>
              <Waypoints className="h-3.5 w-3.5" />
              Endpoints
            </>
          }
        >
          <div className="max-h-[60vh] overflow-y-auto">
            {endpoints.map((e) => (
              <button
                key={`${e.method} ${e.path}`}
                type="button"
                onClick={() => copy(`${apiBase}${e.path}`)}
                className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-ui-hover"
              >
                <span
                  className={cn(
                    "mt-px w-9 shrink-0 font-ui-mono text-[10.5px] font-medium",
                    e.method === "GET" ? "text-ui-success" : "text-ui-warning"
                  )}
                >
                  {e.method}
                </span>
                <span className="min-w-0">
                  <span className="block break-all font-ui-mono text-[11.5px] text-ui-1">{e.path}</span>
                  <span className="block text-[11.5px] text-ui-4">{e.description}</span>
                </span>
              </button>
            ))}
          </div>
        </Popover>

        <Popover
          align="end"
          className="w-[280px]"
          triggerClassName="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] bg-ui-accent px-3 text-[12px] font-medium text-ui-inverse-fg hover:brightness-110"
          trigger={
            <>
              <Plus className="h-3.5 w-3.5" />
              Add source
            </>
          }
        >
          <button type="button" className={MENU_ITEM} onClick={() => copy(`${apiBase}/api/push`)}>
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            Copy the push URL (POST /api/push)
          </button>
          <button type="button" className={MENU_ITEM} onClick={clearPushed}>
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Clear pushed values
          </button>
          <a href={`${apiBase}/`} target="_blank" rel="noreferrer" className={MENU_ITEM}>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            Open the Data API index
          </a>
        </Popover>
      </div>
    </div>
  );
}
