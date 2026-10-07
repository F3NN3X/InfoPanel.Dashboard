import { isImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

interface SmartValueProps {
  value?: string;
  /** Sensor key (or entry id) used as an image hint. */
  keyHint?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Renders a sensor value: text values that are image URLs become <img>,
 * everything else renders as text (multi-line aware for flattened tables).
 */
export function SmartValue({
  value,
  keyHint,
  className,
  imgClassName,
}: SmartValueProps) {
  const text = value?.trim();
  if (!text || text === "-") {
    return <span className="text-zinc-600">—</span>;
  }

  if (isImageUrl(text, keyHint)) {
    return (
      <img
        src={text}
        alt=""
        loading="lazy"
        className={cn("h-16 w-16 rounded-md object-cover", imgClassName)}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div className={cn("whitespace-pre-line break-words", className)}>
      {text}
    </div>
  );
}
