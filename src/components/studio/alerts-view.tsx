import { useEffect, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import type { HistorySetter } from "@/hooks/use-config-history";
import type { ActiveAlert, AlertRule } from "@/lib/alerts";
import type { ControlState } from "@/lib/control";
import type { DataPoint } from "@/lib/data-points";
import type { DashboardConfig, MonitorProfile } from "@/lib/layout";
import { AlertDefaults } from "./alerts-defaults";
import { AlertsHistory } from "./alerts-history";
import { historyCsv, filterHistory, type HistoryFilter } from "./alerts-history-model";
import { useAlertHistory } from "./alerts-live";
import { addRule, alertsKey, alertsOf, setAlertsEnabled } from "./alerts-model";
import { AlertRules, NewRuleMenu } from "./alerts-rules";
import { saveFilePayload } from "./config-file";
import { IslandTab } from "./island-tab";
import { isMuted, liveActions } from "./live-model";
import type { NavTarget } from "./studio-nav";

/** The tabs of Alerts & Island. "defaults" is no tab any more: a link to it opens the Defaults dialog. */
export type AlertsTab = "rules" | "island" | "defaults" | "history";

interface AlertsViewProps {
  tab: AlertsTab;
  onTab: (tab: AlertsTab) => void;
  config: DashboardConfig;
  setConfig: HistorySetter;
  /** The alerts the server holds now (the control channel). */
  active: ActiveAlert[];
  /** The runtime state (null while the server is unreachable): the mute. */
  control: ControlState | null;
  /** The live catalogue: summaries name sensors, presets pick one. */
  points: readonly DataPoint[];
  /** The stored screen and its page on the canvas. */
  screen: MonitorProfile;
  page: string;
  /** Edits the server does not have yet (Test waits). */
  pushPending: boolean;
  /** The rule open in the editor (view state); null = the first one. */
  editingId: string | null;
  onEdit: (id: string | null) => void;
  /** The sensor pickers' "Open data explorer". */
  onOpenSources: () => void;
  /** Show a widget on the canvas (its screen and page) and open its Behaviour tab. */
  onOpenZone: (profileId: string, pageId: string, zoneId: string) => void;
  navigateTo: (target: NavTarget) => void;
}

/** The mute (moved here from the sidebar's Live popover): an hour of no alerts on the kiosks, the time it ends in its place. */
function MuteToggle({ control }: { control: ControlState | null }) {
  const muted = isMuted(control, Date.now());
  const until = muted && control?.mutedUntil ? new Date(control.mutedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-body text-ui-2">
      {until ? `Muted until ${until}` : "Mute for 1 h"}
      <Toggle checked={muted} disabled={control === null} label="Mute alerts for 1 h" onChange={(next) => void liveActions.mute(next)} />
    </label>
  );
}

/**
 * Alerts & Island: the rules with what is active now, the island's settings and the history. Rules are config, so each
 * edit is an undo step; the live list is server state.
 */
export function AlertsView({ tab, onTab, config, setConfig, active, control, points, screen, page, pushPending, editingId, onEdit, onOpenSources, onOpenZone, navigateTo }: AlertsViewProps) {
  const alerts = alertsOf(config);
  const history = useAlertHistory(active);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [filter, setFilter] = useState<HistoryFilter>({ severity: "all", tests: true });
  // Old links and the palette still say Defaults.
  useEffect(() => {
    if (tab !== "defaults") return;
    setDefaultsOpen(true);
    onTab("rules");
  }, [tab, onTab]);
  const add = (rule: AlertRule) => {
    setConfig((c) => addRule(c, rule), alertsKey(`add:${rule.id}`));
    onEdit(rule.id);
  };
  const tabs = [
    {
      value: "rules" as const,
      label: (
        <span className="flex items-center gap-2">
          Alerts
          {active.length > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ui-danger/15 px-1 text-micro font-medium text-ui-danger">{active.length}</span>}
        </span>
      ),
    },
    { value: "island" as const, label: "Island" },
    { value: "history" as const, label: "History" },
  ];
  const exportCsv = () => void saveFilePayload({ name: "alert-history.csv", text: historyCsv(filterHistory(history, filter), config.profiles) });
  return (
    <section aria-label="Alerts & Island" className="flex min-h-0 min-w-0 flex-1 flex-col bg-ui-app font-ui">
      <div className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-x-7 border-b border-ui-subtle px-7 max-sm:gap-x-3 max-sm:px-3">
        <h1 className="whitespace-nowrap text-head font-medium text-ui-1">Alerts &amp; Island</h1>
        <Tabs label="Alerts & Island" tabs={tabs} value={tab === "defaults" ? "rules" : tab} onChange={onTab} className="gap-6 self-stretch border-b-0 max-sm:order-last max-sm:w-full [&>button]:h-auto" />
        <span className="flex-1" />
        <MuteToggle control={control} />
        {tab === "rules" && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 whitespace-nowrap text-body text-ui-2">
              Alerts on
              <Toggle checked={alerts.enabled} label="Alerts on" onChange={(on) => setConfig((c) => setAlertsEnabled(c, on), alertsKey("enabled"))} />
            </label>
            <span aria-hidden className="h-5 w-px bg-ui-subtle" />
            <Button variant="ghost" icon={<SlidersHorizontal aria-hidden />} onClick={() => setDefaultsOpen(true)}>Defaults</Button>
            <NewRuleMenu onAdd={add} points={points} />
          </div>
        )}
        {tab === "history" && (
          <Button variant="ghost" icon={<Download aria-hidden />} onClick={exportCsv}>Export CSV</Button>
        )}
      </div>
      {(tab === "rules" || tab === "defaults") && (
        <AlertRules
          config={config}
          setConfig={setConfig}
          active={active}
          history={history}
          points={points}
          current={{ profile: screen.id, page }}
          pushPending={pushPending}
          editingId={editingId}
          onEdit={onEdit}
          onOpenSources={onOpenSources}
        />
      )}
      {tab === "island" && <IslandTab config={config} setConfig={setConfig} current={screen} onOpenZone={onOpenZone} onOpenExplorer={onOpenSources} navigateTo={navigateTo} />}
      {tab === "history" && <AlertsHistory history={history} profiles={config.profiles} filter={filter} onFilter={setFilter} />}
      <AlertDefaults open={defaultsOpen} onOpenChange={setDefaultsOpen} alerts={alerts} setConfig={setConfig} />
    </section>
  );
}
