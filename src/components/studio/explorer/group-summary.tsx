import type { DataContainer, Health } from "@/lib/data-points";
import { sourcePrefKey, type SourcePref } from "@/lib/layout";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { CAPTION, HEALTH_LABEL, StatusDot } from "./explorer-parts";
import { CopyField } from "./point-inspector";
import { useCopy } from "./use-copy";

interface GroupSummaryProps {
  title: string;
  pointCount: number;
  containers: DataContainer[];
  /** Containers per health, for the status callout. */
  status: Record<Health, number>;
  streamUrl: string;
  /** The plugin whose containers carry show / rename preferences; null for other sources. */
  prefPlugin: string | null;
  sourcePrefs: Record<string, SourcePref> | undefined;
  onPrefsChange: (key: string, pref: Partial<SourcePref>) => void;
}

const CALLOUT: Record<Health, string> = {
  ok: "Every container is streaming values.",
  warn: "Some containers report no data right now.",
  off: "Some containers have no data points.",
};

/** The right column with no point selected: counts, the group's stream URL and source preferences. */
export function GroupSummary({
  title,
  pointCount,
  containers,
  status,
  streamUrl,
  prefPlugin,
  sourcePrefs,
  onPrefsChange,
}: GroupSummaryProps) {
  const copy = useCopy();
  const worst: Health = status.off > 0 ? "off" : status.warn > 0 ? "warn" : "ok";
  return (
    <div className="h-full w-full space-y-5 overflow-y-auto bg-ui-panel p-4 font-ui text-ui-2">
      <div>
        <div className="text-[13px] font-medium text-ui-1">{title}</div>
        <div className="mt-0.5 text-[12px] text-ui-4">
          {pointCount} data points · {containers.length} {containers.length === 1 ? "container" : "containers"}
        </div>
      </div>

      <div className="rounded-lg border border-ui-default bg-ui-tile p-3 text-[12px]">
        <div className="mb-1 flex items-center gap-2 text-ui-1">
          <StatusDot health={worst} />
          {status.ok} {HEALTH_LABEL.ok} · {status.warn} {HEALTH_LABEL.warn} · {status.off} {HEALTH_LABEL.off}
        </div>
        <div className="text-ui-3">{CALLOUT[worst]}</div>
      </div>

      <div>
        <CopyField label="Stream this group" value={streamUrl} onCopy={copy} />
      </div>

      {prefPlugin && (
        <div>
          <div className={cn(CAPTION, "mb-1.5")}>Show in dashboard</div>
          <div className="space-y-2">
            {containers.map((c) => {
              const key = sourcePrefKey(prefPlugin, c.id.slice(prefPlugin.length + 1));
              const pref = sourcePrefs?.[key];
              return (
                <div key={c.id} className="rounded-md border border-ui-default bg-ui-tile p-2">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ui-1">{c.title}</span>
                    <Toggle
                      label={`Show ${c.title} in dashboard`}
                      checked={pref?.enabled !== false}
                      onChange={(enabled) => onPrefsChange(key, { enabled })}
                    />
                  </div>
                  <input
                    value={pref?.displayName ?? ""}
                    onChange={(e) => onPrefsChange(key, { displayName: e.target.value || undefined })}
                    placeholder={c.title}
                    aria-label={`Display name for ${c.title}`}
                    className="h-7 w-full rounded border border-ui-default bg-ui-app px-2 text-[12px] text-ui-1 placeholder:text-ui-4 focus:border-ui-accent/60 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
