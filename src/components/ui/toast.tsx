import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** How long a toast stays up. */
export const TOAST_MS = 1800;

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** `const toast = useToast(); toast("Copied")` — a no-op outside a provider. */
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/** Hosts the toast: top-centre (14px under the top bar), inverse colours, gone after ~1.8 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((message) => {
    clearTimeout(timer.current);
    setToast({ id: nextId.current++, message });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-none fixed left-1/2 top-[62px] z-[100] -translate-x-1/2 rounded-lg bg-ui-inverse px-3 py-[7px] font-ui text-xs font-medium text-ui-inverse-fg shadow-ui-float"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
