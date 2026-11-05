// @vitest-environment happy-dom
// Create alert on a Data point opens a draft rule: it shows in the editor, nothing is written until the first edit, and that edit
// adds the rule and changes it in one history step.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertRules } from "@/components/studio/alerts-rules";
import { alertsOf } from "@/components/studio/alerts-model";
import { blankSensorRule } from "@/lib/alert-presets";
import { defaultConfig } from "@/lib/layout";

// The sensor picker in the editor opens the live store, which wants an EventSource.
vi.stubGlobal("EventSource", class { addEventListener() {} close() {} onerror = null; onmessage = null; });

afterEach(cleanup);

const draft = { ...blankSensorRule(), id: "alert-draft", name: "CPU alert", source: { kind: "sensor" as const, conditions: [{ key: "cpu.temp", op: ">" as const, value: 80 }], forSeconds: 0 } };

/** A history setter that applies each edit at once, as the studio's does (the edit reads the input while the event is live). */
function mount() {
  const config = defaultConfig();
  let after = config;
  const setConfig = vi.fn((action: unknown) => {
    after = (action as (c: typeof config) => typeof config)(config);
  });
  render(
    <AlertRules
      config={config}
      setConfig={setConfig}
      active={[]}
      history={[]}
      points={[]}
      current={{ profile: config.profiles[0].id, page: config.profiles[0].pages[0].id }}
      pushPending={false}
      editingId={draft.id}
      onEdit={() => {}}
      draft={draft}
      onOpenSources={() => {}}
    />
  );
  return { config, setConfig, after: () => after };
}

describe("a draft alert rule", () => {
  it("is open in the editor and saves nothing until it is edited", () => {
    const { config, setConfig } = mount();
    expect((screen.getByLabelText("Rule name") as HTMLInputElement).value).toBe("CPU alert");
    expect(setConfig).not.toHaveBeenCalled();
    expect(alertsOf(config).rules).toEqual([]);
  });

  it("is added with the first edit, as one step", () => {
    const { setConfig, after } = mount();
    fireEvent.change(screen.getByLabelText("Rule name"), { target: { value: "CPU too hot" } });
    expect(setConfig).toHaveBeenCalledTimes(1);
    const rules = alertsOf(after()).rules;
    expect(rules.map((r) => [r.id, r.name])).toEqual([["alert-draft", "CPU too hot"]]);
    expect(rules[0].source).toEqual(draft.source);
  });
});
