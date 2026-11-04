// @vitest-environment happy-dom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { unregisterPack, registerPack } from "@/looks/pack-load";
import type { ShellProps, WidgetMeta } from "@/widgets/core/types";
import { templateModule } from "@/widgets/module";
import { TEST_PACK } from "../looks/__fixtures__/test-pack";

const meta: WidgetMeta = { id: "demo", name: "Demo", category: "System", icon: "memory", prefixes: ["demo."], defaultSize: [4, 3], minSize: [3, 2], description: "" };
let slots: ShellProps["slots"];
const Demo = (p: ShellProps) => {
  slots = p.slots;
  return null;
};
const mod = templateModule({ meta, Component: Demo, settings: [], toProps: () => ({}) });
const sensors = { "demo.a": { value: 1, unit: "W" } };

afterEach(() => {
  cleanup();
  unregisterPack("test-pack");
  slots = undefined;
});

describe("the widget decoration opt-out (D19, L7)", () => {
  it("keeps the pack's ornament and tab band by default", async () => {
    registerPack("test-pack", async () => ({ default: TEST_PACK }));
    render(mod.render(sensors, { lookId: "test-pack" }) as never);
    await waitFor(() => expect(slots?.ornament).toBeDefined());
    expect(slots?.tabBand).toBeDefined();
  });

  it("drops them, and keeps the icon set, when the widget turns decoration off", async () => {
    registerPack("test-pack", async () => ({ default: TEST_PACK }));
    render(mod.render(sensors, { lookId: "test-pack", decoration: false }) as never);
    await waitFor(() => expect(slots?.icons).toBeDefined());
    expect(slots?.ornament).toBeUndefined();
    expect(slots?.tabBand).toBeUndefined();
  });
});
