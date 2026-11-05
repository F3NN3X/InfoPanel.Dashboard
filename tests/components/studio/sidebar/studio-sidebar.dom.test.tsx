// @vitest-environment happy-dom
// The sidebar's behaviour: collapse per area in local flags (Q18), the rail under 960 px (Q6), Help and shortcuts (Q5),
// the attention rows (Q3), and the Data API card: its three states, and the address written through the one setter (G1).
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioSidebar, { SIDEBAR_EDITOR_KEY, SIDEBAR_WORKSPACE_KEY } from "@/components/studio/sidebar/studio-sidebar";
import { ToastProvider } from "@/components/ui/toast";
import type { DashboardConfig } from "@/lib/layout";
import { sidebarStatus } from "./status";

const config = { dataApiUrl: "http://127.0.0.1:3921", profiles: [] } as unknown as DashboardConfig;

function renderSidebar(props: Partial<ComponentProps<typeof StudioSidebar>> = {}) {
  const all = {
    active: "screens" as const,
    onSelect: vi.fn(),
    screenName: "Desk",
    alerts: 0,
    windowWidth: 1600,
    editing: false,
    status: sidebarStatus(),
    config,
    onAddress: vi.fn(),
    onNavigate: vi.fn(),
    onHelp: vi.fn(),
    onShortcuts: vi.fn(),
    onPalette: vi.fn(),
    ...props,
  };
  return { ...all, ...render(<ToastProvider><StudioSidebar {...all} /></ToastProvider>) };
}

const width = () => screen.getByRole("complementary", { name: "Studio sidebar" }).className;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("collapse", () => {
  it("opens expanded on workspace pages and on the rail in the editor, the first time", () => {
    const { unmount } = renderSidebar();
    expect(width()).toContain("w-[232px]");
    unmount();
    renderSidebar({ editing: true });
    expect(width()).toContain("w-[60px]");
  });

  it("remembers the choice per area, in local flags", () => {
    const { unmount } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(localStorage.getItem(SIDEBAR_WORKSPACE_KEY)).toBe("1");
    expect(localStorage.getItem(SIDEBAR_EDITOR_KEY)).toBeNull();
    unmount();
    renderSidebar({ editing: true });
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(localStorage.getItem(SIDEBAR_EDITOR_KEY)).toBe("0");
    expect(localStorage.getItem(SIDEBAR_WORKSPACE_KEY)).toBe("1");
  });

  it("stays a rail below 960 px, with no toggle and without touching the flag", () => {
    localStorage.setItem(SIDEBAR_WORKSPACE_KEY, "0");
    renderSidebar({ windowWidth: 900 });
    expect(width()).toContain("w-[60px]");
    expect(screen.queryByRole("button", { name: /sidebar/ })).toBeNull();
    expect(localStorage.getItem(SIDEBAR_WORKSPACE_KEY)).toBe("0");
  });
});

describe("the views", () => {
  it("routes Continue editing to the editor", () => {
    const { onSelect } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Continue editing Desk" }));
    expect(onSelect).toHaveBeenCalledWith("design");
  });

  it("counts firing alerts on the rail item's name too", () => {
    renderSidebar({ alerts: 2 });
    expect(screen.getByRole("button", { name: "Alerts & Island, 2 active" })).toBeTruthy();
  });

  it("offers Help, the shortcut sheet, the palette and Settings", async () => {
    const { onHelp, onShortcuts, onPalette, onSelect } = renderSidebar();
    const pick = async (name: string) => {
      fireEvent.click(screen.getByRole("button", { name: "Help and shortcuts" }));
      fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${name}`) }));
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    };
    await pick("Help");
    await pick("Keyboard shortcuts");
    await pick("Search or run a command");
    await pick("Settings");
    expect(onHelp).toHaveBeenCalledTimes(1);
    expect(onShortcuts).toHaveBeenCalledTimes(1);
    expect(onPalette).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("settings");
  });
});

describe("the attention rows", () => {
  it("shows nothing when all is well", () => {
    renderSidebar();
    expect(screen.queryByRole("button", { name: /Restart|Update|Offline/ })).toBeNull();
  });

  it("carries the footer's items to their homes", () => {
    const { onNavigate } = renderSidebar({ status: sidebarStatus({}, { server: { kind: "desktop", port: 47911, phase: "restarting" }, update: "1.4.0", restartNeeded: true, save: "offline" }) });
    fireEvent.click(screen.getByRole("button", { name: "Update 1.4.0 available" }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: "settings", tab: "app", section: "updates" });
    fireEvent.click(screen.getByRole("button", { name: "Restart server to apply" }));
    expect(onNavigate).toHaveBeenLastCalledWith({ view: "settings", tab: "app", section: "server" });
    expect(screen.getByRole("button", { name: "Server · restarting" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Offline · edits kept locally" })).toBeTruthy();
  });
});

describe("the Data API card", () => {
  it.each([
    [{ link: "connected" as const }, "Data API: Connected · 2 ms"],
    [{ link: "reconnecting" as const, downMs: 3000 }, "Data API: Reconnecting · 3 s"],
    [{ link: "offline" as const, downMs: 120_000 }, "Data API: Offline · 2 min"],
  ])("names its state: %j", (health, name) => {
    renderSidebar({ status: sidebarStatus(health) });
    expect(screen.getByRole("button", { name })).toBeTruthy();
  });

  it("offers Retry when offline and Test connection otherwise", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    renderSidebar({ status: sidebarStatus({ link: "offline", downMs: 120_000 }) });
    fireEvent.click(screen.getByRole("button", { name: /^Data API/ }));
    expect(await screen.findByRole("button", { name: "Retry now" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Test connection" })).toBeNull();
    vi.unstubAllGlobals();
  });

  it("writes a valid address through onAddress once, normalized, and refuses an invalid one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const { onAddress } = renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /^Data API/ }));
    const field = (await screen.findByLabelText("Data API URL")) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "ftp://nope" } });
    act(() => field.blur());
    fireEvent.blur(field);
    expect(onAddress).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Enter an http(s) URL");
    fireEvent.change(field, { target: { value: "http://192.168.1.2:3921/" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onAddress).toHaveBeenCalledTimes(1);
    expect(onAddress).toHaveBeenCalledWith("http://192.168.1.2:3921");
    vi.unstubAllGlobals();
  });
});
