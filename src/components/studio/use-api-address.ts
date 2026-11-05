import { useState } from "react";
import { DEFAULT_API_BASE, normalizeApiBase, testApiBase } from "@/lib/data-api";

export type ApiProbe = "idle" | "testing" | "ok" | "fail";

/**
 * The Data API address as a draft: `commit` saves a valid one through `onChange` (which writes `config.dataApiUrl`,
 * one undo step), `test` tries it. The Connection card and the Data API popover share it, so they read and write alike.
 */
export function useApiAddress(value: string | undefined, onChange: (url: string) => void) {
  const saved = value ?? DEFAULT_API_BASE;
  const [draft, setDraft] = useState(saved);
  const [probe, setProbe] = useState<ApiProbe>("idle");
  const base = normalizeApiBase(draft);

  const commit = () => {
    if (base === null) return;
    setDraft(base);
    if (base !== saved) onChange(base);
  };

  const test = async () => {
    if (base === null) return;
    setProbe("testing");
    setProbe((await testApiBase(base)) ? "ok" : "fail");
  };

  const edit = (next: string) => {
    setDraft(next);
    setProbe("idle");
  };

  return { draft, edit, probe, base, valid: base !== null, commit, test };
}
