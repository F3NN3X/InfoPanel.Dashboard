import { createContext, useContext } from "react";

/** How long a plain confirmation stays up. */
export const TOAST_MS = 1800;
/** How long a failure stays up unless dismissed; a toast with an action stays until it is dismissed or used. */
export const TOAST_ERROR_MS = 8000;

/** A toast with one button (Undo after a delete); it stays up `ms` (default `TOAST_MS`). */
export interface ToastOptions {
  action?: { label: string; onClick: () => void };
  ms?: number;
  /** A failure: announced assertively and kept up longer. Also inferred from "Not saved…", "Couldn’t…". */
  error?: boolean;
}

/** Shows a toast and returns its id, which `useDismissToast` takes down without touching a newer toast. */
export type ShowToast = (message: string, options?: ToastOptions) => number;

export const ToastContext = createContext<ShowToast>(() => -1);
export const DismissContext = createContext<(id: number) => void>(() => {});

export const FAILURE = /^(not\s|couldn[’']t|could not|can[’']t|failed)|couldn[’']t/i;

/** How long a toast stays: `null` = until dismissed (it carries an action). */
export function toastDuration(message: string, options?: ToastOptions): number | null {
  if (options?.action) return options.ms ?? null;
  if (options?.error ?? FAILURE.test(message)) return Math.max(options?.ms ?? 0, TOAST_ERROR_MS);
  return options?.ms ?? TOAST_MS;
}

/** `const toast = useToast(); toast("Copied")` — a no-op outside a provider. */
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/** `const dismiss = useDismissToast(); dismiss(id)` — takes down that toast if it is still the one up (a no-op outside a provider). */
export function useDismissToast(): (id: number) => void {
  return useContext(DismissContext);
}
