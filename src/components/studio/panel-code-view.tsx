import { useState } from "react";
import { uid } from "@/lib/layout";
import { parsePanelJson, type PanelDef } from "@/lib/panel-model";

interface PanelCodeViewProps {
  panel: PanelDef;
  /** Replace the panel (one undo step). */
  onApply: (panel: PanelDef) => void;
}

/**
 * The panel as JSON: edit, then Apply (checked by `parsePanelJson`;
 * missing or repeated widget ids get fresh ones). Until edited it follows
 * the panel (undo, the visual editor).
 */
export function PanelCodeView({ panel, onApply }: PanelCodeViewProps) {
  const json = JSON.stringify(panel, null, 2);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = draft ?? json;

  const apply = () => {
    const parsed = parsePanelJson(text, () => uid("w"));
    if (!parsed.ok) return setError(parsed.error);
    onApply(parsed.panel);
    setDraft(null);
    setError(null);
  };

  const revert = () => {
    setDraft(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            apply();
          }
        }}
        rows={18}
        spellCheck={false}
        aria-label="Panel JSON"
        aria-invalid={error !== null}
        className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] leading-snug text-foreground outline-none focus:border-ring aria-invalid:border-red-500/70"
      />
      {error && <div className="text-[11px] text-red-400">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[10px] text-muted-foreground/60">Ctrl+Enter applies</span>
        <button
          type="button"
          onClick={revert}
          disabled={draft === null}
          className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          Revert
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={draft === null}
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent/40 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
