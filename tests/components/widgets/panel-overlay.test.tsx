// The overlay panel on a light pack (L67): the pack's text cannot sit on the black scrim, so it takes the card's tokens (its plates
// are `overlayCss`). A dark pack and Classic keep the theme's tokens.
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { newPanel, newWidget, type WidgetKind } from "@/lib/layout";
import { PanelView } from "@/components/widgets/PanelView";
import { loadPack } from "@/looks/pack-load";
import type { Pack } from "@/looks/pack";

const worn = vi.hoisted(() => ({ pack: undefined as unknown }));
vi.mock("@/looks/pack", async (real) => ({ ...(await real<typeof import("@/looks/pack")>()), usePack: () => worn.pack as Pack | undefined }));

const sensors = fixtureSensors();
const overlay = (...list: WidgetKind[]) => ({ ...newPanel("Skin"), layout: "overlay" as const, widgets: list.map((k, i) => ({ ...newWidget(k), visible: true, label: k, color: i ? undefined : "#ffffff" })) });
const draw = async (id?: string) => {
  worn.pack = id && (await loadPack(id));
  return renderToString(<PanelView panel={overlay("stat", "bar")} sensors={sensors} settings={id ? { lookId: id } : {}} />);
};

afterEach(() => void (worn.pack = undefined));

describe("an overlay panel", () => {
  it("on a light pack takes the card's tokens and loses a white item", async () => {
    const html = await draw("paper");
    expect(html).toContain("--card:0 0% 100%");
    expect(html).not.toContain("#ffffff");
  });

  it("on a dark pack keeps the theme's tokens and its own item colours", async () => {
    const html = await draw("swiss-mono");
    expect(html).not.toContain("--card:");
    expect(html).toContain("#ffffff");
  });

  it("on Classic has no card token", async () => {
    expect(await draw()).not.toContain("--card:");
  });
});
