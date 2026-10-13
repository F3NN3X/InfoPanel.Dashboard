import { ArrowLeft, FlaskConical } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import type { HistorySetter } from "@/hooks/use-config-history";
import { useSensors } from "@/hooks/useSensors";
import {
  COOLDOWN_SECONDS_MAX,
  FOR_SECONDS_MAX,
  SENSOR_OPS,
  SEVERITIES,
  type AlertRule,
  type AlertSource,
  type SensorOp,
} from "@/lib/alerts";
import { postControl } from "@/lib/control";
import type { DataPoint } from "@/lib/data-points";
import type { DashboardConfig } from "@/lib/layout";
import { sensorAt } from "@/lib/sensors";
import { cn } from "@/lib/utils";
import { alertsOf, clearLabel, patchRule, previewSensor, ruleKey } from "./alerts-model";
import { ChipsField, Field, Group, NumField, SeverityDot, TextField } from "./alerts-fields";
import { AlertOutputs } from "./alerts-outputs";
import { SensorField } from "./widget-editor/sensor-field";
import { SELECT } from "./setting-rows";

interface AlertRuleEditorProps {
  rule: AlertRule;
  config: DashboardConfig;
  setConfig: HistorySetter;
  /** The live catalogue, for the notification apps suggestions. */
  points: readonly DataPoint[];
  /** The profile and page on the canvas (defaults of the output pickers). */
  current: { profile: string; page: string };
  /** Edits the server does not have yet: a test would run the old rule. */
  pushPending: boolean;
  onBack: () => void;
  onOpenSources: () => void;
}

type SensorSource = Extract<AlertSource, { kind: "sensor" }>;
type NotificationSource = Extract<AlertSource, { kind: "notification" }>;

const OP_LABEL: Record<SensorOp, string> = {
  ">": "is above",
  ">=": "is at least",
  "<": "is below",
  "<=": "is at most",
  "=": "equals",
  "!=": "is not",
  changes: "changes",
  contains: "contains",
};

const NUMERIC_OPS: readonly SensorOp[] = [">", ">=", "<", "<="];

/** App names the Notifications plugin publishes (`notifications.apps`: a JSON array or a comma list). */
export function notificationApps(points: readonly DataPoint[]): string[] {
  const p = points.find((x) => /^notifications\.(apps|app-list)$/i.test(x.key));
  if (!p) return [];
  try {
    const list: unknown = JSON.parse(p.raw);
    if (Array.isArray(list)) return list.filter((s): s is string => typeof s === "string");
  } catch {
    // Not JSON: a plain list.
  }
  return p.raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** The live line under the sensor: the current value and whether the rule would fire on it now. */
function LiveLine({ source }: { source: SensorSource }) {
  const live = useSensors(source.key ? [source.key] : []);
  const { value, state } = previewSensor(source, source.key ? sensorAt(live, source.key) : undefined);
  const note =
    state === "fires" ? "would fire now" : state === "ok" ? "not firing" : state === "event" ? "fires on each change" : "no reading";
  return (
    <div className="flex items-center gap-2 rounded-md bg-ui-app px-2 py-1.5 text-[11.5px]" aria-live="polite">
      <span className="text-ui-4">Now</span>
      <span className="font-ui-mono text-ui-1">{value ?? "—"}</span>
      <span
        className={cn(
          "ml-auto",
          state === "fires" ? "text-ui-warning" : state === "ok" ? "text-ui-success" : "text-ui-4"
        )}
      >
        {note}
      </span>
    </div>
  );
}

/** The rule editor sub-view of the Alerts drawer. */
export function AlertRuleEditor({
  rule,
  config,
  setConfig,
  points,
  current,
  pushPending,
  onBack,
  onOpenSources,
}: AlertRuleEditorProps) {
  const toast = useToast();
  const edit = (field: string, fn: (r: AlertRule) => AlertRule) =>
    setConfig((c) => patchRule(c, rule.id, fn), ruleKey(rule.id, field));
  const editSource = <S extends AlertSource>(field: string, fn: (s: S) => S) =>
    edit(field, (r) => ({ ...r, source: fn(r.source as S) }));
  const source = rule.source;
  const alerts = alertsOf(config);
  const sensorEmpty = source.kind === "sensor" && source.key === "";
  const testBlocked = pushPending || sensorEmpty;

  const test = () =>
    void postControl("alert", { ruleId: rule.id, action: "test" }).then((res) =>
      toast(res ? "Test alert sent" : "Couldn't reach the server")
    );

  const setOp = (op: SensorOp) =>
    editSource<SensorSource>("op", (s) => {
      const { clearBelow, ...rest } = s;
      const keepClear = clearLabel(op) !== null && clearLabel(s.op) === clearLabel(op);
      const value = NUMERIC_OPS.includes(op) && !Number.isFinite(Number(s.value)) ? 0 : s.value;
      return { ...rest, op, value, ...(keepClear && clearBelow !== undefined ? { clearBelow } : {}) };
    });

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 px-2.5 pb-2 pt-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the rules"
          className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] text-ui-3 hover:bg-ui-hover hover:text-ui-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <span className="ml-auto text-[13px] font-semibold text-ui-1">Alert rule</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <div className="space-y-3 px-3.5 pb-3">
          <Field label="Name">
            <TextField value={rule.name} label="Rule name" onChange={(name) => edit("name", (r) => ({ ...r, name }))} />
          </Field>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[12px] text-ui-2">Enabled</span>
            <Toggle checked={rule.enabled} label="Rule enabled" onChange={(enabled) => edit("enabled", (r) => ({ ...r, enabled }))} />
          </div>
          <Field label="Severity">
            <Segmented
              label="Severity"
              value={rule.severity}
              onChange={(severity) => edit("severity", (r) => ({ ...r, severity }))}
              options={SEVERITIES.map((s) => ({
                value: s,
                label: (
                  <span className="flex items-center gap-1.5 capitalize">
                    <SeverityDot severity={s} />
                    {s}
                  </span>
                ),
              }))}
            />
          </Field>
        </div>

        <Group title={source.kind === "sensor" ? "When a sensor" : "When a notification arrives"}>
          {source.kind === "sensor" ? (
            <>
              <SensorField
                label="Sensor"
                value={source.key || undefined}
                onChange={(key) => editSource<SensorSource>("key", (s) => ({ ...s, key: key ?? "" }))}
                onOpenExplorer={onOpenSources}
              />
              {sensorEmpty && <div className="text-[11px] text-ui-warning">Pick a sensor to watch.</div>}
              <Field label="Condition">
                <select
                  aria-label="Operator"
                  value={source.op}
                  onChange={(e) => setOp(e.target.value as SensorOp)}
                  className={cn(SELECT, "w-full max-w-none")}
                >
                  {SENSOR_OPS.map((op) => (
                    <option key={op} value={op}>
                      {OP_LABEL[op]}
                    </option>
                  ))}
                </select>
              </Field>
              {source.op !== "changes" &&
                (NUMERIC_OPS.includes(source.op) ? (
                  <NumField
                    label="Threshold"
                    value={Number(source.value)}
                    onChange={(n) => editSource<SensorSource>("value", (s) => ({ ...s, value: n ?? 0 }))}
                  />
                ) : (
                  <TextField
                    label="Value"
                    value={String(source.value)}
                    onChange={(text) =>
                      editSource<SensorSource>("value", (s) => ({
                        ...s,
                        value: s.op !== "contains" && text.trim() !== "" && Number.isFinite(Number(text)) ? Number(text) : text,
                      }))
                    }
                  />
                ))}
              {source.op !== "changes" && (
                <Field label="For (s)" hint="The condition must hold this long before the alert fires.">
                  <NumField
                    label="For seconds"
                    min={0}
                    max={FOR_SECONDS_MAX}
                    value={source.forSeconds}
                    onChange={(n) => editSource<SensorSource>("for", (s) => ({ ...s, forSeconds: n ?? 0 }))}
                  />
                </Field>
              )}
              {clearLabel(source.op) && (
                <Field label={`${clearLabel(source.op)} (hysteresis)`} hint="Empty = clears as soon as the condition stops holding.">
                  <NumField
                    label={clearLabel(source.op) ?? "Clears at"}
                    value={source.clearBelow}
                    onChange={(n) =>
                      editSource<SensorSource>("clear", (s) => {
                        const { clearBelow: _was, ...rest } = s;
                        return n === undefined ? rest : { ...rest, clearBelow: n };
                      })
                    }
                  />
                </Field>
              )}
              <LiveLine source={source} />
            </>
          ) : (
            <>
              <Field label="Apps" hint="Empty = every app. Enter adds one.">
                <ChipsField
                  label="Apps"
                  values={source.apps ?? []}
                  suggestions={notificationApps(points)}
                  placeholder="App name"
                  onChange={(apps) => editSource<NotificationSource>("apps", (s) => withList(s, "apps", apps))}
                />
              </Field>
              <Field label="Exclude apps">
                <ChipsField
                  label="Exclude apps"
                  values={source.exclude ?? []}
                  suggestions={notificationApps(points)}
                  placeholder="App name"
                  onChange={(list) => editSource<NotificationSource>("exclude", (s) => withList(s, "exclude", list))}
                />
              </Field>
              <Field label="Text contains" hint="The title or body must include this.">
                <TextField
                  label="Text contains"
                  value={source.match ?? ""}
                  onChange={(match) =>
                    editSource<NotificationSource>("match", (s) => {
                      const { match: _was, ...rest } = s;
                      return match === "" ? rest : { ...rest, match };
                    })
                  }
                />
              </Field>
            </>
          )}
          <Field label="Cooldown (s)" hint="No refire within this long after the alert clears.">
            <NumField
              label="Cooldown seconds"
              min={0}
              max={COOLDOWN_SECONDS_MAX}
              value={rule.cooldownSeconds}
              onChange={(n) => edit("cooldown", (r) => ({ ...r, cooldownSeconds: n ?? 0 }))}
            />
          </Field>
          <Field label="Profiles">
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[12px] text-ui-2">
                <input
                  type="checkbox"
                  checked={rule.profiles === undefined}
                  onChange={(e) =>
                    edit("profiles", (r) => {
                      const { profiles: _was, ...rest } = r;
                      return e.target.checked ? rest : { ...rest, profiles: config.profiles.map((p) => p.id) };
                    })
                  }
                />
                All profiles
              </label>
              {rule.profiles !== undefined &&
                config.profiles.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 pl-4 text-[12px] text-ui-2">
                    <input
                      type="checkbox"
                      checked={rule.profiles?.includes(p.id) ?? false}
                      onChange={(e) =>
                        edit("profiles", (r) => {
                          const list = r.profiles ?? [];
                          const next = e.target.checked ? [...list, p.id] : list.filter((id) => id !== p.id);
                          // Unticking the last one would mean "all": keep at least this one.
                          return next.length === 0 ? r : { ...r, profiles: next };
                        })
                      }
                    />
                    {p.name}
                  </label>
                ))}
            </div>
          </Field>
        </Group>

        <AlertOutputs
          rule={rule}
          config={config}
          defaults={alerts.defaults}
          current={current}
          edit={edit}
        />

        <div className="space-y-1.5 border-t border-ui-subtle px-3.5 pt-3">
          <button
            type="button"
            onClick={test}
            disabled={testBlocked}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-ui-strong text-[12.5px] text-ui-1 hover:bg-ui-hover disabled:pointer-events-none disabled:opacity-40"
          >
            <FlaskConical className="h-3.5 w-3.5" /> Test
          </button>
          {testBlocked && (
            <div className="text-pretty text-[11px] leading-[1.4] text-ui-4">
              {sensorEmpty ? "Pick a sensor first." : "Edits are not on the server yet. Save, then test."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** A notification source with one of its lists set (an empty list is dropped). */
function withList(s: NotificationSource, field: "apps" | "exclude", list: string[]): NotificationSource {
  const { [field]: _was, ...rest } = s;
  return list.length > 0 ? { ...rest, [field]: list } : rest;
}
