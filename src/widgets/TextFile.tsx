import type { ModuleSettings } from "@/modules/types";
import { entryText } from "./entries";
import { Widget, shell, num, Empty, type ShellProps, type WidgetMeta } from "./kit";

const P = "plugins.InfoPanel.TextFile.";

export const meta: WidgetMeta = {
  id: "TextFile",
  name: "Text File",
  category: "Info",
  icon: "description",
  prefixes: [P],
  defaultSize: [3, 2],
  minSize: [2, 1],
  description: "Shows a text file the TextFile plugin watches, with its size, line count and status.",
};

export interface TextFileProps extends ShellProps {
  look?: ModuleSettings;
  /** The size / lines / status header (default true). */
  showMeta?: boolean;
}

function humanBytes(bytes: number): string | undefined {
  if (!Number.isFinite(bytes) || bytes <= 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${v.toFixed(1)} ${units[u]}`;
}

export default function TextFile(p: TextFileProps) {
  const k = (id: string) => entryText(p.data, P, id);
  const content = k("content");
  const status = k("status");
  const size = humanBytes(num(k("file-size")));
  const lines = num(k("line-count"));
  const hasLines = Number.isFinite(lines) && lines > 0;
  const showMeta = p.showMeta ?? true;
  const body = (content ?? "").split("\n");
  const bits = [size, hasLines ? `${lines} lines` : undefined, status].filter((x): x is string => !!x);
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Text File"}
      icon="description"
      right={
        showMeta && bits.length > 0 ? (
          <span className="flex min-w-0 gap-2 text-[color:var(--w-muted)]">
            {size && <span>{size}</span>}
            {hasLines && <span>{`${lines} lines`}</span>}
            {status && (
              <span className="max-w-48 truncate" title={status}>
                {status}
              </span>
            )}
          </span>
        ) : undefined
      }
      compact={{ label: "Text File", value: hasLines ? `${lines} lines` : (status ?? "—"), sub: body[0] ?? "", kind: "text", icon: "description" }}
      studio={{ label: "Text File", value: hasLines ? lines : "", unit: hasLines ? "lines" : undefined, sub: [size, status].filter(Boolean).join(" · "), rows: body.slice(0, 8).map((n) => ({ n, v: "" })) }}
    >
      {() =>
        content === undefined && status === undefined ? (
          <Empty icon="description" label="No content" />
        ) : (
          <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[color:var(--w-fg)]/85">{content ?? "No content"}</pre>
        )
      }
    </Widget>
  );
}
