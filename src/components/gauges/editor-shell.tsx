/**
 * What every editor shares (spec §6, §10): a copy with no library item gets one, as a draft, on its first
 * edit and keeps it up to date (P-3); leaving asks first only when something else is unsaved, and Save to
 * library writes the item on purpose. The page reaches `requestBack` through the editor's ref.
 */
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { useToast } from "@/components/ui/toast";
import { deleteLibraryItem } from "@/lib/library";
import type { LibraryItem } from "@/lib/library";
import { sessionDraft, sessionOpen } from "@/lib/gauge-studio/session";
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
  /** Which opened editor this is: its draft's item and write queue are kept under it, past the page. */
  editorId: number;
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

  // Every write (the draft's and Save's) runs in one queue, the second under the item the first made. The queue
  // and the item live in the session: a rail switch unmounts this while a write is pending or in flight, and the
  // editor that comes back must update that item, not make another.
  const live = useRef(p);
  live.current = p;
  const draft = sessionDraft(p.editorId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enqueue = (job: () => Promise<boolean>): Promise<boolean> => (draft.queue = draft.queue.then(job));
  const writeDraft = async (): Promise<boolean> => {
    const { edit: now, write, onSaved } = live.current;
    if (draft.discarded || !now.autosave || !now.dirty || !now.gauge) return true;
    const written = { name: now.name, gauge: now.gauge };
    const itemId = draft.id ?? now.origin?.itemId;
    try {
      const item = await write(itemId ? { itemId } : undefined);
      draft.id = item.id;
      draft.written = written;
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
    return enqueue(writeDraft);
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
  // The page was left (the rail) with the editor still open and a draft waiting: it is written, once. An editor that
  // was closed or replaced (Back, Discard in the Unsaved dialog, another gauge) writes nothing more.
  useEffect(
    () => () => {
      if (sessionOpen(p.editorId) && live.current.edit.autosave && live.current.edit.dirty) void flushNow.current();
    },
    [],
  );
  // Back on the page after a rail switch: the copy was kept before its draft write finished, so it knows no item.
  useEffect(() => {
    if (draft.id && draft.written && !edit.origin && !edit.writeThrough) edit.drafted({ kind: "library", itemId: draft.id }, draft.written as { name: string; gauge: NonNullable<GaugeEdit["gauge"]> });
  }, []);

  const requestBack = (then?: () => void) => {
    const go = then ?? onBack;
    if (edit.autosave && edit.dirty) void flush().then((ok) => (ok ? go() : setPending({ go })));
    else if (edit.dirty) setPending({ go });
    else go();
  };
  useImperativeHandle(p.ref, () => ({ requestBack }));

  const run = (o?: Extract<WriteOptions, { asNew: true }>): Promise<boolean> => {
    setSaving(true);
    return enqueue(async () => {
      const { edit: now, write, onSaved } = live.current;
      try {
        // A draft's item is the one a save updates; the first save of a copy never written makes one.
        const written = { name: o?.name ?? now.name, gauge: now.gauge! };
        const item = await write(o ?? (draft.id ? { itemId: draft.id } : undefined));
        if (o) now.rename(o.name);
        draft.id = item.id;
        draft.written = written;
        now.saved({ kind: "library", itemId: item.id }, written);
        onSaved();
        toast((item.updated ?? !!now.origin) ? `Saved ${written.name}` : `Saved ${written.name} to your library`);
        return true;
      } catch (e) {
        toast(`Not saved: ${(e as Error).message}`);
        return false;
      } finally {
        setSaving(false);
      }
    });
  };

  const save = () => run();
  const saveAsNew = edit.origin || edit.saveTo ? () => run({ asNew: true, name: `${edit.name} copy` }) : null;

  const discard = async () => {
    draft.discarded = true;
    setSaving(true);
    try {
      // A write in flight finishes first, so its item is the one deleted and nothing lands after.
      await draft.queue;
      const id = draft.id ?? live.current.edit.origin?.itemId;
      if (!id) throw new Error("there is no draft to delete");
      // The draft is a library item of its own with no files: deleting it leaves any placed copy as it is.
      await deleteLibraryItem(id);
      setDiscarding(false);
      p.onSaved();
      toast(`Discarded the draft ${edit.name}`);
      onBack();
    } catch (e) {
      draft.discarded = false;
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
        // Whatever failed to write stays unwritten: leaving closes the editor, which writes nothing more.
        draft.discarded = true;
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
