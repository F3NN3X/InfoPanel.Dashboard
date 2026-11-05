import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** A field's box: 32 px on the panel colour, a control border that turns accent with the cursor in it. */
export const FIELD_BOX =
  "h-8 rounded-ui-md border border-ui-control bg-ui-chrome px-3 text-body text-ui-1 outline-none transition-colors duration-(--ui-dur-fast) ease-ui placeholder:text-ui-disabled focus:border-ui-accent disabled:opacity-40 aria-invalid:border-ui-danger";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** A value (a reading, an address, a size): Geist Mono with tabular figures. */
  mono?: boolean;
}

/** The chrome's text field; the caller names it (`aria-label` or a `<label>`). */
export function Field({ mono, className, ...props }: FieldProps) {
  return <input type="text" spellCheck={false} className={cn(FIELD_BOX, mono && "font-ui-mono tabular-nums", className)} {...props} />;
}
