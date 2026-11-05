// @vitest-environment happy-dom
// Screens' Live column (Q9) and the page's own controls: a card per kiosk, its switcher and rotation acting on the
// screen, a named display's screen choice, the settings drawer, the search keys and the grid or list toggle.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { ControlDisplay, ControlKiosk, ControlState } from "@/lib/control";
import type { DashboardConfig } from "@/lib/layout";

const api = vi.hoisted(() => ({ postControl: vi.fn(async () => null) }));
vi.mock("@/lib/control", async (importOriginal) => ({ ...(await importOriginal<object>()), postControl: api.postControl }));
vi.mock("@/components/studio/screen-detail", () => ({ ScreenDetail: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>detail</button> }));
vi.mock("@/components/studio/screens/screen-thumb", () => ({ ScreenThumb: () => null }));

import { ScreensView } from "@/components/studio/screens-view";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("[]", { status: 200 }))));
});
afterEach(() => vi.clearAllMocks());

const page = (id: string, name: string) => ({ id, name, placements: [] });
const main = { id: "p1", name: "Main", width: 1600, height: 900, cols: 12, rows: 8, fit: "fill", rotate: { enabled: true, seconds: 30 }, pages: [page("a", "Page A"), page("b", "Page B")] };
const desk = { id: "p2", name: "Desk", width: 1920, height: 550, cols: 12, rows: 4, fit: "fill", pages: [page("c", "Only")] };
const config = { profiles: [main, desk] } as unknown as DashboardConfig;

const kiosk = (over: Partial<ControlKiosk>): ControlKiosk => ({ id: "k1", profile: "p1", page: "a", address: "192.168.1.24", since: Date.now() - 2 * 3_600_000, ...over });
const display: ControlDisplay = { name: "wall", screen: "p1", firstSeen: 0, lastSeen: Date.now(), online: true, address: null, shows: "p1" };

function view(over: Record<string, unknown> = {}) {
  const props = {
    config,
    profile: { ...main, pageId: "a", placements: [] },
    windowSize: { width: 1600, height: 1000 },
    autoProfileId: "p1",
    kiosks: [],
    displays: [],
    control: null,
    onOpenKioskView: vi.fn(),
    onSettingsHandled: vi.fn(),
    onDuplicateProfile: vi.fn(),
    onRemoveProfile: vi.fn(),
    onUndo: vi.fn(),
    onOpenSaved: vi.fn(),
    onNew: vi.fn(),
    updateProfile: vi.fn(),
    setConfig: vi.fn(),
    onRotate: vi.fn(),
    onPerformance: vi.fn(),
    onMovePage: vi.fn(),
    onAddPage: vi.fn(),
    onOpenPage: vi.fn(),
    onOpenLive: vi.fn(),
    navigateTo: vi.fn(),
    onOpenScreen: vi.fn(),
    onOpenScreenPage: vi.fn(),
    onConvertScreen: vi.fn(),
    ...over,
  } as unknown as Parameters<typeof ScreensView>[0];
  render(
    <ToastProvider>
      <ScreensView {...props} />
    </ToastProvider>,
  );
  return props;
}

const live = () => screen.getByRole("region", { name: "Live on displays" });

describe("Live on displays", () => {
  it("says so when no display is connected, and still offers the kiosk address", () => {
    view();
    expect(within(live()).getByText("No display is connected.")).toBeTruthy();
    expect(within(live()).getByRole("region", { name: "Add a display" }).textContent).toContain("?kiosk=1");
  });

  it("has a card per kiosk and states only what the server reports", () => {
    view({ kiosks: [kiosk({}), kiosk({ id: "k2", display: "wall", profile: "p2", page: "c" })], displays: [display] });
    const cards = within(live()).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("Kiosk · 192.168.1.24");
    expect(cards[0].textContent).toContain("connected 2 h");
    expect(cards[1].textContent).toContain("wall");
    expect(live().textContent).not.toMatch(/browser|ethernet|wi-?fi/i);
  });

  it("switches the page of the screen the kiosk shows, and the screen of a named display only", () => {
    view({ kiosks: [kiosk({}), kiosk({ id: "k2", display: "wall" })], displays: [display] });
    fireEvent.change(screen.getAllByLabelText("Page of Main")[0], { target: { value: "b" } });
    expect(api.postControl).toHaveBeenCalledWith("page", { profile: "p1", page: "b" });
    expect(screen.queryByLabelText("Screen for Kiosk · 192.168.1.24")).toBeNull();
    fireEvent.change(screen.getByLabelText("Screen for wall"), { target: { value: "p2" } });
    expect(api.postControl).toHaveBeenCalledWith("display", { action: "assign", display: "wall", screen: "p2" });
  });

  it("pauses the screen's rotation from the card, and can't on a one-page screen", () => {
    const state = { profiles: { p1: { rotating: true } } } as unknown as ControlState;
    view({ kiosks: [kiosk({}), kiosk({ id: "k2", profile: "p2", page: "c" })], control: state });
    fireEvent.click(screen.getByRole("button", { name: "Rotation for Main: 30 s" }));
    expect(api.postControl).toHaveBeenCalledWith("rotate", { profile: "p1", state: "off" });
    expect((screen.getByRole("button", { name: "Rotation for Desk: One page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the screen's settings on Rotation from the card menu, and keeps Forget display for a named one", () => {
    const props = view({ kiosks: [kiosk({ display: "wall" })], displays: [display] });
    fireEvent.click(screen.getByRole("button", { name: "Display actions, wall" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Forget display" }));
    expect(api.postControl).toHaveBeenCalledWith("display", { action: "forget", display: "wall" });
    fireEvent.click(screen.getByRole("button", { name: "Display actions, wall" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Rotation settings…" }));
    expect(props.navigateTo).toHaveBeenCalledWith({ view: "screens", profileId: "p1", section: "rotation" });
  });

  it("keeps an offline named display reachable to forget", () => {
    view({ displays: [{ ...display, online: false }] });
    fireEvent.click(screen.getByRole("button", { name: "Forget" }));
    expect(api.postControl).toHaveBeenCalledWith("display", { action: "forget", display: "wall" });
  });

  it("counts displays in the header and on the card of the screen they show", () => {
    view({ kiosks: [kiosk({}), kiosk({ id: "k2" })] });
    expect(screen.getByText("2 screens · 2 displays live")).toBeTruthy();
    expect(screen.getByText("On 2 displays")).toBeTruthy();
  });
});

describe("Your screens", () => {
  it("has a search whose placeholder is not cut off, and / and Ctrl+F go to it", () => {
    view();
    const search = screen.getByRole("searchbox", { name: "Search screens" }) as HTMLInputElement;
    expect(search.placeholder).toBe("Search screens");
    fireEvent.keyDown(window, { key: "/" });
    expect(document.activeElement).toBe(search);
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(document.activeElement).toBe(search);
  });

  it("leaves / to a field that is being typed in", () => {
    view();
    const search = screen.getByRole("searchbox", { name: "Search screens" });
    const other = document.createElement("input");
    document.body.append(other);
    other.focus();
    fireEvent.keyDown(other, { key: "/" });
    expect(document.activeElement).toBe(other);
    expect(document.activeElement).not.toBe(search);
    other.remove();
  });

  it("opens a screen by its card and its settings from the menu, and remembers the list layout", () => {
    const props = view();
    fireEvent.click(screen.getByRole("button", { name: "Open Desk" }));
    expect(props.onOpenScreen).toHaveBeenCalledWith("p2");
    const deskCard = screen.getAllByRole("listitem").find((c) => c.textContent?.includes("Desk") && c.textContent.includes("1920"))!;
    fireEvent.contextMenu(deskCard, { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Screen settings…" }));
    expect(props.navigateTo).toHaveBeenCalledWith({ view: "screens", profileId: "p2", section: undefined });

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(localStorage.getItem("screens.list")).toBe("1");
    expect(screen.getByRole("list", { name: "Your screens" }).tagName).toBe("UL");
    expect(screen.queryByText("From a template, a size preset or an .infopanel file")).toBeNull();
  });

  it("opens the settings drawer for a request, once, and Esc closes it", () => {
    const props = view({ settingsRequest: { id: "p1", seq: 1 } });
    expect(props.onSettingsHandled).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog", { name: "Screen settings" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Screen settings" })).toBeNull();
  });
});
