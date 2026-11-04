// @vitest-environment happy-dom
// The Look gallery loads each Look on its own: one that fails shows an error card with Retry, the rest still list.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LookGallery } from "@/components/studio/look-gallery";
import { CLASSIC } from "@/looks";

const loadLook = vi.fn();
vi.mock("@/looks", async (actual) => ({ ...(await actual<object>()), loadLook: (id: string) => loadLook(id) }));
// The thumbnails draw real widgets; the loading is what is tested here.
vi.mock("@/components/studio/look-thumb", () => ({ LookThumb: () => null }));

describe("LookGallery", () => {
  it("shows a Look whose chunk fails as an error card with Retry, and lists the others", async () => {
    let fail = true;
    loadLook.mockImplementation((id: string) => {
      if (id === "classic") return Promise.resolve(CLASSIC);
      if (id === "hud" && fail) return Promise.reject(new Error("chunk failed"));
      return id === "hud" ? Promise.resolve({ ...CLASSIC, id: "hud", name: "Hud" }) : Promise.resolve(undefined);
    });
    render(<LookGallery currentLookId="classic" saved={[]} onPick={() => {}} onMore={() => {}} moreCount="" onRemovePack={() => 0} />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: /^Classic/ })).toBeTruthy();
    const retry = screen.getByRole("button", { name: "Retry HUD" });
    fail = false;
    fireEvent.click(retry);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Retry HUD" })).toBeNull();
    expect(screen.getByRole("button", { name: /^HUD/ })).toBeTruthy();
  });
});
