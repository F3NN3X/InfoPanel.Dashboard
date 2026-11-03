// @vitest-environment happy-dom
// A data tick re-renders a template zone, but an unchanged look must keep its identity: the skin context and the
// widget's style hang off it, so a fresh look each tick re-renders every skin consumer on the page.
import { act, render } from "@testing-library/react";
import { memo, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { ModuleSettings } from "@/modules/types";
import { Widget } from "@/widgets/core/Widget";
import { useSkin } from "@/widgets/core/theme";
import type { ShellProps, WidgetMeta } from "@/widgets/core/types";
import { shellProps, templateModule } from "@/widgets/module";

const meta: WidgetMeta = { id: "demo", name: "Demo", category: "System", icon: "memory", prefixes: ["demo."], defaultSize: [4, 3], minSize: [3, 2], description: "A demo template" };

const counts = { consumer: 0, root: 0 };
const skins = new Set<unknown>();
const Consumer = memo(function Consumer() {
  counts.consumer++;
  skins.add(useSkin());
  return null;
});
function Demo(p: ShellProps & { look?: ModuleSettings; data?: unknown }): ReactNode {
  counts.root++;
  return (
    <Widget title="Demo" icon="memory" {...shellProps(p.look!)} look={p.look}>
      <Consumer />
    </Widget>
  );
}
const mod = templateModule({ meta, Component: Demo as never, settings: [], toProps: () => ({}) });
const ZONES = 20;
const tick = (n: number) => ({ "demo.a": { value: n, unit: "W" } });
const page = (n: number, saved: () => ModuleSettings) => (
  <>{Array.from({ length: ZONES }, (_, i) => <div key={i}>{mod.render(tick(n), saved())}</div>)}</>
);

describe("template zone look", () => {
  it.each([
    ["the same saved values", () => { const s = { skin: "tui", accent: "#ff8800" }; return () => s; }],
    ["a fresh but equal copy of the saved values each render", () => () => ({ skin: "tui", accent: "#ff8800" })],
  ])("keeps the skin context across a data tick with %s", (_name, make) => {
    const saved = make();
    counts.consumer = counts.root = 0;
    skins.clear();
    const view = render(page(1, saved));
    expect(counts.consumer).toBe(ZONES);
    for (let n = 2; n <= 6; n++) act(() => view.rerender(page(n, saved)));
    expect(skins.size).toBe(ZONES);
    expect(counts.consumer).toBe(ZONES);
    expect(counts.root).toBe(ZONES * 6);
  });

  it("builds a new skin context when the look does change", () => {
    skins.clear();
    const view = render(page(1, () => ({ skin: "tui" })));
    act(() => view.rerender(page(2, () => ({ skin: "tui", accent: "#112233" }))));
    expect(skins.size).toBe(ZONES * 2);
  });
});
