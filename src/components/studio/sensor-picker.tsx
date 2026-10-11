import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { refreshCatalog, useSensorCatalog } from "@/lib/catalog";
import { pickerOptions } from "@/lib/sources";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Sensor picker — searchable dropdown over the Data API's catalog
 * (`/api/sources` names and types, values from a `/api/sensors` snapshot).
 * ------------------------------------------------------------------ */

export function SensorPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (key: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const catalog = useSensorCatalog();
  const options = useMemo(
    () => pickerOptions(catalog.sources, catalog.sensors),
    [catalog.sources, catalog.sensors]
  );

  useEffect(() => {
    if (!open) return;
    void refreshCatalog(); // current names and values each time it opens
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = value ? options.find((o) => o.key === value) : undefined;
  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => q === "" || o.search.includes(q)).slice(0, 50);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs",
          "hover:border-ring/50"
        )}
      >
        <span
          className={cn(
            "truncate",
            current ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {current?.label ?? value ?? "No sensor bound…"}
        </span>
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-border p-1.5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sensors…"
              className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:border-ring"
            />
            {value && (
              <button
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Unbind sensor"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {matches.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">
                {catalog.status === "error"
                  ? "the Data API is not reachable"
                  : catalog.status === "loading" && options.length === 0
                    ? "loading…"
                    : "no sensors match"}
              </div>
            ) : (
              matches.map((o) => (
                <button
                  key={o.key}
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                  title={o.key}
                  className={cn(
                    "block w-full px-2 py-1.5 text-left text-xs hover:bg-accent",
                    o.key === value && "bg-accent/60"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-foreground">{o.label}</span>
                    {o.type && o.type !== "sensor" && o.type !== "text" && (
                      <span className="shrink-0 rounded bg-accent/60 px-1 text-[10px] text-muted-foreground">
                        {o.type}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {o.where}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
