/**
 * The Gauges view's editor, kept while the page is closed (spec §10: no blocking dialog on a mode
 * switch). The page unmounts with the rail, so the open editor and its working copy live here, like the
 * inspector's hand-opened sections, and returning to Gauges restores them with their undo history.
 */
import type { EditorOpen } from "./open";

export interface EditorSlot {
  id: number;
  open: EditorOpen;
}

/**
 * What a draft's writes need to outlive the editor component (a rail switch unmounts it while a write is
 * pending or in flight): the library item made so far, the queue the writes run in, and what was last written.
 */
export interface DraftState {
  id: string | null;
  queue: Promise<boolean>;
  /** Discard draft was chosen: nothing more is written. */
  discarded: boolean;
  written: { name: string; gauge: unknown } | null;
}

let slot: EditorSlot | null = null;
const drafts = new Map<number, DraftState>();
let copy: { id: number; value: unknown } | null = null;
let last = 0;

/** The editor left open, if any. */
export const sessionEditor = (): EditorSlot | null => slot;

/** A new editor replaces the one before it, and its working copy. */
export function openSession(open: EditorOpen): EditorSlot {
  slot = { id: ++last, open };
  copy = null;
  drafts.clear();
  return slot;
}

/** Back to the browse page: nothing is kept. */
export function closeSession(): void {
  slot = null;
  copy = null;
  drafts.clear();
}

/** Whether editor `id` is still the open one: false once it was closed or replaced, true while only the page is away. */
export const sessionOpen = (id: number): boolean => slot?.id === id;

/** The draft state of editor `id`, made on first use. */
export function sessionDraft(id: number): DraftState {
  let d = drafts.get(id);
  if (!d) drafts.set(id, (d = { id: null, queue: Promise.resolve(true), discarded: false, written: null }));
  return d;
}

/** The working copy of editor `id`, as it was last kept. */
export const sessionCopy = <T,>(id: number): T | undefined => (copy?.id === id ? (copy.value as T) : undefined);

/** Keeps the working copy of editor `id` (ignored once that editor is closed). */
export function keepCopy(id: number, value: unknown): void {
  if (slot?.id === id) copy = { id, value };
}
