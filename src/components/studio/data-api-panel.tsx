import { useState } from "react";
import { DEFAULT_API_BASE, normalizeApiBase, testApiBase } from "@/lib/data-api";
import { cn } from "@/lib/utils";
import { FIELD, StackRow } from "./setting-rows";

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
      <StackRow label="Data API URL" hint="Where the dashboard reads sensor data from">
        <input
          type="text"
          value={draft}
          aria-label="Data API URL"
          onChange={(e) => {
            setDraft(e.target.value);
            setProbe("idle");
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          spellCheck={false}
          className={cn(FIELD, "h-[30px] w-full font-ui-mono text-[11.5px]", !valid && "border-ui-danger")}
        />
      </StackRow>
      {!valid && <div className="text-[11px] text-ui-danger">Enter an http(s) URL.</div>}
      <div className="flex items-center gap-2 text-[12px] text-ui-3">
        <button
          type="button"
          onClick={() => void test()}
          disabled={!valid}
          className="h-7 rounded-md border border-ui-strong px-2.5 text-ui-2 hover:bg-ui-hover hover:text-ui-1 disabled:pointer-events-none disabled:opacity-40"
        >
          Test connection
        </button>
        {probe === "testing" && <span>testing...</span>}
        {probe === "ok" && <span className="text-ui-success">connected</span>}
        {probe === "fail" && <span className="text-ui-danger">not reachable</span>}
        {valid && (
          <a
            href={`${normalizeApiBase(draft)}/`}
            target="_blank"
            rel="noreferrer"
            title="Every data point the Data API serves, grouped by source"
            className="ml-auto hover:text-ui-1 hover:underline"
          >
            Open API index
          </a>
        )}
      </div>
    </div>
  );
}
