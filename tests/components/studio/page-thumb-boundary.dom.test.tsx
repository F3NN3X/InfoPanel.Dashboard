// @vitest-environment happy-dom
// A thumbnail that fails to render (or whose chunk fails to load) leaves the Edit page tabs working.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageTabs } from "@/components/studio/page-tabs";
import { THUMB_DELAY_MS } from "@/components/studio/page-thumb";
import type { MonitorProfile } from "@/lib/layout";

// The chunk test runs first: the factory result is cached once the import succeeds.
// "render" throws while drawing; "chunk" rejects the import; "ok" draws the thumbnail.
const thumb = vi.hoisted(() => ({ mode: "render" as "render" | "chunk" | "ok" }));
vi.mock("@/components/studio/page-thumb-card", () => {
  if (thumb.mode === "chunk") throw new Error("chunk failed");
  return {
    default: () => {
      if (thumb.mode === "render") throw new Error("thumbnail failed");
      return <div data-testid="page-thumb" />;
    },
  };
});

const profile = {
  id: "p1",
  name: "Desk",
  width: 1920,
  height: 1080,
  cols: 12,
  rows: 8,
  fit: "fill",
  pages: [
    { id: "a", name: "Main", placements: [] },
    { id: "b", name: "Extra", placements: [] },
  ],
} as unknown as MonitorProfile;
const noop = vi.fn();

describe("page tab thumbnail failure", () => {
  beforeEach(() => {
    thumb.mode = "render";
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mount = () =>
    render(
      <PageTabs
        leftOpen
        onToggleLeft={noop}
        pages={profile.pages}
        current="a"
        onSelect={noop}
        onAdd={noop}
        onRename={noop}
        onMove={noop}
        onDuplicate={noop}
        onDelete={noop}
        onIcon={noop}
        onPageSettings={noop}
        renamingId={null}
        onRenamingChange={noop}
        deletingId={null}
        onDeletingChange={noop}
        thumbProfile={profile}
      />
    );
  const hover = async (name: RegExp) => {
    fireEvent.pointerEnter(screen.getByRole("tab", { name }));
    await act(async () => void vi.advanceTimersByTime(THUMB_DELAY_MS + 10));
    await act(async () => {});
  };

  it("loads the thumbnail on a later hover after the chunk import failed", async () => {
    thumb.mode = "chunk";
    mount();
    await hover(/Extra/);
    expect(screen.queryByTestId("page-thumb")).toBeNull();
    expect(screen.getByRole("tab", { name: /Main/ })).toBeTruthy();
    thumb.mode = "ok";
    fireEvent.pointerLeave(screen.getByRole("tab", { name: /Extra/ }));
    await hover(/Main/);
    expect(screen.getByTestId("page-thumb")).toBeTruthy();
  });

  it("leaves the tabs rendered", async () => {
    mount();
    await hover(/Extra/);
    expect(screen.queryByTestId("page-thumb")).toBeNull();
    expect(screen.getByRole("tab", { name: /Extra/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Main/ })).toBeTruthy();
  });
});
