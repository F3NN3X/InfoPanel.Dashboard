/// <reference types="vite/client" />
// Studio elements on real profiles: every extracted corpus profile with one of each element added and kept through the
// stored form. The profile's own items must come back exactly as they were. Skips when `npm run lab:extract` has not
// been run.
import { describe, expect, it } from "vitest";
import { loadExport, type ExportEntry } from "@/lib/infopanel/archive.ts";
import { bindItem, storeItems } from "@/lib/infopanel/canvas-edit.ts";
import { newCores, newElement } from "@/lib/infopanel/elements/create.ts";
import { defaultPalette } from "@/lib/infopanel/elements/palette.ts";
import { newStored, readStored } from "@/lib/infopanel/import/stored.ts";
import type { DisplayItem } from "@/lib/infopanel/schema.ts";

const xml = import.meta.glob<string>("../corpus/*/*.xml", { query: "?raw", import: "default", eager: true });
const indexFiles = import.meta.glob<{ id: string; entries: string[] }[]>("../corpus/index.json", { import: "default", eager: true });
const index = Object.values(indexFiles)[0] ?? [];
const enc = new TextEncoder();

const entriesFor = (id: string): ExportEntry[] =>
  ["Profile.xml", "DisplayItems.xml"].map((name) => ({ name, read: async () => enc.encode(xml[`../corpus/${id}/${name}`]) }));

const LAB_FIELDS = new Set(["vector", "vectorBaked", "element", "elementBaked", "slots", "native"]);
const plain = (items: readonly DisplayItem[]) => JSON.parse(JSON.stringify(items, (k, v) => (LAB_FIELDS.has(k) || k === "unknown" ? undefined : v)));

describe.skipIf(index.length === 0)("studio elements on corpus profiles", () => {
  describe.each(index.map((p) => [p.id] as const))("%s", (id) => {
    it("keeps the profile's own items unchanged and every element as an item of its own", async () => {
      const { profile, items } = await loadExport(entriesFor(id));
      const palette = defaultPalette(profile);
      const cpu = { key: "libre.cpu", name: "CPU Total", unit: "%", ref: "libre:/amdcpu/0/load/0" };
      const cores = [1, 2].map((n) => ({ key: `libre.c${n}`, name: `Core #${n}`, unit: "%", ref: `libre:/amdcpu/0/load/${n + 1}`, core: n, thread: 0 }));
      const added = [
        ...(["ring", "ledbar", "sparkline"] as const).map((t) => bindItem(newElement(t, profile, palette), cpu)),
        ...(["card", "glow", "divider", "icon"] as const).map((t) => newElement(t, profile, palette)),
        newCores(profile, palette, cores, 10, 10),
      ];
      // Through the stored form, as the editor keeps it.
      const stored = JSON.parse(JSON.stringify(storeItems(newStored({ name: id, width: profile.Width, height: profile.Height }), profile, [...items, ...added])));
      const read = readStored(stored);
      expect(read.issues.filter((i) => i.code !== "unknown-field")).toEqual([]);
      expect(plain(read.items.slice(0, items.length))).toEqual(plain(items));
      expect(read.items.slice(items.length).map((i) => i.kind)).toEqual(["Gauge", "Gauge", "Graph", "Shape", "Image", "Shape", "Image", "Group"]);
    });
  });
});
