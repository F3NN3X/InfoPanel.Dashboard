import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import type { HistorySetter } from "@/hooks/use-config-history";
import {
  ALERT_BACKDROPS,
  ALERT_SIZES,
  ALERT_STYLES,
  DISPLAY_SECONDS_MAX,
  SEVERITIES,
  type AlertsConfig,
  type Severity,
} from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { Field, Group, ISLAND_HINT, NumField, PositionGrid } from "./alerts-fields";
import { alertsKey, patchDefaults, setQuietHours } from "./alerts-model";
import { FIELD, SELECT } from "./setting-rows";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The collapsed "Global defaults" section: the display rules fall back to, and quiet hours. */
export function AlertDefaults({ alerts, setConfig }: { alerts: AlertsConfig; setConfig: HistorySetter }) {
  const d = alerts.defaults;
  const quiet = alerts.quietHours;
  const setDefaults = (field: string, patch: Partial<AlertsConfig["defaults"]>) =>
    setConfig((c) => patchDefaults(c, patch), alertsKey(`defaults.${field}`));
  const setQuiet = (patch: Partial<NonNullable<AlertsConfig["quietHours"]>>) =>
    setConfig(
      (c) => setQuietHours(c, { from: "23:00", to: "07:00", minSeverity: "critical", ...quiet, ...patch }),
      alertsKey("quiet")
    );

  return (
    <Group title="Global defaults" defaultOpen={false}>
      <Field label="Default style">
        <Segmented
          label="Default style"
          value={d.style}
          onChange={(style) => setDefaults("style", { style })}
          options={ALERT_STYLES.map((s) => ({ value: s, label: cap(s) }))}
        />
      </Field>
      {d.style === "island" && <p className="text-[11px] leading-snug text-ui-5">{ISLAND_HINT}</p>}
      <div className="flex items-end justify-between gap-3">
        {d.style !== "island" && (
          <Field label="Position">
            <PositionGrid value={d.position} onChange={(position) => setDefaults("position", { position })} />
          </Field>
        )}
        <Field label="Size">
          <Segmented
            label="Default size"
            value={d.size}
            onChange={(size) => setDefaults("size", { size })}
            options={ALERT_SIZES.map((s) => ({ value: s, label: s.toUpperCase() }))}
          />
        </Field>
      </div>
      {d.style !== "island" && (
        <Field label="Backdrop">
          <Segmented
            label="Default backdrop"
            value={d.backdrop}
            onChange={(backdrop) => setDefaults("backdrop", { backdrop })}
            options={ALERT_BACKDROPS.map((b) => ({ value: b, label: cap(b) }))}
          />
        </Field>
      )}
      <Field label="Seconds" hint="0 = stays until acknowledged.">
        <NumField
          label="Default seconds"
          min={0}
          max={DISPLAY_SECONDS_MAX}
          value={d.seconds}
          onChange={(n) => setDefaults("seconds", { seconds: n ?? 0 })}
        />
      </Field>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[12px] text-ui-2">Quiet hours</span>
        <Toggle
          checked={quiet !== undefined}
          label="Quiet hours"
          onChange={(on) => (on ? setQuiet({}) : setConfig((c) => setQuietHours(c, undefined), alertsKey("quiet")))}
        />
      </div>
      {quiet && (
        <>
          <div className="flex items-center gap-2 text-[12px] text-ui-2">
            <input
              type="time"
              aria-label="Quiet from"
              value={quiet.from}
              onChange={(e) => e.target.value && setQuiet({ from: e.target.value })}
              className={cn(FIELD, "h-7 flex-1")}
            />
            to
            <input
              type="time"
              aria-label="Quiet until"
              value={quiet.to}
              onChange={(e) => e.target.value && setQuiet({ to: e.target.value })}
              className={cn(FIELD, "h-7 flex-1")}
            />
          </div>
          <Field label="Still show" hint="Alerts below this severity are kept in history but not shown.">
            <select
              aria-label="Minimum severity shown"
              value={quiet.minSeverity}
              onChange={(e) => setQuiet({ minSeverity: e.target.value as Severity })}
              className={cn(SELECT, "w-full max-w-none")}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {cap(s)} and above
                </option>
              ))}
            </select>
          </Field>
        </>
      )}
    </Group>
  );
}
