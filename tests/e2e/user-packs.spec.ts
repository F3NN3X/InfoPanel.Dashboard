import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, manifest, settled, test, watchErrors } from "./fixtures";

// User packs (P12b): a pack folder is imported in the Look gallery into the scratch data folder, worn on a screen and drawn by the kiosk
// from /api/packs; the page asks for nothing but its own origin (no font host). A hostile pack is refused with the issue shown and
// nothing is stored.

const { light } = manifest.profiles;
const FIELD_KIT = path.join("src", "looks", "packs", "field-kit");

/** Field Kit's files as a pack of this user under `dest/<id>`: its own id and font families, no pack.css, every asset listed. */
function makePack(dest: string, id: string, edit: (dir: string) => void = () => {}): string {
  const dir = path.join(dest, id);
  fs.cpSync(FIELD_KIT, dir, { recursive: true, filter: (src) => !/\.tsx?$|pack\.css$/.test(src) });
  edit(dir);
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const pack = read("pack.json");
  const look = read("look.json");
  pack.id = look.id = id;
  pack.name = look.name = "Mine";
  pack.fonts = pack.fonts.map((f: { family: string }) => ({ ...f, family: f.family.replace("pack-", `pack-${id}-`) }));
  for (const k of Object.keys(look.fonts)) look.fonts[k] = look.fonts[k].replace("pack-", `pack-${id}-`);
  pack.assets = fs.readdirSync(path.join(dir, "assets")).map((file) => ({ file, bytes: fs.statSync(path.join(dir, "assets", file)).size }));
  fs.writeFileSync(path.join(dir, "pack.json"), JSON.stringify(pack));
  fs.writeFileSync(path.join(dir, "look.json"), JSON.stringify(look));
  return dir;
}

const packsOf = async (base: string) => (await (await fetch(`${base}/api/packs`)).json()) as { id: string }[];

test("a valid pack is imported, worn and drawn from the route with no request past this origin; a hostile one is refused", async ({ page, scratch }) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ips-user-pack-"));
  try {
    const { errors } = watchErrors(page);
    // the screens' own page font is a system one: the app's default Geist is a Google font, which is not what is checked here
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.profiles = stored.profiles.map((p: object) => ({ ...p, font: "system" }));
    fs.writeFileSync(file, JSON.stringify(stored));
    // what the screen asks for in Classic, for the comparison below
    const baseline: string[] = [];
    const classic = await page.context().newPage();
    classic.on("request", (r) => baseline.push(r.url()));
    await classic.goto(`${scratch.base}/?kiosk=1&profile=${light}`);
    await expect(classic.locator(manifest.kioskZoneSelector).first()).toBeAttached({ timeout: 15_000 });
    await settled(classic, manifest.kioskZoneSelector);
    await classic.close();
    await page.goto(`${scratch.base}/?studio=1&profile=${light}`);
    await page.getByRole("button", { name: "Look", exact: true }).click();
    await page.getByRole("group", { name: "Look level" }).getByRole("button", { name: /Perf light/ }).click();
    const section = page.getByRole("region", { name: "Your packs" });
    await expect(section).toBeVisible();

    // A hostile pack: a script in an SVG. The issue is shown in words and the server stores nothing.
    const hostile = makePack(tmp, "bad", (dir) => fs.writeFileSync(path.join(dir, "assets", "hazard.svg"), '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
    await section.locator("[data-pack-folder]").setInputFiles(hostile);
    const report = section.locator("[data-pack-report]");
    await expect(report).toContainText("can't be imported");
    await expect(report.locator('[data-pack-issue="error"]').first()).toContainText("assets/hazard.svg");
    expect(await packsOf(scratch.base)).toEqual([]);
    // A pack with its own style sheet is refused too
    const styled = makePack(tmp, "styled");
    fs.copyFileSync(path.join(FIELD_KIT, "pack.css"), path.join(styled, "pack.css"));
    await section.locator("[data-pack-folder]").setInputFiles(styled);
    await expect(report).toContainText("cannot bring its own stylesheet");
    expect(await packsOf(scratch.base)).toEqual([]);

    // A valid pack: imported, listed beside the built-ins, worn with one click.
    await section.locator("[data-pack-folder]").setInputFiles(makePack(tmp, "mine"));
    await expect(report).toContainText("Imported Mine");
    expect((await packsOf(scratch.base)).map((p) => p.id)).toEqual(["mine"]);
    const card = page.locator('[data-look-card="mine"]');
    await expect(card).toContainText("your pack");
    await card.click();
    await expect.poll(async () => {
      const config = await (await fetch(`${scratch.base}/api/config`)).json();
      return config.profiles.find((p: { id: string }) => p.id === light)?.widgetTheme?.values?.lookId;
    }).toBe("mine");

    // The kiosk draws it, from /api/packs, with its own faces loaded, and asks for nothing outside this origin.
    const kiosk = await page.context().newPage();
    const requests: string[] = [];
    kiosk.on("request", (r) => requests.push(r.url()));
    await kiosk.setViewportSize({ width: 1280, height: 720 });
    await kiosk.goto(`${scratch.base}/?kiosk=1&profile=${light}`);
    await expect(kiosk.locator('[data-wp-tier][data-look="mine"]').first()).toBeAttached({ timeout: 15_000 });
    await settled(kiosk, manifest.kioskZoneSelector);
    const face = await kiosk.evaluate(async () => {
      const num = document.querySelector('[data-wp-tier] [data-part="num"]');
      const first = num ? getComputedStyle(num).fontFamily.split(",")[0].trim().replace(/["']/g, "") : "";
      await document.fonts.ready;
      return { first, loaded: !!first && document.fonts.check(`16px ${first}`) };
    });
    expect(face).toEqual({ first: "pack-mine-field-kit", loaded: true });
    const packRequests = requests.filter((u) => u.includes("/packs/") || u.endsWith(".woff2"));
    expect(packRequests.length).toBeGreaterThan(3);
    expect(packRequests.every((u) => u.startsWith(`${scratch.base}/api/packs/mine/`))).toBe(true);
    // Nothing outside this origin that the same screen does not ask for in Classic (its own sensor sources and the app's default font), and no font host for the pack
    const outside = (list: string[]) => [...new Set(list.filter((u) => !u.startsWith(scratch.base) && !u.startsWith("data:") && !u.startsWith("blob:")).map((u) => u.replace(/:\d+\//, "/")))];
    expect(outside(requests).filter((u) => !outside(baseline).includes(u))).toEqual([]);
    expect(requests.filter((u) => /\.woff2/.test(u)).every((u) => u.startsWith(`${scratch.base}/api/packs/mine/assets/`))).toBe(true);

    // Removing the worn pack: the screen draws Classic and says so.
    await page.getByRole("button", { name: "Remove Mine" }).click();
    await expect(section.getByRole("status").last()).toContainText("Classic");
    await expect.poll(async () => (await packsOf(scratch.base)).length).toBe(0);
    await expect.poll(async () => {
      const config = await (await fetch(`${scratch.base}/api/config`)).json();
      return JSON.stringify(config).includes('"lookId":"mine"');
    }).toBe(false);
    expect(errors.filter((e) => !e.includes("/api/packs/"))).toEqual([]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
