import { useEffect, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Bell, Copy, Info, OctagonAlert, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Toggle } from "@/components/ui/toggle";
import type { HistorySetter } from "@/hooks/use-config-history";
import type { ActiveAlert, AlertHistoryEntry, AlertRule, AlertsConfig, Severity } from "@/lib/alerts";
import { ALERT_PRESETS, type AlertPreset, blankNotificationRule, blankSensorRule, presetRule } from "@/lib/alert-presets";
import type { DataPoint } from "@/lib/data-points";
import { uid, type DashboardConfig } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { useAlertHistory } from "./alerts-live";
import {
  addRule,
  ageText,
  alertsKey,
  alertsOf,
  duplicateRule,
  lastFired,
  patchRule,
  removeRule,
  ruleKey,
  setAlertsEnabled,
  summarizeRule,
} from "./alerts-model";
import { AlertRuleEditor } from "./alerts-rule-editor";

export interface AlertRulesProps {
  config: DashboardConfig;
  setConfig: HistorySetter;
  /** The alerts the server holds now (the control channel). */
  active: ActiveAlert[];
  /** The live catalogue: summaries name sensors, presets pick one. */
  points: readonly DataPoint[];
  /** The profile and page on the canvas. */
  current: { profile: string; page: string };
  /** Edits the server does not have yet (Test waits). */
  pushPending: boolean;
  /** The rule open in the editor (view state), null = the list. */
  editingId: string | null;
  onEdit: (id: string | null) => void;
  /** The sensor picker's "Open data explorer". */
  onOpenSources: () => void;
}

const MENU_POPUP =
  "max-h-[60vh] min-w-52 overflow-y-auto rounded-ui-menu border border-ui-menu bg-ui-raised p-1 font-ui text-body text-ui-2 shadow-ui-menu outline-none";
const MENU_ITEM =
  "flex min-h-[30px] cursor-default flex-col justify-center rounded-md px-2 py-1 outline-none select-none data-highlighted:bg-ui-active data-highlighted:text-ui-1 data-highlighted:shadow-[inset_2px_0_0_var(--ui-accent)]";

/** The "New rule" menu (SPEC §10.3): blank rules and the presets. */
export function NewRuleMenu({ onAdd, points }: { onAdd: (rule: AlertRule) => void; points: readonly DataPoint[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex h-7 items-center rounded-[7px] bg-ui-inverse px-3 text-caption font-semibold text-ui-inverse-fg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60">
        New rule
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-[80]" sideOffset={4} align="end">
          <Menu.Popup className={MENU_POPUP}>
            <Menu.Item className={MENU_ITEM} onClick={() => onAdd(blankSensorRule())}>
              Blank sensor rule
            </Menu.Item>
            <Menu.Item className={MENU_ITEM} onClick={() => onAdd(blankNotificationRule())}>
              Blank notification rule
            </Menu.Item>
            <div className="my-1 border-t border-ui-subtle px-2 pt-1.5 text-micro uppercase tracking-wide text-ui-4">Presets</div>
            {ALERT_PRESETS.map((preset) => (
              <Menu.Item key={preset.id} className={MENU_ITEM} onClick={() => onAdd(presetRule(preset, points))}>
                <span className="text-ui-1">{preset.label}</span>
                <span className="text-micro text-ui-4">{preset.hint}</span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** The one-click starts the empty list offers, after the headline preset. */
const START_PRESETS = ["cpu-temp", "ram-full", "drive-full"];

/** The rules list with no rules: what this is for, a blank rule, and presets that make a rule in one click. */
function EmptyRules({ onAdd, points }: { onAdd: (rule: AlertRule) => void; points: readonly DataPoint[] }) {
  const preset = (id: string): AlertPreset | undefined => ALERT_PRESETS.find((p) => p.id === id);
  const headline = preset("gpu-temp");
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <Bell className="h-10 w-10 text-ui-1 opacity-40" strokeWidth={1.25} aria-hidden />
      <h2 className="text-title font-semibold text-ui-1">No alert rules yet</h2>
      <p className="max-w-[380px] text-pretty text-body leading-[1.45] text-ui-3">A rule watches a sensor and shows an alert on your kiosks when it crosses a limit.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => onAdd(blankSensorRule())} className="h-8 rounded-[7px] bg-ui-inverse px-3 text-caption font-semibold text-ui-inverse-fg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60">
          New rule
        </button>
        {headline && (
          <button type="button" onClick={() => onAdd(presetRule(headline, points))} className="h-8 rounded-[7px] border border-ui-strong px-3 text-caption text-ui-1 hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60">
            Start from {headline.label}
          </button>
        )}
      </div>
      <div role="group" className="flex flex-wrap justify-center gap-1.5" aria-label="Start from a preset">
        {START_PRESETS.flatMap((id) => preset(id) ?? []).map((p) => (
          <button key={p.id} type="button" title={p.hint} onClick={() => onAdd(presetRule(p, points))} className="h-6 rounded-full border border-ui-strong px-2.5 text-micro text-ui-2 hover:bg-ui-hover hover:text-ui-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60">
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SEVERITY_ICON: Record<Severity, { icon: LucideIcon; tone: string }> = {
  info: { icon: Info, tone: "text-ui-accent-text" },
  warning: { icon: TriangleAlert, tone: "text-ui-warn" },
  critical: { icon: OctagonAlert, tone: "text-ui-danger" },
};

/** The display style a rule shows as: its own, else the defaults'. */
export const shownAs = (rule: AlertRule, alerts: AlertsConfig): string => rule.outputs.display?.style ?? alerts.defaults.style;

interface RuleRowProps {
  rule: AlertRule;
  summary: string;
  /** The display style it shows as (its own, else the default). */
  style: string;
  fired: AlertHistoryEntry | undefined;
  now: number;
  confirming: boolean;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
  onDuplicate: () => void;
  onAskDelete: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}

function RuleRow({ rule, summary, style, fired, now, confirming, ...on }: RuleRowProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // The row swaps for the question, so the focused Delete button is gone: put focus on the safe answer.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);
  if (confirming) {
    return (
      <li role="alert" className="flex items-center gap-2 border-t border-ui-hover bg-ui-hover px-3.5 py-2.5 text-caption text-ui-2 first:border-t-0">
        <span className="min-w-0 flex-1 truncate">Delete “{rule.name}”?</span>
        <button type="button" onClick={on.onDelete} className="h-6 rounded-md bg-ui-danger px-2 text-micro text-black">
          Delete
        </button>
        <button ref={cancelRef} type="button" onClick={on.onCancelDelete} className="h-6 rounded-md border border-ui-strong px-2 text-micro">
          Cancel
        </button>
      </li>
    );
  }
  const { icon: Icon, tone } = SEVERITY_ICON[rule.severity];
  return (
    <li className="group flex items-center gap-3 border-t border-ui-hover px-3.5 py-2.5 first:border-t-0 hover:bg-ui-hover">
      <Icon className={cn("h-[17px] w-[17px] shrink-0", tone)} aria-label={rule.severity} />
      <button
        type="button"
        onClick={on.onOpen}
        className={cn(
          "min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60",
          !rule.enabled && "opacity-55"
        )}
      >
        <span className="block truncate text-body font-medium text-ui-1">{rule.name}</span>
        <span className="block truncate font-ui-mono text-micro text-ui-3" title={summary}>
          {summary}
        </span>
        <span className="block truncate text-micro text-ui-4">
          {fired ? `Last fired ${ageText(fired.startedAt, now)} ago` : "Never fired"}
        </span>
      </button>
      <span className="hidden shrink-0 text-micro text-ui-3 sm:block">
        {rule.severity} · shows as {style}
      </span>
      <span className="hidden shrink-0 group-focus-within:flex group-hover:flex">
        <IconButton label="Duplicate rule" onClick={on.onDuplicate}>
          <Copy className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Delete rule" danger onClick={on.onAskDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </span>
      <Toggle checked={rule.enabled} label={`${rule.name} enabled`} onChange={on.onToggle} />
    </li>
  );
}

/**
 * Alerts & Island › Rules: the master switch and the rules (add from blanks or presets, edit, duplicate,
 * delete). A rule opens in the editor sub-view. Rules are config, so each edit is an undo step.
 */
export function AlertRules({ config, setConfig, active, points, current, pushPending, editingId, onEdit, onOpenSources }: AlertRulesProps) {
  const alerts = alertsOf(config);
  const history = useAlertHistory(active);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const [confirming, setConfirming] = useState<string | null>(null);
  const add = (rule: AlertRule) => {
    setConfig((c) => addRule(c, rule), alertsKey(`add:${rule.id}`));
    onEdit(rule.id);
  };
  const editing = editingId ? alerts.rules.find((r) => r.id === editingId) : undefined;
  if (editing) {
    return (
      <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-[10px] border border-ui-default bg-ui-panel">
        <AlertRuleEditor
          rule={editing}
          config={config}
          setConfig={setConfig}
          points={points}
          current={current}
          pushPending={pushPending}
          onBack={() => onEdit(null)}
          onOpenSources={onOpenSources}
        />
      </div>
    );
  }

  const labelOf = (rule: AlertRule) => {
    const keys = rule.source.kind === "sensor" ? rule.source.conditions.map((c) => c.key) : [];
    return keys.map((key) => {
      const point = key ? points.find((p) => p.key === key) : undefined;
      return { name: point?.name, unit: point?.unit };
    });
  };

  return (
    <div className="flex max-w-[900px] flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-body text-ui-1">Alerts on</span>
        <Toggle checked={alerts.enabled} label="Alerts on" className="[&>span]:bg-ui-1" onChange={(on) => setConfig((c) => setAlertsEnabled(c, on), alertsKey("enabled"))} />
      </div>
      <div className="overflow-hidden rounded-[10px] border border-ui-default">
        {alerts.rules.length === 0 ? (
          <EmptyRules onAdd={add} points={points} />
        ) : (
          <ul>
            {alerts.rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                summary={summarizeRule(rule, labelOf(rule))}
                style={shownAs(rule, alerts)}
                fired={lastFired(history, rule.id)}
                now={now}
                confirming={confirming === rule.id}
                onOpen={() => onEdit(rule.id)}
                onToggle={(enabled) =>
                  setConfig((c) => patchRule(c, rule.id, (r) => ({ ...r, enabled })), ruleKey(rule.id, "enabled"))
                }
                onDuplicate={() => {
                  const id = uid("alert");
                  setConfig((c) => duplicateRule(c, rule.id, id), alertsKey(`duplicate:${id}`));
                }}
                onAskDelete={() => setConfirming(rule.id)}
                onCancelDelete={() => setConfirming(null)}
                onDelete={() => {
                  setConfirming(null);
                  setConfig((c) => removeRule(c, rule.id), alertsKey(`remove:${rule.id}`));
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
