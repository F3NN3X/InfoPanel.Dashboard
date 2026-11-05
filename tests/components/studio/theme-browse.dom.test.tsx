// @vitest-environment happy-dom
// Browse themes loads each theme on its own: one that fails is named with Retry, the rest still list.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeBrowse } from "@/components/studio/theme-browse";
import type { PackImporterHandle } from "@/components/studio/user-packs";
import { CLASSIC } from "@/looks";

const loadLook = vi.fn();
vi.mock("@/looks", async (actual) => ({ ...(await actual<object>()), loadLook: (id: string) => loadLook(id) }));
// The thumbnails draw real widgets; the loading is what is tested here.
vi.mock("@/components/studio/look-thumb", () => ({ LookThumb: () => null }));

describe("ThemeBrowse", () => {
  it("names a theme whose chunk fails with Retry, and lists the others", async () => {
    let fail = true;
    loadLook.mockImplementation((id: string) => {
      if (id === "classic") return Promise.resolve(CLASSIC);
      if (id === "hud" && fail) return Promise.reject(new Error("chunk failed"));
      return id === "hud" ? Promise.resolve({ ...CLASSIC, id: "hud", name: "Hud" }) : Promise.resolve(undefined);
    });
    render(
      <ThemeBrowse
        levelName="Desk"
        currentLookId="classic"
        saved={[]}
        packs={[]}
        packsOff={false}
        importer={createRef<PackImporterHandle>()}
        onPacksChange={() => {}}
        keepBackground={false}
        onApply={() => {}}
        onPreview={() => {}}
        onCustomise={() => {}}
        onDuplicate={() => {}}
        onRename={() => {}}
        onDelete={() => {}}
        onRemovePack={() => 0}
        onTemplates={() => {}}
        templatesText=""
      />
    );
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
