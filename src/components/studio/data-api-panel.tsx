import { useState } from "react";
import { DEFAULT_API_BASE, normalizeApiBase, testApiBase } from "@/lib/data-api";
import { cn } from "@/lib/utils";

interface DataApiPanelProps {
  /** The saved base URL (undefined = default). */
  value?: string;
  onChange: (url: string) => void;
}

type Probe = "idle" | "testing" | "ok" | "fail";

/** "Data API URL" setting with a test-connection indicator. */
export function DataApiPanel({ value, onChange }: DataApiPanelProps) {
  const saved = value ?? DEFAULT_API_BASE;
  const [draft, setDraft] = useState(saved);
  const [probe, setProbe] = useState<Probe>("idle");
  const valid = normalizeApiBase(draft) !== null;

  const commit = () => {
    const base = normalizeApiBase(draft);
    if (base === null) return;
    setDraft(base);
    if (base !== saved) onChange(base);
  };

  const test = async () => {
    const base = normalizeApiBase(draft);
    if (base === null) return;
    setProbe("testing");
    setProbe((await testApiBase(base)) ? "ok" : "fail");
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setProbe("idle");
        }}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        spellCheck={false}
        className={cn(
          "w-full rounded-md border bg-transparent px-2 py-1.5 text-xs",
          valid ? "border-border" : "border-destructive"
        )}
      />
      {!valid && (
        <div className="text-[11px] text-destructive">Enter an http(s) URL.</div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => void test()}
          disabled={!valid}
          className="rounded-md border border-border px-2 py-1 hover:bg-accent/40 disabled:opacity-50"
        >
          Test connection
        </button>
        {probe === "testing" && <span>testing...</span>}
        {probe === "ok" && <span className="text-emerald-400">connected</span>}
        {probe === "fail" && <span className="text-destructive">not reachable</span>}
      </div>
    </div>
  );
}
