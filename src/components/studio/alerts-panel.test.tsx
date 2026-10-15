import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActiveAlert, AlertRule } from "@/lib/alerts";
import { defaultConfig } from "@/lib/layout";
import { addRule } from "./alerts-model";
import { AlertsPanel, type AlertsPanelProps } from "./alerts-panel";
import { buildCommands, type CommandState } from "./commands";

const rule: AlertRule = {
  id: "r1",
  name: "GPU hot",
  enabled: true,
  severity: "critical",
  source: { kind: "sensor", key: "gpu.temp", op: ">", value: 80, forSeconds: 10 },
  cooldownSeconds: 60,
  outputs: {},
};
const alert: ActiveAlert = {
  id: "a1",
  ruleId: "r1",
  name: "GPU hot",
  severity: "critical",
  text: "GPU hot: 91 °C",
  startedAt: Date.now(),
  acknowledged: false,
  display: { style: "toast", position: "top-right", backdrop: "none", size: "m", seconds: 8 },
};

const html = (over: Partial<AlertsPanelProps> = {}) =>
  renderToString(
    <AlertsPanel
      config={defaultConfig()}
      setConfig={() => {}}
      active={[]}
      points={[{ key: "gpu.temp", name: "GPU Temperature", unit: "°C" } as AlertsPanelProps["points"][number]]}
      current={{ profile: "p", page: "main" }}
      pushPending={false}
      editingId={null}
      onEdit={() => {}}
      onOpenSources={() => {}}
      {...over}
    />
  );

describe("AlertsPanel", () => {
  it("shows the empty state and the master switch", () => {
    const out = html();
    expect(out).toContain("No alert rules yet");
    expect(out).toContain("Alerts enabled");
    expect(out).toContain("Nothing active.");
    expect(out).toContain("Global defaults");
  });

  it("lists rules with their summary and last-fired line", () => {
    const out = html({ config: addRule(defaultConfig(), rule) });
    expect(out).toContain("GPU hot");
    expect(out).toContain("GPU Temperature &gt; 80 °C for 10 s");
    expect(out).toContain("Never fired");
    expect(out).not.toContain("No alert rules yet");
  });

  it("lists the active alerts with Acknowledge and Dismiss", () => {
    const out = html({ active: [alert] });
    expect(out).toContain("GPU hot: 91 °C");
    expect(out).toContain("Acknowledge");
    expect(out).toContain("Dismiss");
  });
});

describe("alert commands", () => {
  const state: CommandState = {
    insertables: [],
    profiles: [],
    pages: [],
    currentPage: "main",
    placements: [],
    selected: null,
    context: null,
    widget: null,
    canPasteWidget: false,
    canUndo: false,
    canRedo: false,
    showGrid: true,
    showSources: false,
    enforced: false,
    appearancePresets: [],
  };
  it("offers opening alerts and a new rule", () => {
    const list = buildCommands(state);
    expect(list.find((c) => c.id === "alerts-open")).toMatchObject({ label: "Open alerts", action: { type: "alerts-open" } });
    expect(list.find((c) => c.id === "alert-new")).toMatchObject({ label: "New alert rule", action: { type: "alert-new" } });
    expect(list.map((c) => c.id)).toContain("drawer:alerts");
  });
});
