/**
 * What every editor shares (spec §6, §10): a copy with no library item gets one, as a draft, on its first
 * edit and keeps it up to date (P-3); leaving asks first only when something else is unsaved, and Save to
 * library writes the item on purpose. The page reaches `requestBack` through the editor's ref.
 */
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { useToast } from "@/components/ui/toast";
import { deleteLibraryItem } from "@/lib/library";
import type { LibraryItem } from "@/lib/library";
import type { GaugeEdit } from "./use-gauge-edit";
import { DiscardDraftDialog } from "./discard-draft-dialog";
import { UnsavedDialog } from "./unsaved-dialog";

/** What the page can ask of the editor: leave it (asking about unsaved changes), or run `then` instead of closing it. */
export interface EditorHandle {
  requestBack: (then?: () => void) => void;
}

/** Save as new: a new item under `name` instead of the one the gauge came from. A draft write names the item it made, so a second write cannot make another. */
export type WriteOptions = { asNew: true; name: string } | { itemId: string };

/** How long after the last edit a draft is written. */
export const DRAFT_DELAY_MS = 700;

export interface EditorShell {
  asking: boolean;
  saving: boolean;
  requestBack: (then?: () => void) => void;
  save: () => Promise<boolean>;
  /** The draft is written now: true when it is, or when there is none to write. */
  flush: () => Promise<boolean>;
  /** Asks whether to delete the draft; null when the gauge is not a draft. */
  discardDraft: (() => void) | null;
  /** Save as new "<name> copy": the gauge is then linked to the new item. Null when there is no item to fork. */
  saveAsNew: (() => Promise<boolean>) | null;
  dialog: ReactNode;
}

export function useEditorShell(p: {
  ref?: Ref<EditorHandle>;
  edit: GaugeEdit;
  /** Writes the gauge to the library item it came from, or a new one. */
  write: (o?: WriteOptions) => Promise<LibraryItem & { updated?: boolean }>;
  onBack: () => void;
  onSaved: () => void;
}): EditorShell {
  const toast = useToast();
  const { edit, onBack } = p;
  // What happens once the user has settled the question: leaving, or the page's `then`.
  const [pending, setPending] = useState<{ go: () => void } | null>(null);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  // The draft's writes run one after another, the second under the item the first made.
  const live = useRef(p);
  live.current = p;
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const draftId = useRef<string | null>(null);
  const discarded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeDraft = async (): Promise<boolean> => {
    const { edit: now, write, onSaved } = live.current;
    if (discarded.current || !now.autosave || !now.dirty || !now.gauge) return true;
    const written = { name: now.name, gauge: now.gauge };
    const itemId = draftId.current ?? now.origin?.itemId;
    try {
      const item = await write(itemId ? { itemId } : undefined);
      draftId.current = item.id;
      now.drafted({ kind: "library", itemId: item.id }, written);
      onSaved();
      return true;
    } catch (e) {
      toast(`Draft not saved: ${(e as Error).message}`);
      return false;
    }
  };
  const flush = (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    queue.current = queue.current.then(writeDraft);
    return queue.current;
  };
  const flushNow = useRef(flush);
  flushNow.current = flush;
  const waiting = edit.autosave && edit.dirty;
  useEffect(() => {
    if (!waiting) return;
    timer.current = setTimeout(() => void flushNow.current(), DRAFT_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [waiting, edit.gauge, edit.name]);
  // Closing the page with a draft waiting writes it: the edits are the user's.
  useEffect(
    () => () => {
      if (live.current.edit.autosave && live.current.edit.dirty) void flushNow.current();
    },
    [],
  );

  const requestBack = (then?: () => void) => {
    const go = then ?? onBack;
    if (edit.autosave && edit.dirty) void flush().then((ok) => (ok ? go() : setPending({ go })));
    else if (edit.dirty) setPending({ go });
    else go();
  };
  useImperativeHandle(p.ref, () => ({ requestBack }));

  const run = async (o?: Extract<WriteOptions, { asNew: true }>): Promise<boolean> => {
    setSaving(true);
    try {
      // A draft's item is the one a save updates; the first save of a copy never written makes one.
      const item = await p.write(o ?? (draftId.current ? { itemId: draftId.current } : undefined));
      if (o) edit.rename(o.name);
      draftId.current = item.id;
      edit.saved({ kind: "library", itemId: item.id });
      p.onSaved();
      toast((item.updated ?? !!edit.origin) ? `Saved ${edit.name}` : `Saved ${o?.name ?? edit.name} to your library`);
      return true;
    } catch (e) {
      toast(`Not saved: ${(e as Error).message}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = () => run();
  const saveAsNew = edit.origin || edit.saveTo ? () => run({ asNew: true, name: `${edit.name} copy` }) : null;

  const discard = async () => {
    const id = draftId.current ?? edit.origin?.itemId;
    if (!id) return;
    discarded.current = true;
    setSaving(true);
    try {
      // The draft is a library item of its own with no files: deleting it leaves any placed copy as it is.
      await deleteLibraryItem(id);
      setDiscarding(false);
      p.onSaved();
      toast(`Discarded the draft ${edit.name}`);
      onBack();
    } catch (e) {
      discarded.current = false;
      toast(`Not discarded: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const dialog = (
    <>
    <DiscardDraftDialog open={discarding} name={edit.name} busy={saving} onCancel={() => setDiscarding(false)} onDiscard={() => void discard()} />
    <UnsavedDialog
      open={pending !== null}
      name={edit.name}
      saving={saving}
      onCancel={() => setPending(null)}
      onDiscard={() => {
        setPending(null);
        pending?.go();
      }}
      onSave={() =>
        void save().then((ok) => {
          if (!ok) return;
          setPending(null);
          pending?.go();
        })
      }
    />
    </>
  );
  return { asking: pending !== null, saving, requestBack, save, flush, discardDraft: edit.draft ? () => setDiscarding(true) : null, saveAsNew, dialog };
}
