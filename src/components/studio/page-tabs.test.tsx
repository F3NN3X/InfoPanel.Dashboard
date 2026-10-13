import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ProfilePage } from "@/lib/layout";
import { PageTabs, dropIndex, pageMenuEntries } from "./page-tabs";

const page = (id: string, name: string, extra: Partial<ProfilePage> = {}): ProfilePage => ({
  id,
  name,
  placements: [],
  ...extra,
});

const noop = () => {};
const html = (pages: ProfilePage[], current: string, extra: { renamingId?: string } = {}) =>
  renderToString(
    <PageTabs
      pages={pages}
      current={current}
      onSelect={noop}
      onAdd={noop}
      onRename={noop}
      onMove={noop}
      onDuplicate={noop}
      onDelete={noop}
      onIcon={noop}
      renamingId={extra.renamingId ?? null}
      onRenamingChange={noop}
      deletingId={null}
      onDeletingChange={noop}
    />
  );

describe("PageTabs", () => {
  it("renders a tab per page, marks the current one, and ends with the add button", () => {
    const out = html([page("a", "Main"), page("b", "Games", { icon: "gamepad-2" })], "b");
    const tabs = [...out.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toContain('aria-selected="false"');
    expect(tabs[1]).toContain('aria-selected="true"');
    expect(out).toContain("Main");
    expect(out).toContain("Games");
    expect(out).toContain("lucide-gamepad-2");
    expect(out.lastIndexOf('aria-label="Add page"')).toBeGreaterThan(out.lastIndexOf('role="tab"'));
  });

  it("still shows the strip with one page, so pages are discoverable", () => {
    const out = html([page("a", "Main")], "a");
    expect(out).toContain('role="tablist"');
    expect(out).toContain('aria-label="Add page"');
  });

  it("swaps the name for an input on the page being renamed", () => {
    const out = html([page("a", "Main"), page("b", "Games")], "a", { renamingId: "b" });
    expect(out).toContain('aria-label="Page name"');
    expect(out).toContain('value="Games"');
    expect(out.match(/role="tab"/g)).toHaveLength(1);
  });
});

describe("pageMenuEntries", () => {
  const actions = { rename: vi.fn(), icon: vi.fn(), duplicate: vi.fn(), remove: vi.fn() };
  const byId = (entries: ReturnType<typeof pageMenuEntries>, id: string) =>
    entries.find((e) => e !== "separator" && e.id === id);

  it("lists rename, icon, duplicate and delete", () => {
    const entries = pageMenuEntries([page("a", "A"), page("b", "B")], actions);
    expect(entries.filter((e) => e !== "separator").map((e) => (e as { id: string }).id)).toEqual([
      "rename",
      "icon",
      "duplicate",
      "delete",
    ]);
  });

  it("disables Delete on the only page, and runs the actions", () => {
    expect(byId(pageMenuEntries([page("a", "A")], actions), "delete")).toMatchObject({ disabled: true });
    const entries = pageMenuEntries([page("a", "A"), page("b", "B")], actions);
    expect(byId(entries, "delete")).toMatchObject({ disabled: false });
    (byId(entries, "duplicate") as { onSelect: () => void }).onSelect();
    expect(actions.duplicate).toHaveBeenCalledOnce();
  });
});

describe("dropIndex", () => {
  // Three 100 px tabs side by side: middles at 50, 150, 250.
  const rects = [0, 100, 200].map((left) => ({ left, width: 100 }));

  it("counts the other tabs left of the pointer", () => {
    expect(dropIndex(rects, 0, 10)).toBe(0);
    expect(dropIndex(rects, 0, 160)).toBe(1); // between tab 1 and tab 2
    expect(dropIndex(rects, 0, 900)).toBe(2);
    expect(dropIndex(rects, 2, 0)).toBe(0);
    expect(dropIndex(rects, 2, 120)).toBe(1);
  });

  it("is the page's own index when it stays put", () => {
    expect(dropIndex(rects, 1, 150)).toBe(1);
  });
});
