import type { Locator, Page } from "@playwright/test";
import { FIXTURE_NAMES, type FixtureName } from "@/dev/fixtures/types";
import { CHECKS } from "./checks";
import { expect, openFixture, shoot, test } from "./harness";

// The Edit v3 reference states (SPEC §18): each fixture opens in Edit, and its reference checklist waits, skipped with
// the phase that enables it, until that phase builds the UI. A phase turns its lines on in the same change.

/** The fixtures on Desk panel (src/dev/fixtures/one-editor.ts); the others are on Neon Rig. */
const DESK = new Set<string>(["screen", "alt", "layersG"]);

const fixtureTab = (name: string) => (["addw", "hover"].includes(name) ? "Add" : "Layers");
const WIDGET_KIND = /^Widget · col \d+, row \d+$/;

/** A box on Neon Rig's canvas in its own px (800 wide), from the canvas editor's layer. */
async function profileBox(page: Page, part: Locator) {
  const layer = (await page.locator("[data-canvas-edit-layer]").boundingBox())!;
  const b = await part.first().boundingBox();
  const k = 800 / layer.width;
  return b && { x: Math.round((b.x - layer.x) * k), y: Math.round((b.y - layer.y) * k), w: Math.round(b.width * k), h: Math.round(b.height * k) };
}

/** Drag a part by (dx, dy) screen px with Alt held; `during` runs before the release. */
async function altDrag(page: Page, part: Locator, dx: number, dy: number, during?: () => Promise<void>) {
  const b = (await part.boundingBox())!;
  const [x, y] = [b.x + Math.min(10, b.width / 2), b.y + Math.min(10, b.height / 2)];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.keyboard.down("Alt");
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 3 });
  await page.mouse.move(x + dx, y + dy, { steps: 3 });
  await during?.();
  await page.mouse.up();
  await page.keyboard.up("Alt");
}

/** A Layers row by its name. */
const layersRow = (page: Page, name: string) => page.getByTestId("layers-row").filter({ hasText: name }).first();

/** The page's settings from its tab menu (Page settings deselects, so the inspector shows the page); the menu's rows. */
async function openPageSettings(page: Page, name = "Main") {
  await page.getByRole("button", { name: `Page actions for ${name}` }).click();
  const rows = page.getByRole("menuitem");
  await expect(rows.first()).toBeVisible();
  const labels = await rows.allTextContents();
  await rows.filter({ hasText: /^Page settings/ }).click();
  await expect(page.getByTestId("page-snap-toggle")).toBeVisible();
  return labels;
}

/** The inspector's Place row: its mode, and each box's value by its label. */
async function placeRow(page: Page) {
  const row = page.getByTestId("inspector-place");
  await expect(row).toBeVisible();
  const boxes = await row.locator("label").evaluateAll((els) => els.map((e) => [e.querySelector("input")?.getAttribute("aria-label"), (e.querySelector("input") as HTMLInputElement | null)?.value ?? e.querySelectorAll("span")[1]?.textContent]));
  return { row, mode: await row.getAttribute("data-mode"), boxes: Object.fromEntries(boxes) as Record<string, string> };
}

/** Start an HTML5 drag on a row and hover `target` at a fraction of its height; `release` drops it there. */
async function dragRow(page: Page, from: Locator, target: Locator, f: number, release = false) {
  const a = (await from.boundingBox())!;
  const b = (await target.boundingBox())!;
  await page.mouse.move(a.x + 40, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 60, b.y + b.height * f, { steps: 6 });
  await page.mouse.move(b.x + 62, b.y + b.height * f, { steps: 2 });
  if (release) await page.mouse.up();
}

/** Drag a box from its centre by (dx, dy) screen px. */
async function dragBy(page: Page, target: Locator, dx: number, dy: number) {
  const b = (await target.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx / 2, b.y + b.height / 2 + dy / 2, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 4 });
  await page.mouse.up();
}

/** The lines built so far, by fixture and line text; each runs on its fixture, opened in Edit. */
const BUILT: Partial<Record<FixtureName, Record<string, (page: Page) => Promise<void>>>> = {
  screen: {
    // Neither the tab menu nor the page settings offer a layout; no part is a "free area".
    [CHECKS.screen[0].text]: async (page) => {
      const labels = await openPageSettings(page);
      expect(labels.some((l) => /Layout/.test(l))).toBe(false);
      const inspector = page.locator("aside", { has: page.getByTestId("page-snap-toggle") });
      await expect(inspector).toContainText("Columns × rows");
      await expect(inspector).not.toContainText(/Layout|Grid → Free|Free → Grid/);
      await expect(page.locator("body")).not.toContainText(/free area/i);
    },
    // The fixture selects Weather, at column 2, row 3, one cell.
    [CHECKS.screen[4].text]: async (page) => {
      await expect(page.getByTestId("inspector-kind")).toHaveText(WIDGET_KIND);
      const { mode, boxes } = await placeRow(page);
      expect(mode).toBe("grid");
      expect(boxes).toEqual({ COL: "2", ROW: "3", W: "1", H: "1" });
      await shoot(page, "screen-place");
    },
    [CHECKS.screen[5].text]: async (page) => {
      await openPageSettings(page);
      await expect(page.getByText("Nothing selected")).toBeVisible();
      await expect(page.getByText("Page · Main")).toBeVisible();
      const toggle = page.getByTestId("page-snap-toggle");
      await expect(toggle).toContainText("Snap items to grid");
      await expect(toggle.getByRole("switch")).toHaveAttribute("aria-checked", "true");
      await expect(toggle.locator("xpath=..").locator("kbd")).toHaveText("Alt");
      await shoot(page, "screen-page");
    },
    [CHECKS.screen[2].text]: async (page) => {
      const tabs = page.getByRole("tablist", { name: "Left panel" });
      await expect(tabs.getByRole("tab")).toHaveText(["Layers", "Add"]);
      const layers = page.getByRole("region", { name: "Layers" });
      await expect(layers.locator("> div").first()).toHaveText(/^Layerstop first/);
    },
    // Each row: a 14 px chevron slot, a 20 px icon tile (a widget's in the accent), name, kind (screen-reader text and tooltip), lock and eye.
    [CHECKS.screen[3].text]: async (page) => {
      const rows = page.getByTestId("layers-row");
      await expect(rows).toHaveCount(5);
      for (const row of await rows.all()) {
        const [slot, tile] = await row.locator("> *").evaluateAll((els) => els.slice(0, 2).map((e) => ({ w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height, cls: e.className })));
        expect(slot.w).toBe(14);
        expect([tile.w, tile.h]).toEqual([20, 20]);
        expect(tile.cls).toContain("text-ui-accent");
        // The kind is screen-reader text (not a visible word) and the icon's tooltip.
        await expect(row.getByTestId("layers-row-kind")).toHaveText("widget");
        await expect(row.getByTestId("layers-row-kind")).toHaveClass(/sr-only/);
        await expect(row.locator("> *").nth(1)).toHaveAttribute("title", "widget");
        // The lock and eye are there for the pointer; the treeitem holds no interactive descendant (APG tree).
        await expect(row.locator('[data-row-action="lock"]')).toHaveCount(1);
        await expect(row.locator('[data-row-action="hide"]')).toHaveCount(1);
        await expect(row.getByRole("button")).toHaveCount(0);
        expect(await row.textContent()).toMatch(/\d×\d$/);
      }
      await expect(page.getByTestId("layers-row").first()).toHaveText(/Coding Agents/);
    },
    // The grid's lines are on; a widget dragged onto another stays where it was (Q3: refuse).
    [CHECKS.screen[1].text]: async (page) => {
      await expect(page.locator("[data-cell-lines]")).toBeVisible();
      await expect(page.getByTestId("snap-label")).toHaveText("Snap to cells · hold Alt to place freely");
      const weather = page.locator('[data-zone-id="weather"]');
      const before = (await weather.boundingBox())!;
      await page.mouse.move(before.x + before.width / 2, before.y + 20);
      await page.mouse.down();
      await page.mouse.move(before.x + before.width * 1.6, before.y + 25, { steps: 6 });
      await page.mouse.up();
      expect(await weather.boundingBox()).toEqual(before);
    },
  },
  profile: {
    // CPU temp as the import placed it: X 32, Y 96, W 224, H 96, its stored box, not the drawn line height.
    [CHECKS.profile[3].text]: async (page) => {
      await expect(page.getByTestId("inspector-kind")).toHaveText("InfoPanel item");
      const { row, mode, boxes } = await placeRow(page);
      expect(mode).toBe("free");
      await expect(row).toContainText(/Position and size \(px\)/i);
      await expect(row).toContainText("Placed freely");
      expect([boxes.X, boxes.Y, boxes.W, boxes.H]).toEqual(["32", "96", "224", "96"]);
      await expect(page.getByTestId("snap-to-grid")).toHaveText("Snap to grid");
      await shoot(page, "profile-place");
      // Snap to grid puts it on the nearest cells (100 × 96 px on 800 × 480): column 1, row 2, two wide (224 px).
      await page.getByTestId("snap-to-grid").click();
      const snapped = await placeRow(page);
      expect(snapped.mode).toBe("grid");
      expect([snapped.boxes.COL, snapped.boxes.ROW, snapped.boxes.W]).toEqual(["1", "2", "2"]);
    },
    [CHECKS.profile[4].text]: async (page) => {
      await expect(page.locator("body")).not.toContainText(/InfoPanel editor|Edit items/);
      await expect(page.getByRole("button", { name: /^Done$/ })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("page-snap-toggle")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/InfoPanel editor|Edit items/);
      await shoot(page, "profile-page");
    },
    [CHECKS.profile[0].text]: async (page) => {
      await expect(page.getByTitle("Switch screen or page")).toHaveAccessibleDescription(/Imported from InfoPanel/);
      await expect(page.getByRole("tablist", { name: "Pages" })).toBeVisible();
    },
    [CHECKS.profile[2].text]: async (page) => {
      await expect(layersRow(page, "Temps")).toHaveAttribute("aria-expanded", "true");
      const cpu = layersRow(page, "CPU temp");
      await expect(cpu).toHaveAttribute("data-depth", "1");
      await expect(cpu.getByTestId("layers-row-kind")).toHaveText("item");
      await expect(cpu.getByTestId("layers-row-kind")).toHaveClass(/sr-only/);
      await expect(cpu.getByLabel("Placed freely (Alt)")).toBeVisible();
    },
    // The canvas editor draws the page's 8 × 5 cells; CPU temp is where the import put it, placed freely. A Sensor is
    // a text item: its drawn height is its line's (the platform's font metrics), not the stored Height, so the
    // selection is checked against the stored X, Y and Width and the height the item is drawn at.
    [CHECKS.profile[1].text]: async (page) => {
      await expect(page.locator("[data-cell-lines] rect")).toHaveCount(40);
      const selection = page.locator("[data-selected-path]");
      const { h, ...at } = (await profileBox(page, selection))!;
      expect(at).toEqual({ x: 32, y: 96, w: 224 });
      const drawn = (await profileBox(page, page.locator(`[data-path="${await selection.first().getAttribute("data-selected-path")}"]`)))!;
      expect(h).toBeGreaterThan(0);
      expect(h).toBe(drawn.h);
      await expect(page.getByTestId("snap-label")).toHaveText("Snap to cells · hold Alt to place freely");
    },
  },
  addw: {
    [CHECKS.addw[2].text]: async (page) => {
      await expect(page.getByTestId("inspector-kind")).toHaveText(WIDGET_KIND);
      const { mode, boxes } = await placeRow(page);
      expect(mode).toBe("grid");
      expect(boxes).toEqual({ COL: "7", ROW: "5", W: "2", H: "1" });
    },
    // Neon Rig is made for InfoPanel: after Recently used, InfoPanel items and Elements come before the widgets.
    [CHECKS.addw[0].text]: async (page) => {
      const tiles = page.getByTestId("add-tile");
      await expect(tiles.first()).toBeVisible();
      const sections = () => page.getByRole("listbox").locator("> section").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
      expect(await sections()).toEqual(["Recently used", "Studio widgets"]);
      await page.getByRole("tab", { name: "Items" }).click();
      await expect.poll(sections).toEqual(["InfoPanel items", "Elements"]);
      await page.getByRole("tab", { name: "Widgets" }).click();
      expect(await tiles.count()).toBeGreaterThan(20);
      await shoot(page, "addw-tiles");
    },
    [CHECKS.addw[3].text]: async (page) => {
      await page.getByRole("tab", { name: "Layers" }).click();
      const first = page.getByTestId("layers-row").first();
      await expect(first).toHaveText(/Weather/);
      await expect(first).toHaveAttribute("data-kind", "widget");
      await expect(page.locator('[data-testid="layers-row"][data-kind="item"]')).not.toHaveCount(0);
    },
    // A Weather dropped from Add on the Weather already at COL 7 ROW 5 refuses the overlap (Q3) and takes the nearest
    // free cells: on the cell lines, selected.
    [CHECKS.addw[1].text]: async (page) => {
      const layer = page.locator("[data-canvas-edit-layer]");
      const k = 800 / (await layer.boundingBox())!.width;
      await page.getByRole("option", { name: /^Weather/ }).first().dragTo(layer, { targetPosition: { x: 650 / k, y: 430 / k } });
      const b = (await profileBox(page, page.locator("[data-selected-path]")))!;
      expect([b.x % 100, b.y % 96]).toEqual([0, 0]);
      expect(b.x + b.w <= 600 || b.y + b.h <= 384).toBe(true);
    },
  },
  alt: {
    // Title text sits in px (48, 28, 140 × 36); Snap to grid puts it back on cells, and it draws there.
    [CHECKS.alt[4].text]: async (page) => {
      const title = page.locator('[data-part-id="title"]');
      await title.dblclick();
      const { row, mode, boxes } = await placeRow(page);
      expect(mode).toBe("free");
      await expect(row).toContainText("Placed freely");
      expect(boxes).toEqual({ X: "48", Y: "28", W: "140", H: "36" });
      await shoot(page, "alt-place");
      await page.getByTestId("snap-to-grid").click();
      expect((await placeRow(page)).mode).toBe("grid");
      await expect(title).not.toHaveAttribute("data-free");
    },
    // Title text is in the Overlay group: a click selects the group, a double-click the part inside (SPEC §10.3 note).
    [CHECKS.alt[0].text]: async (page) => {
      const title = page.locator('[data-part-id="title"]');
      await title.dblclick();
      await altDrag(page, title, 60, 40, async () => {
        await expect(page.getByTestId("alt-hint")).toHaveText("AltPlacing freely · release Alt to snap to cells");
        await expect(page.locator("[data-cell-lines]")).toHaveCSS("opacity", "0.35");
      });
      await expect(page.getByTestId("alt-hint")).toHaveCount(0);
    },
    [CHECKS.alt[1].text]: async (page) => {
      await page.locator('[data-part-id="title"]').dblclick();
      await altDrag(page, page.locator('[data-part-id="title"]'), 60, 40, async () => {
        await expect(page.getByTestId("alt-readout")).toHaveText(/^X \d+ {2}Y \d+ {2}W 140 {2}H 36 · free$/);
        await expect(page.locator("[data-item-parts] .border-dashed")).toHaveCount(1);
        await shoot(page, "alt-drag");
      });
    },
    // Dropped with Alt over the CPU gauge: stored in px (data-free), moved by exactly the drag; then Alt released
    // mid-drag snaps it again, but (user decision 2026-10-28) a part already placed freely keeps its size and stays in
    // px, its corner on a cell's.
    [CHECKS.alt[2].text]: async (page) => {
      const title = page.locator('[data-part-id="title"]');
      await title.dblclick();
      const before = (await title.boundingBox())!;
      await altDrag(page, title, 61, 37);
      await expect(title).toHaveAttribute("data-free", "");
      const after = (await title.boundingBox())!;
      expect([Math.round(after.x - before.x), Math.round(after.y - before.y)]).toEqual([61, 37]);
      const cpu = (await page.locator('[data-zone-id="cpu"]').boundingBox())!;
      expect(after.x > cpu.x && after.y > cpu.y && after.x < cpu.x + cpu.width && after.y < cpu.y + cpu.height).toBe(true);
      await altDrag(page, title, 20, 20, async () => {
        await page.keyboard.up("Alt");
        await expect(page.getByTestId("alt-hint")).toHaveCount(0);
      });
      await expect(title).toHaveAttribute("data-free", "");
      const snapped = (await title.boundingBox())!;
      expect([Math.round(snapped.width), Math.round(snapped.height)]).toEqual([Math.round(after.width), Math.round(after.height)]);
    },
    // A widget dragged with Alt: the hint says it stays on the grid, and it lands on free cells (Weather onto Coding
    // agents is refused).
    [CHECKS.alt[3].text]: async (page) => {
      const weather = page.locator('[data-zone-id="weather"]');
      const before = (await weather.boundingBox())!;
      await altDrag(page, weather, before.width * 1.2, 7, async () => {
        await expect(page.getByTestId("alt-hint")).toHaveText("AltWidgets always sit on the grid");
      });
      expect(await weather.boundingBox()).toEqual(before);
    },
    [CHECKS.alt[5].text]: async (page) => {
      const title = page.locator('[data-part-id="title"]');
      await title.dblclick();
      await expect(title).toHaveAttribute("data-selected", "");
      const at = async () => (await title.boundingBox())!;
      const zoom = (await page.locator("[data-studio-page]").boundingBox())!.width / 1024;
      let b = await at();
      await page.keyboard.press("Alt+ArrowRight");
      expect(Math.round(((await at()).x - b.x) / zoom)).toBe(1);
      b = await at();
      await page.keyboard.press("Alt+Shift+ArrowDown");
      expect(Math.round(((await at()).y - b.y) / zoom)).toBe(10);
      b = await at();
      await page.keyboard.press("ArrowRight");
      // A cell of the 4 × 3 page is 256 px wide.
      expect(Math.round(((await at()).x - b.x) / zoom)).toBe(256);
    },
  },
  layersF: {
    [CHECKS.layersF[0].text]: async (page) => {
      const rows = page.getByTestId("layers-row");
      // Layers is its own chunk: wait for its rows before reading them.
      await expect(rows.first()).toBeVisible();
      const names = await rows.evaluateAll((els) => els.map((e) => [e.textContent?.match(/^[A-Za-z ]+?(?=group|widget|item|element)/)?.[0].trim(), e.getAttribute("data-depth"), e.getAttribute("data-kind")]));
      const at = names.findIndex((n) => n[0] === "Right column");
      expect(names.slice(at, at + 3)).toEqual([["Right column", "0", "group"], ["Weather", "1", "widget"], ["Fan gauge", "1", "item"]]);
    },
    [CHECKS.layersF[1].text]: async (page) => {
      const last = page.getByTestId("layers-row").last();
      await expect(last).toHaveText(/^Panel card/);
      await expect(last).toHaveAttribute("data-kind", "element");
      // Drawn first, so under the Temps items.
      const under = await page.evaluate(() => {
        const card = document.querySelector('[data-canvas-edit-layer] ~ * [data-path="0"], [data-path="0"]');
        const temp = document.querySelector('[data-path="1.0"]');
        return Boolean(card && temp && card.compareDocumentPosition(temp) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(under).toBe(true);
    },
    // The reference's state: Weather selected, its menu open (the fixture's contextMenuFor).
    [CHECKS.layersF[2].text]: async (page) => {
      await expect(page.getByTestId("inspector-kind")).toHaveText(WIDGET_KIND);
      await layersRow(page, "Weather").click({ button: "right" });
      const menu = page.getByTestId("layer-menu");
      await expect(menu.getByRole("menuitem")).toHaveText([
        /^Bring to front/, /^Bring forward/, /^Send backward/, /^Send to back/,
        /^Group selection/, /^Ungroup/, /^Move to group/,
        /^Snap to grid/, /^Lock/, /^Hide/,
        /^Rename/, /^Duplicate/, /^Delete/, /^Save to Library/,
      ]);
      await menu.getByRole("menuitem", { name: /^Move to group/ }).click();
      await expect(menu.locator("[data-sub] [role=menuitem]")).toHaveText(["Header", "Right column", "Temps", "New group", /^Move out of group/]);
      await shoot(page, "layersF-menu");
    },
    // A 2 px line between rows; an outline on a group's middle; the drop lands inside, on top.
    [CHECKS.layersF[3].text]: async (page) => {
      const load = layersRow(page, "CPU load");
      await dragRow(page, load, layersRow(page, "Clock"), 0.15);
      await expect(layersRow(page, "Clock")).toHaveAttribute("data-drop", "above");
      const line = layersRow(page, "Clock").locator("span.bg-ui-accent");
      expect((await line.boundingBox())!.height).toBe(2);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await dragRow(page, load, layersRow(page, "Right column"), 0.5);
      await expect(layersRow(page, "Right column")).toHaveAttribute("data-drop", "inside");
      await page.mouse.up();
      const after = page.getByTestId("layers-row");
      const names = await after.evaluateAll((els) => els.map((e) => e.getAttribute("data-depth") + (e.textContent ?? "").slice(0, 12)));
      const at = names.findIndex((n) => n.startsWith("0Right column"));
      expect(names[at + 1]).toMatch(/^1CPU load/);
    },
    [CHECKS.layersF[4].text]: async (page) => {
      await layersRow(page, "Temps").click();
      await expect(page.getByTestId("group-chip")).toHaveText("Temps · group");
      await expect(page.locator("[data-selected-path]")).toHaveCount(1);
      await expect(layersRow(page, "CPU temp")).toHaveClass(/bg-ui-accent\/7/);
      // SPEC §10.3, sign-off round 1: the group inspector has no tabs, as on a screen's page.
      await expect(page.getByTestId("inspector-kind")).toHaveText("Group · 4 items");
      await expect(page.getByRole("button", { name: "Select contents" })).toBeVisible();
      await expect(page.getByRole("complementary", { name: "Item" }).getByRole("tab")).toHaveCount(0);
      await shoot(page, "layersF-group");
    },
    [CHECKS.layersF[5].text]: async (page) => {
      const load = layersRow(page, "CPU load");
      // Hide and Lock are row commands: select the row, then Ctrl+H, Ctrl+L (the eye and lock icons are for the pointer).
      await load.click();
      await page.keyboard.press("Control+h");
      await expect(load).toHaveAttribute("data-hidden", "");
      await expect(load).toHaveAttribute("aria-description", "Hidden");
      // Selecting the row for the key made it white; select another row so the unselected muting shows.
      await layersRow(page, "Temps").click();
      // The design audit (FND-001) keeps the name readable: it mutes to text-ui-4 while the icon dims to 45 %.
      await expect(load).toHaveCSS("opacity", "1");
      await expect(load.getByText("CPU load", { exact: true })).toHaveClass(/text-ui-4/);
      await expect(load.locator("svg").first().locator("..")).toHaveCSS("opacity", "0.45");
      await load.click();
      await page.keyboard.press("Control+h");
      await expect(load).not.toHaveAttribute("data-hidden");
      await load.click();
      await page.keyboard.press("Control+l");
      await expect(load).toHaveAttribute("data-locked", "");
      await expect(load).toHaveAttribute("aria-description", "Locked");
      await expect(load.locator('[data-row-action="lock"]')).toHaveAttribute("title", "Unlock");
      // A locked row shows its lock (an unlocked one only on hover).
      await expect(load.locator('[data-row-action="lock"]')).toBeVisible();
      await expect(load.locator('[data-row-action="lock"]')).toHaveCSS("opacity", "1");
      // A drag on the locked item leaves it where it is.
      const drawn = page.locator('[data-path="2"]');
      const before = await profileBox(page, drawn);
      await dragBy(page, drawn, 40, 30);
      expect(await profileBox(page, drawn)).toEqual(before);
    },
  },
  layersG: {
    // Refused while the bottom row is full (a toast says so); with room, both gauges move one row down.
    [CHECKS.layersG[0].text]: async (page) => {
      await expect(layersRow(page, "Gauges").getByTestId("layers-row-kind")).toHaveText("group");
      await expect(layersRow(page, "Gauges").locator("span.font-ui-mono")).toHaveText("2");
      await layersRow(page, "Gauges").click();
      const box = page.locator('[data-group-box="gauges"]');
      const cpu = page.locator('[data-zone-id="cpu"]');
      const gpu = page.locator('[data-zone-id="gpu"]');
      const [c0, g0] = [(await cpu.boundingBox())!, (await gpu.boundingBox())!];
      const row = c0.height / 2;
      await dragBy(page, box, 0, row);
      await expect(page.getByText("Not enough room to move the group.")).toBeVisible();
      expect(await cpu.boundingBox()).toEqual(c0);
      await layersRow(page, "Clock").click();
      await layersRow(page, "Weather").click({ modifiers: ["Control"] });
      await layersRow(page, "Coding Agents").click({ modifiers: ["Control"] });
      await page.keyboard.press("Delete");
      await expect(page.locator("[data-zone-id]")).toHaveCount(2);
      await layersRow(page, "Gauges").click();
      await dragBy(page, box, 0, row);
      await expect.poll(async () => Math.round((await cpu.boundingBox())!.y - c0.y)).toBe(Math.round(row));
      expect(Math.round((await gpu.boundingBox())!.y - g0.y)).toBe(Math.round(row));
      expect([(await cpu.boundingBox())!.x, (await gpu.boundingBox())!.x]).toEqual([c0.x, g0.x]);
    },
    [CHECKS.layersG[1].text]: async (page) => {
      await expect(page.getByTestId("layers-row").first()).toBeVisible();
      const names = await page.getByTestId("layers-row").evaluateAll((els) => els.map((e) => (e.getAttribute("data-kind") === "group" ? e.textContent?.replace(/group.*$/, "") : null)).filter(Boolean));
      expect(names).toEqual(["Overlay", "Gauges"]);
      // The fixture opens with Overlay selected (its box takes the pointer); with nothing selected, Title text is on top.
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-group-box="overlay"]')).toHaveCount(0);
      const title = (await page.locator('[data-part-id="title"]').boundingBox())!;
      const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[data-part-id]")?.getAttribute("data-part-id") ?? null, [title.x + title.width / 2, title.y + title.height / 2]);
      expect(top).toBe("title");
    },
    [CHECKS.layersG[3].text]: async (page) => {
      await layersRow(page, "Overlay").click();
      await expect(page.getByTestId("group-chip")).toHaveText("Overlay · group");
      await expect(page.locator('[data-group-box="overlay"]')).toBeVisible();
      await expect(layersRow(page, "Title text")).toHaveClass(/bg-ui-accent\/7/);
      await expect(layersRow(page, "Accent glow")).toHaveClass(/bg-ui-accent\/7/);
      await expect(page.getByTestId("inspector-kind")).toHaveText("Group · 1 item, 1 element");
      await expect(page.getByTestId("inspector-layer")).toHaveCount(0);
      await shoot(page, "layersG-group");
    },
    [CHECKS.layersG[2].text]: async (page) => {
      const glow = page.locator('[data-part-id="glow"]');
      await expect(glow).not.toHaveAttribute("data-free");
      await expect(page.locator('[data-part-id="title"]')).toHaveAttribute("data-free", "");
      // Columns 1–2 of row 1: the CPU gauge's top half.
      const cpu = (await page.locator('[data-zone-id="cpu"]').boundingBox())!;
      const g = (await glow.boundingBox())!;
      expect([Math.round(g.x), Math.round(g.y), Math.round(g.width), Math.round(g.height * 2)]).toEqual([Math.round(cpu.x), Math.round(cpu.y), Math.round(cpu.width), Math.round(cpu.height)]);
    },
    [CHECKS.layersG[4].text]: async (page) => {
      const zones = await page.locator("[data-zone-id]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })));
      const overlap = (a: (typeof zones)[0], b: (typeof zones)[0]) => a.x + 1 < b.x + b.w && b.x + 1 < a.x + a.w && a.y + 1 < b.y + b.h && b.y + 1 < a.y + a.h;
      expect(zones.some((a, i) => zones.some((b, j) => i !== j && overlap(a, b)))).toBe(false);
      const title = (await page.locator('[data-part-id="title"]').boundingBox())!;
      expect(zones.some((z) => overlap(z, { x: title.x, y: title.y, w: title.width, h: title.height }))).toBe(true);
    },
  },
  hover: {
    // The fixture shows the All chip: one 48 px row per tile, with how many styles a widget holds.
    [CHECKS.hover[0].text]: async (page) => {
      const grid = page.locator("[data-add-grid]").nth(1);
      const boxes = await grid.getByTestId("add-tile").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ top: Math.round(r.top), h: r.height })));
      expect(boxes.every((b) => b.h === 48)).toBe(true);
      expect(boxes.filter((b) => b.top === boxes[0].top)).toHaveLength(1);
      const weather = page.getByTestId("add-tile").filter({ hasText: "Weather" }).first();
      await expect(weather).toContainText("6 styles");
    },
    [CHECKS.hover[1].text]: async (page) => {
      const list = page.getByRole("listbox");
      await expect(list.locator("> section > div").first()).toHaveText("Recently used");
      await expect(list.getByText("Studio widgets", { exact: false })).toBeVisible();
      await expect(list.getByText("System", { exact: true })).toBeVisible();
    },
    // The fixture opens Weather's card; Esc closes it. A rest on another tile opens its card within 300 ms (acceptance
    // 20), beside the panel and aligned to the tile's row; moving to the next tile switches at once.
    [CHECKS.hover[2].text]: async (page) => {
      const card = page.getByTestId("add-preview");
      await expect(card).toContainText("Weather");
      await page.keyboard.press("/");
      await page.keyboard.press("Escape");
      await expect(card).toHaveCount(0);
      // Recently used: Weather, then Custom gauge.
      const recent = page.getByRole("listbox").locator("> section").first().getByTestId("add-tile");
      const t = (await recent.nth(1).boundingBox())!;
      // Timed in the page: from the pointer entering the tile to the card being there.
      await page.evaluate(() => {
        const w = window as unknown as { hoverAt?: number; cardAt?: number };
        document.addEventListener("mouseover", (e) => (w.hoverAt ??= (e.target as Element).closest('[data-testid="add-tile"]') ? performance.now() : undefined), true);
        new MutationObserver(() => (w.cardAt ??= document.querySelector('[data-testid="add-preview"]') ? performance.now() : undefined)).observe(document.body, { childList: true, subtree: true });
      });
      await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
      await expect(card).toHaveCount(0);
      await expect(card).toContainText("Custom gauge");
      const delay = await page.evaluate(() => {
        const w = window as unknown as { hoverAt: number; cardAt: number };
        return w.cardAt - w.hoverAt;
      });
      expect(delay).toBeGreaterThanOrEqual(240);
      expect(delay).toBeLessThanOrEqual(300);
      // Where it is placed (its box slides in 4 px as it appears, so its style, not its box).
      const c = await card.evaluate((e) => ({ x: Number.parseFloat(e.style.left), y: Number.parseFloat(e.style.top) }));
      const panel = (await page.locator("aside", { has: page.getByRole("tablist", { name: "Left panel" }) }).boundingBox())!;
      expect(c.x).toBeCloseTo(panel.x + panel.width + 8, 1);
      expect(c.y).toBeCloseTo(t.y - 4, 1);
      await recent.nth(0).hover();
      await expect(card).toContainText("Weather", { timeout: 100 });
      // The arrow keys move the card with the highlight.
      await page.keyboard.press("/");
      await page.keyboard.press("ArrowDown");
      await expect(card).toBeVisible();
    },
    [CHECKS.hover[3].text]: async (page) => {
      const card = page.getByTestId("add-preview");
      await expect(card).toContainText("WeatherInfo · Studio widget");
      await expect(card).toContainText("Always sits on the grid; uses your theme, colors and fonts.");
      await expect(card).toContainText("Adapts down to 1×1");
      await shoot(page, "hover-card");
      // An InfoPanel item and an element, on the Items tab.
      await page.getByRole("tab", { name: "Items" }).click();
      for (const [name, category, note] of [["Bar", "InfoPanel item · Data", "InfoPanel item"], ["Card", "Element", "Studio element"]]) {
        // Scrolling the list closes the card (§9.5): bring the tile into view first, then rest on it.
        const tile = page.getByRole("option", { name, exact: true }).first();
        await tile.scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        await tile.hover();
        await expect(card).toContainText(`${name}${category}`);
        await expect(card).toContainText("Snaps to cells; hold Alt to place it freely, even on top of widgets.");
        await expect(card).toContainText(`any size${note}`);
        await expect(card.locator("[data-ip-canvas]")).toBeVisible();
        // The new part is drawn inside the stage, not off it.
        const stage = await card.locator("[data-ip-canvas]").boundingBox();
        const part = await card.locator('[data-ip-canvas] [data-path="0"]').boundingBox();
        expect(stage && part).toBeTruthy();
        if (stage && part) {
          expect(part.x).toBeGreaterThanOrEqual(stage.x);
          expect(part.y).toBeGreaterThanOrEqual(stage.y);
          expect(part.x + part.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
          expect(part.y + part.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
        }
      }
      await page.waitForTimeout(200);
      await shoot(page, "hover-item");
    },
    [CHECKS.hover[4].text]: async (page) => {
      const card = page.getByTestId("add-preview");
      await expect(card).toContainText("Click to add · drag to place");
      await expect(card).toHaveCSS("pointer-events", "none");
      await expect(page.getByText("Styles are presets inside each widget")).toBeVisible();
    },
  },
};

// SPEC §7.4, §9.3, acceptance 19 (DECISIONS after phase 3): on a screen for Studio panels Add lists the widgets first,
// and an InfoPanel item from Add, clicked or dropped, becomes an item placement on the page (no free area), selected.
test("one-editor/screen: Add puts InfoPanel items on the page as item placements", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "screen");
  await page.getByRole("tab", { name: "Add" }).click();
  const sections = () => page.getByRole("listbox").locator("> section").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  // Add is its own chunk: wait for it to arrive.
  await expect.poll(sections).toEqual(["Studio widgets"]);
  await page.getByRole("tab", { name: "Items" }).click();
  await expect.poll(sections).toEqual(["InfoPanel items", "Elements"]);
  const items = page.locator('[data-testid="canvas-part"][data-kind="item"]');
  await page.getByRole("option", { name: "Text", exact: true }).click();
  await expect(items).toHaveCount(1);
  await expect(items.first()).toHaveAttribute("data-selected", "");
  await expect(items.first()).not.toHaveAttribute("data-free");
  await page.getByRole("option", { name: "Card", exact: true }).dragTo(page.locator("[data-studio-page]"), { targetPosition: { x: 100, y: 100 } });
  await expect(page.locator('[data-testid="canvas-part"][data-kind="element"]')).toHaveCount(1);
  await expect(page.locator("[data-zone-id]")).toHaveCount(5);
  // Recently used now leads, with both.
  expect((await sections())[0]).toBe("Recently used");
});

// DECISIONS after phase 4: right-click on a widget on the canvas opens the layer menu, the zone menu's other rows under it.
test("one-editor/screen: right-click on a widget opens the layer menu", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "screen");
  await page.locator('[data-zone-id="clock"]').click({ button: "right" });
  const menu = page.getByTestId("layer-menu");
  const rows = menu.getByRole("menuitem");
  await expect(rows.first()).toHaveText(/^Bring to front/);
  await expect(rows.filter({ hasText: /^Change widget/ })).toHaveCount(1);
  await expect(rows.filter({ hasText: /^Duplicate/ })).toHaveCount(1);
  await expect(rows.filter({ hasText: /^Delete/ })).toHaveCount(1);
  await shoot(page, "screen-widget-menu");
});

// SPEC §10.3 note (DECISIONS after phase 4): a click on a part in a group selects the outermost group, a double-click the
// part inside; a widget's too.
test("one-editor/layersG: a click selects the group, a double-click the part", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "layersG");
  // The gauge's lower half: Accent glow covers its top row, and once selected the group's box covers it all.
  const b = (await page.locator('[data-zone-id="cpu"]').boundingBox())!;
  const at = { x: b.x + 30, y: b.y + b.height - 30 };
  await page.mouse.click(at.x, at.y);
  await expect(page.getByTestId("group-chip")).toHaveText("Gauges · group");
  await expect(layersRow(page, "Gauges")).toHaveAttribute("data-selected", "");
  await page.mouse.dblclick(at.x, at.y);
  await expect(page.getByTestId("group-chip")).toHaveCount(0);
  await expect(layersRow(page, "CPU gauge")).toHaveAttribute("data-selected", "");
  await page.locator('[data-part-id="title"]').click();
  await expect(page.getByTestId("group-chip")).toHaveText("Overlay · group");
});

/** Tab (keyboard only) until `target` has the focus. */
async function tabTo(page: Page, target: Locator, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Tab never reached the target");
}

// SPEC §19 test 28: keyboard only on Neon Rig: add a widget, add an item, place it freely, group
// both.
test("one-editor/profile: keyboard only, from Add to Group", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "profile");
  await page.keyboard.press("Escape");
  // "/" opens Add from Layers with its search focused.
  await page.keyboard.press("/");
  const search = page.getByPlaceholder("Search widgets and items");
  await expect(search).toBeFocused();
  await page.keyboard.type("Weather");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("inspector-kind")).toHaveText(WIDGET_KIND);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(search).not.toBeFocused();
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await page.keyboard.type("Shape");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("inspector-kind")).toHaveText("InfoPanel item");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(search).not.toBeFocused();
  // Alt+Arrow nudges the item 1 px: it is placed freely.
  await page.keyboard.press("Alt+ArrowRight");
  expect((await placeRow(page)).mode).toBe("free");
  // Layers by its radio (one tab stop, the checked one; an arrow key moves and selects), then the tree: the new item is the top row and its tab stop; Shift+Down takes the widget too.
  const checkedTab = page.getByRole("tablist", { name: "Left panel" }).getByRole("tab", { selected: true });
  await tabTo(page, checkedTab);
  if ((await checkedTab.textContent()) !== "Layers") await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Layers" })).toHaveAttribute("aria-selected", "true");
  const top = page.getByTestId("layers-row").first();
  await tabTo(page, top);
  await expect(top).toHaveAttribute("data-selected", "");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(page.locator('[data-testid="layers-row"][data-selected]')).toHaveCount(2);
  await page.keyboard.press("Control+g");
  const group = page.locator('[data-testid="layers-row"][data-kind="group"]').first();
  await expect(group.getByTestId("layers-row-kind")).toHaveText("group");
  await expect(group.locator("span.font-ui-mono")).toHaveText("2");
});

// Decision Q10 (after phase 6): the slim strip over an imported canvas is gone; Show modes, Sensors and Compare sit in
// the page settings' Preview section, so both page kinds share one chrome. Sign-off round 1: Draw all as is gone, and the
// item inspector has no Position.
test("one-editor/profile: no strip over the canvas; its tools are in the page settings", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "profile");
  await expect(page.getByRole("toolbar", { name: "Canvas items" })).toHaveCount(0);
  await expect(page.getByTestId("inspector-place")).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Draw as" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Position/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const drawing = page.getByRole("region", { name: "Preview" });
  await expect(page.getByRole("radiogroup", { name: "Draw all as" })).toHaveCount(0);
  await expect(drawing.getByRole("radiogroup", { name: "Sensors" })).toBeVisible();
  await drawing.getByRole("switch", { name: "Show modes" }).click();
  await expect(drawing).toContainText("Native widget");
  await drawing.getByRole("switch", { name: "Compare" }).click();
  await expect(drawing.getByRole("button", { name: /InfoPanel screenshot|Change screenshot/ })).toBeVisible();
  await shoot(page, "profile-page-drawing");
});

// SPEC §7.1, sign-off round 1: a hidden widget isn't drawn in Edit; selected from Layers it shows a dashed outline at
// its box, and its eye brings it back.
test("one-editor/screen: a hidden widget isn't drawn; Layers selects it as an outline", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "screen");
  const clock = page.locator('[data-zone-id="clock"]');
  const before = (await clock.boundingBox())!;
  await expect(clock.locator("*")).not.toHaveCount(0);
  await layersRow(page, "Clock").click();
  await page.keyboard.press("Control+h");
  await expect(clock).toHaveAttribute("data-hidden", "");
  await expect(clock.locator("*")).toHaveCount(0);
  await layersRow(page, "Clock").click();
  await expect(clock.locator("[data-hidden-zone]")).toBeVisible();
  expect(await clock.boundingBox()).toEqual(before);
  await page.keyboard.press("Control+h");
  await expect(clock).not.toHaveAttribute("data-hidden");
});

// rules §4 (it moved from the top centre, SPEC §9.6, in Phase 3): in Edit a toast sits at the bottom centre of the
// canvas, above the bottom toolbar.
test("one-editor/layersG: Edit's toasts sit at the bottom centre of the canvas, over the toolbar", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "layersG");
  await layersRow(page, "Gauges").click();
  const box = page.locator('[data-group-box="gauges"]');
  await dragBy(page, box, 0, ((await page.locator('[data-zone-id="cpu"]').boundingBox())!.height) / 2);
  const toast = page.getByRole("status").filter({ hasText: "Not enough room to move the group." });
  await expect(toast).toBeVisible();
  const [t, canvas, tabs, zoom] = await Promise.all([toast, page.locator("[data-toast-anchor]"), page.getByRole("tab", { name: /Main/ }).first(), page.getByRole("button", { name: "Fit" })].map(async (l) => (await l.boundingBox())!));
  expect(t.y + t.height).toBeCloseTo(canvas.y + canvas.height - 76, 0);
  expect(t.x + t.width / 2).toBeCloseTo(canvas.x + canvas.width / 2, 0);
  expect(t.y).toBeGreaterThan(tabs.y + tabs.height);
  expect(t.y + t.height).toBeLessThan(zoom.y);
});

// Sign-off round 3: at 1440 wide the Widgets chips run past the panel. The row fades at the right edge, and at the left
// once scrolled; the wheel, a drag and a chip reached by keyboard scroll it, and a drag picks no chip.
test("one-editor/addw: Add's category chips scroll sideways with a fade", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "addw");
  const row = page.locator(".add-chips");
  // Items is a tab of its own (02b): the chips are the widget categories.
  await expect(page.getByRole("tablist", { name: "What to add" }).getByRole("tab")).toHaveText(["Widgets", "Items", "Panels", "Layouts"]);
  expect((await row.getByRole("button").allTextContents())[0]).toBe("All");
  const left = () => row.evaluate((el) => el.scrollLeft);
  const reset = () => row.evaluate((el) => el.scrollTo({ left: 0 }));
  await expect(row).toHaveAttribute("data-fade", "end");
  const b = (await row.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.wheel(0, 120);
  await expect.poll(left).toBeGreaterThan(0);
  await expect(row).toHaveAttribute("data-fade", "start end");
  await reset();
  await expect(row).toHaveAttribute("data-fade", "end");
  await page.mouse.move(b.x + b.width - 20, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 120, b.y + b.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(left).toBeGreaterThan(50);
  await expect(row.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  await reset();
  await row.getByRole("button").last().focus();
  await expect.poll(left).toBe(await row.evaluate((el) => el.scrollWidth - el.clientWidth));
  await expect(row).toHaveAttribute("data-fade", "start");
});

// Sign-off round 3: a widget's inspector has no Visible switch; hide and show are the Layers eye and Ctrl+H.
test("one-editor/screen: a widget is hidden from Layers or Ctrl+H, not its inspector", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "screen");
  const clock = page.locator('[data-zone-id="clock"]');
  await layersRow(page, "Clock").click();
  await expect(page.getByTestId("inspector-kind")).toHaveText(WIDGET_KIND);
  await expect(page.getByRole("switch", { name: "Visible" })).toHaveCount(0);
  await expect(page.getByText("Visible", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Control+h");
  await expect(clock).toHaveAttribute("data-hidden", "");
  // Hiding drops the selection; selected again from Layers, Ctrl+H shows it.
  await layersRow(page, "Clock").click();
  await page.keyboard.press("Control+h");
  await expect(clock).not.toHaveAttribute("data-hidden");
});

// SPEC §7.1, acceptance 18: a locked widget is drawn but can't be moved on the canvas.
test("one-editor/screen: a locked widget doesn't move on the canvas", async ({ page, scratch }) => {
  await openFixture(page, scratch.base, "screen");
  await layersRow(page, "Clock").click();
  await page.keyboard.press("Control+l");
  await expect(layersRow(page, "Clock")).toHaveAttribute("data-locked", "");
  const clock = page.locator('[data-zone-id="clock"]');
  const before = await clock.boundingBox();
  await dragBy(page, clock, 0, -150);
  expect(await clock.boundingBox()).toEqual(before);
});

for (const name of FIXTURE_NAMES) {
  test.describe(`one-editor/${name}`, () => {
    test("opens in Edit with its content", async ({ page, scratch }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await openFixture(page, scratch.base, name);
      // Desk panel (a grid page) draws a zone per widget; Neon Rig (a Free page) opens its canvas editor, with the left panel on the fixture's tab.
      if (DESK.has(name)) await expect(page.locator("[data-zone-id]")).toHaveCount(5);
      else await expect(page.getByRole("tablist", { name: "Left panel" })).toBeVisible();
      await expect(page.getByRole("tab", { name: fixtureTab(name) })).toHaveAttribute("aria-selected", "true");
      await page.waitForTimeout(500);
      await shoot(page, name);
      expect(errors).toEqual([]);
    });

    for (const check of CHECKS[name]) {
      const built = BUILT[name]?.[check.text];
      if (built) {
        test(check.text, async ({ page, scratch }) => {
          await openFixture(page, scratch.base, name);
          await built(page);
        });
        continue;
      }
      test(check.text, async () => {
        test.skip(true, `Phase ${check.phase} of Edit v3 builds this`);
      });
    }
  });
}
