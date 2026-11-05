// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeSession } from "@/lib/gauge-studio/session";
import { DEFAULT_THEME } from "@/lib/theme";
import type { StudioBridge } from "@/components/library/library-actions";
import { STARTERS } from "@/lib/infopanel/gauges/presets";
import { CUSTOM_GAUGE_ID, withGaugeName, type GaugeSource } from "@/lib/gauge-studio/model";
import type { DashboardConfig, Placement } from "@/lib/layout";
import { tableOf } from "@/lib/infopanel/assets/assets";
import { toStored } from "@/lib/infopanel/import/stored";
import { parseProfileXml } from "@/lib/infopanel/parse";
import GaugesPage from "@/components/gauges/gauges-page";

// Only the network edge is replaced: the library list and the item write behind "Save to library".
const saved = vi.hoisted(() => ({
  id: "g1",
  kind: "gauge",
  name: "Saved ring",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  files: [],
  meta: {},
  copies: [],
  data: { vector: undefined as unknown, frames: undefined as unknown, min: 0, max: 100, animationSpeed: 0 },
}));
const library = vi.hoisted(() => ({
  listLibrary: vi.fn(async () => [saved]),
  createLibraryItem: vi.fn(async (body: { name: string }) => ({ id: "new1", kind: "gauge", name: body.name, files: [], copies: [] })),
  getLibraryItem: vi.fn(async (id: string) => ({ ...saved, id })),
  updateLibraryItem: vi.fn(async (id: string, patch: { name?: string }) => ({ id, kind: "gauge", name: patch.name ?? "x", files: [], copies: [] })),
  deleteLibraryItem: vi.fn(async () => {}),
}));
vi.mock("@/lib/library", async (importOriginal) => ({ ...(await importOriginal<object>()), ...library }));

const bridge = {
  config: { profiles: [], panelPresets: [], stylePresets: [] },
  profile: { id: "p", name: "Main", placements: [] },
  profileId: "p",
  setConfig: vi.fn(),
  updateProfile: vi.fn(),
  selection: [],
  select: vi.fn(),
  toast: vi.fn(),
  addCopy: vi.fn(),
} as unknown as StudioBridge;

/** The studio clears `initial` once the page took it (`onOpened`); this host does the same, so a taken gauge isn't opened again. */
function Host({ b, initial, onOpened }: { b: StudioBridge; initial: GaugeSource | null; onOpened: () => void }) {
  const [taken, setTaken] = useState<GaugeSource | null>(null);
  return (
    <GaugesPage
      bridge={b}

      theme={DEFAULT_THEME}
      initial={initial === taken ? null : initial}
      onOpened={() => {
        setTaken(initial);
        onOpened();
      }}
      onShowCanvas={vi.fn()}
      onOpenZone={vi.fn()}
      onOpenRule={vi.fn()}
      onOpenSources={vi.fn()}
    />
  );
}
const pageOf = (b: StudioBridge, initial: GaugeSource | null, onOpened = vi.fn()) => <Host b={b} initial={initial} onOpened={onOpened} />;
const renderPage = (b: StudioBridge = bridge, initial: GaugeSource | null = null) => render(pageOf(b, initial));

const openNewGauge = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole("button", { name: /new gauge/i }));
  return screen.findByRole("textbox", { name: "Gauge name" });
};

/** A part switch the editor lets you flip (the always-on ones are disabled). */
const flippable = () => within(screen.getByRole("navigation", { name: "Parts" })).getAllByRole("switch").filter((s) => !(s as HTMLButtonElement).disabled);

beforeEach(() => {
  saved.data.vector = STARTERS[0].gauge;
  saved.data.frames = undefined;
  closeSession();
  for (const fn of Object.values(library)) fn.mockClear();
});

describe("Gauges page", () => {

  describe("a draft saved as you edit (P-3)", () => {
    const edited = async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await openNewGauge(user);
      await user.click(flippable()[0]);
      return user;
    };
    const draftMade = () => waitFor(() => expect(library.createLibraryItem).toHaveBeenCalledTimes(1), { timeout: 3000 });

    it("saves the first edit to the library as a draft, and leaving never asks", async () => {
      const user = await edited();
      await user.click(screen.getByRole("button", { name: "Back to Gauges" }));
      await waitFor(() => expect(screen.queryByRole("textbox", { name: "Gauge name" })).toBeNull());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(library.createLibraryItem).toHaveBeenCalledWith(expect.objectContaining({ kind: "gauge", name: "New gauge" }));
    });

    it("keeps one item: the next edit updates the draft instead of making another", async () => {
      const user = await edited();
      await draftMade();
      await user.click(flippable()[1]);
      await user.click(screen.getByRole("button", { name: "Back to Gauges" }));
      await waitFor(() => expect(screen.queryByRole("textbox", { name: "Gauge name" })).toBeNull());
      expect(library.createLibraryItem).toHaveBeenCalledTimes(1);
      expect(library.updateLibraryItem).toHaveBeenCalledWith("new1", expect.objectContaining({ name: "New gauge" }));
    });

    it("makes nothing until something is edited", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await openNewGauge(user);
      await user.click(screen.getByRole("button", { name: "Back to Gauges" }));
      await waitFor(() => expect(screen.queryByRole("textbox", { name: "Gauge name" })).toBeNull());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(library.createLibraryItem).not.toHaveBeenCalled();
    });

    it("Discard draft deletes the item and closes the editor", async () => {
      const user = await edited();
      await draftMade();
      await user.click(screen.getByRole("button", { name: "More gauge actions" }));
      await user.click(await screen.findByRole("menuitem", { name: "Discard draft" }));
      await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Discard draft" }));
      await waitFor(() => expect(library.deleteLibraryItem).toHaveBeenCalledWith("new1"));
      await waitFor(() => expect(screen.queryByRole("textbox", { name: "Gauge name" })).toBeNull());
    });

    it("leaving the page mid-write and coming back updates the one draft instead of making another", async () => {
      // The create is still in flight when the page is left and opened again.
      library.createLibraryItem.mockImplementationOnce(async (body: { name: string }) => {
        await new Promise((r) => setTimeout(r, 300));
        return { id: "new1", kind: "gauge", name: body.name, files: [], copies: [] };
      });
      const user = userEvent.setup({ delay: null });
      const view = renderPage();
      await openNewGauge(user);
      await user.click(flippable()[0]);
      view.unmount();
      renderPage();
      await screen.findByRole("textbox", { name: "Gauge name" });
      await waitFor(() => expect(library.updateLibraryItem).toHaveBeenCalledWith("new1", expect.anything()), { timeout: 4000 });
      expect(library.createLibraryItem).toHaveBeenCalledTimes(1);
    });

    it("writes nothing more after Discard in the Unsaved dialog", async () => {
      library.createLibraryItem.mockRejectedValueOnce(new Error("disk full"));
      const user = await edited();
      await user.click(screen.getByRole("button", { name: "Back to Gauges" }));
      await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Discard" }));
      await waitFor(() => expect(screen.queryByRole("textbox", { name: "Gauge name" })).toBeNull());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200));
      });
      expect(library.createLibraryItem).toHaveBeenCalledTimes(1);
    });

    it("asks as before when the draft could not be written", async () => {
      library.createLibraryItem.mockRejectedValueOnce(new Error("disk full"));
      const user = await edited();
      await user.click(screen.getByRole("button", { name: "Back to Gauges" }));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("textbox", { name: "Gauge name" })).toBeTruthy();
    });
  });

  describe("Add to canvas for an image sequence", () => {
    const profile = parseProfileXml("<Profile><Name>P</Name><Width>800</Width><Height>400</Height></Profile>").profile;
    const canvas = toStored({ name: "Rig", origin: "file", dataApi: null, defaultMode: "infopanel", profile, items: [], fonts: [], assets: tableOf([]), keyOf: () => null });
    const zone = { id: "z1", module: "infopanel", colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1, visible: true, canvas } as Placement;
    const withZones = (placements: Placement[]) => {
      const config = { profiles: [{ id: "p", pages: [{ id: "pg", placements }] }], panelPresets: [], stylePresets: [] } as unknown as DashboardConfig;
      return { ...bridge, config, profile: { id: "p", name: "Main", pageId: "pg", placements }, setConfig: vi.fn() } as unknown as StudioBridge;
    };
    const openSequence = async (b: StudioBridge) => {
      const user = userEvent.setup({ delay: null });
      saved.data.vector = undefined;
      saved.data.frames = [{ id: `${"a".repeat(64)}.png`, name: "1.png" }, { id: `${"b".repeat(64)}.png`, name: "2.png" }];
      renderPage(b);
      const mine = await screen.findByRole("region", { name: "Saved in your library" });
      await user.click(await within(mine).findByRole("button", { name: /Saved ring/ }));
      const details = await screen.findByRole("complementary", { name: "Gauge details" });
      return { user, add: within(details).getByRole("button", { name: "Add to canvas" }) as HTMLButtonElement, details };
    };

    it("lists the page's canvas zones and inserts the sequence into the one picked", async () => {
      const b = withZones([zone]);
      const { user, add, details } = await openSequence(b);
      expect(add.disabled).toBe(false);
      await user.click(add);
      await user.click(within(within(details).getByRole("group", { name: "Canvas zones" })).getByRole("button", { name: "Rig" }));
      await act(async () => {});
      expect(b.setConfig).toHaveBeenCalledTimes(1);
      const next = (b.setConfig as ReturnType<typeof vi.fn>).mock.calls[0][0](b.config) as DashboardConfig;
      const stored = next.profiles[0].pages[0].placements[0].canvas!;
      expect(stored.assets.map((a) => a.name)).toEqual(["1.png", "2.png"]);
    });

  });

  describe("renaming a profile gauge", () => {
    const widget: Placement = { id: "w1", module: CUSTOM_GAUGE_ID, colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, visible: true, settings: { label: "CPU" } };
    const config = { profiles: [{ id: "p", name: "Main", pages: [{ id: "pg", placements: [widget] }] }] } as unknown as DashboardConfig;
    const profileBridge = { ...bridge, config, profile: { id: "p", name: "Main", placements: [widget] }, setConfig: vi.fn() } as unknown as StudioBridge;

    it("is editable in the header and writes the widget's label through the config", async () => {
      const user = userEvent.setup({ delay: null });
      renderPage(profileBridge, { kind: "widget", zoneId: "w1" });
      const name = (await screen.findByRole("textbox", { name: "Gauge name" })) as HTMLInputElement;
      expect(name.disabled).toBe(false);
      expect(name.value).toBe("CPU");
      await user.type(name, "!");
      const update = vi.mocked(profileBridge.setConfig).mock.calls.at(-1)![0] as (c: DashboardConfig) => DashboardConfig;
      expect(update(config).profiles[0].pages[0].placements[0].settings?.label).toBe("CPU!");
      expect(withGaugeName(config, { kind: "preset", index: 0 }, "x")).toBeNull();
    });

  });

  describe("Edit gauge… over a working copy", () => {
    it("saves the draft, then opens the requested gauge without asking", async () => {
      const user = userEvent.setup({ delay: null });
      const onOpened = vi.fn();
      const view = render(pageOf(bridge, null, onOpened));
      await openNewGauge(user);
      await user.click(flippable()[0]);
      view.rerender(pageOf(bridge, { kind: "preset", index: 0 }, onOpened));
      await waitFor(() => expect((screen.getByRole("textbox", { name: "Gauge name" }) as HTMLInputElement).value).toContain("copy"));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(library.createLibraryItem).toHaveBeenCalledWith(expect.objectContaining({ name: "New gauge" }));
    });
  });

});
