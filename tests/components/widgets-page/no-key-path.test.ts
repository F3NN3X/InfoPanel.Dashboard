import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A publisher key is trusted only in Settings › Widget publishers (owner decision; Phase 6a): the Widgets page, the import flow,
// the detail pane and the code widget loader have no path that adds or restores one. The app's commands that write the key store
// are named in two files only, the Settings window's IPC and its publishers page; nothing in the app writes /api/widget-keys (the
// server refuses it anyway: routes_widgets.rs `publisher_keys_are_read_over_http_and_never_written`).

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name).replace(/\\/g, "/")] : []));
const all = files("src");
const naming = (pattern: RegExp) => all.filter((f) => pattern.test(readFileSync(f, "utf8")));

describe("trusting a publisher key", () => {
  it("is reachable from the Settings window's publishers page only", () => {
    expect(naming(/trust_widget_key|restore_widget_key/)).toEqual(["src/settings/ipc.ts"]);
    expect(naming(/\btrustWidgetKey\b|\brestoreWidgetKey\b/).sort()).toEqual(["src/settings/ipc.ts", "src/settings/sections/publishers.tsx"]);
  });

  it("has no path from the Widgets page, the import, the detail pane or the loader", () => {
    const flows = all.filter((f) => f.startsWith("src/components/widgets-page/") || f.startsWith("src/widgets/code/") || f.startsWith("src/widgets/recipe/") || f === "src/components/studio/recipe-item.ts");
    expect(flows.length).toBeGreaterThan(10);
    for (const f of flows) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/(trust|restore)_widget_key|(trust|restore)WidgetKey|\/api\/widget-keys|settings\/ipc/);
    }
  });

  it("is never a write to /api/widget-keys anywhere in the app", () => {
    for (const f of naming(/\/api\/widget-keys/)) expect(readFileSync(f, "utf8"), f).not.toMatch(/method:\s*"(POST|PUT|PATCH|DELETE)"[^\n]*widget-keys|widget-keys[^\n]*method:\s*"(POST|PUT|PATCH|DELETE)"/);
  });
});
