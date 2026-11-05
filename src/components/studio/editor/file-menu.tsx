import { Fragment, useId } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, FileInput, FileOutput, ListChecks, Replace, Upload } from "lucide-react";
import { FOCUS_RING } from "@/components/ui/button";
import type { MadeFor } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { ITEM, POPUP, SEPARATOR } from "../menu-styles";
import { exportState, MADE_FOR, type ExportFacts } from "./file-menu-model";

interface FileMenuProps {
  facts: ExportFacts;
  /** The screen's Made for: a saved field, one undo step. */
  onMadeFor: (value: MadeFor) => void;
  onImport: () => void;
  /** The Export & back up sheet. */
  onExportSheet: () => void;
  /** Export .infopanel: the page's profile, or the conversion of a grid page. */
  onExportInfoPanel: () => void;
  /** The Export check in the inspector; only on a screen made for InfoPanel. */
  onExportCheck: () => void;
  onConvert: () => void;
  /** Select the part a problem names. */
  onShowProblem: (path: string) => void;
}

/**
 * The editor's File menu (02e, Q22): Made for at the top (P-12), Import, Export .infopanel with why it can't run and the
 * way to fix it, Export & back up, the Export check and the experimental Convert. Version history has no code behind
 * it, so it is not offered (Q22).
 */
export default function FileMenu({ facts, onMadeFor, onImport, onExportSheet, onExportInfoPanel, onExportCheck, onConvert, onShowProblem }: FileMenuProps) {
  const state = exportState(facts);
  const value = facts.madeFor ?? "studio";
  const why = useId();
  return (
    <Menu.Root>
      <Menu.Trigger
        data-testid="file-menu"
        className={cn("flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-ui-md border border-ui-strong bg-ui-raised pl-3 pr-2 text-body text-ui-1 transition-colors hover:bg-ui-hover data-popup-open:bg-ui-hover", FOCUS_RING)}
      >
        File <ChevronDown className="h-4 w-4 text-ui-3" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-[80]" sideOffset={6} align="end">
          <Menu.Popup className={cn(POPUP, "w-[272px]")}>
            <Menu.Group data-testid="made-for">
              <Menu.GroupLabel className="px-2 pb-1 pt-1.5 text-micro text-ui-hint">Made for</Menu.GroupLabel>
              {MADE_FOR.map((m) => (
                <Menu.Item
                  key={m.value}
                  role="menuitemradio"
                  aria-checked={m.value === value}
                  onClick={() => m.value !== value && onMadeFor(m.value)}
                  className="flex cursor-default items-start gap-2 rounded-ui-sm px-2 py-1.5 outline-none select-none data-highlighted:bg-ui-active data-highlighted:text-ui-1"
                >
                  <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center">{m.value === value && <Check className="h-3.5 w-3.5 text-ui-accent-text" />}</span>
                  <span className="min-w-0">
                    <span className="block text-body text-ui-1">{m.label}</span>
                    <span className="block text-micro leading-snug text-ui-hint">{m.note}</span>
                  </span>
                </Menu.Item>
              ))}
            </Menu.Group>
            <Menu.Separator className={SEPARATOR} />
            <Menu.Item className={ITEM} onClick={onImport}>
              <span className="flex items-center gap-2">
                <FileInput className="h-4 w-4 text-ui-3" aria-hidden /> Import…
              </span>
            </Menu.Item>
            {/* Not `disabled`, which arrow keys skip: it stays reachable and says why it does nothing. */}
            <Menu.Item
              className={cn(ITEM, state.blocked !== undefined && "text-ui-hint")}
              aria-disabled={state.blocked !== undefined || undefined}
              aria-describedby={state.blocked !== undefined ? why : undefined}
              closeOnClick={state.blocked === undefined}
              onClick={state.blocked === undefined ? onExportInfoPanel : undefined}
            >
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-ui-3" aria-hidden /> Export .infopanel
              </span>
            </Menu.Item>
            {(state.blocked || state.problem) && (
              <Fragment>
                <p id={why} className="px-2 pb-1 pl-8 text-micro leading-snug text-ui-warn">{state.blocked ?? `${state.problem?.name} is left out of the export`}</p>
                {state.fixMadeFor ? (
                  <Menu.Item className={cn(ITEM, "pl-8 text-ui-accent-text")} onClick={() => onMadeFor("infopanel")}>
                    Make it InfoPanel too
                  </Menu.Item>
                ) : (
                  state.problem && (
                    <Menu.Item className={cn(ITEM, "pl-8 text-ui-accent-text")} onClick={() => state.problem && onShowProblem(state.problem.path)}>
                      Show the problem
                    </Menu.Item>
                  )
                )}
              </Fragment>
            )}
            <Menu.Item className={ITEM} onClick={onExportSheet}>
              <span className="flex items-center gap-2">
                <FileOutput className="h-4 w-4 text-ui-3" aria-hidden /> Export &amp; back up…
              </span>
            </Menu.Item>
            {value === "infopanel" && (
              <Menu.Item className={ITEM} onClick={onExportCheck}>
                <span className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-ui-3" aria-hidden /> Export check
                </span>
              </Menu.Item>
            )}
            <Menu.Separator className={SEPARATOR} />
            <Menu.Item className={ITEM} onClick={onConvert}>
              <span className="flex items-center gap-2">
                <Replace className="h-4 w-4 text-ui-3" aria-hidden /> Convert to InfoPanel (experimental)…
              </span>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
