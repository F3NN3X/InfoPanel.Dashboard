/// <reference types="vite/client" />
// InfoPanel's own profiles (the corpus stands in for them) imported, edited and kept as the studio keeps them: the stored
// form between import and save gives back the same profile and items, and an edit changes that item and nothing else.
import { describe, expect, it } from "vitest";
import { readStored, toStored } from "@/lib/infopanel/import/stored.ts";
import { parseDisplayItemsXml, parseProfileXml } from "@/lib/infopanel/parse.ts";
import type { DisplayItem, Profile } from "@/lib/infopanel/schema.ts";

const xml = import.meta.glob<string>("../corpus/*/*.xml", { query: "?raw", import: "default", eager: true });
const ids = [...new Set(Object.keys(xml).map((k) => k.split("/").at(-2) as string))];

/** The studio's keeping of a document: to the stored form, through JSON as a saved config is, and back. */
const kept = (profile: Profile, items: DisplayItem[]) =>
  readStored(JSON.parse(JSON.stringify(toStored({ name: "x", origin: "file", dataApi: null, defaultMode: "infopanel", profile, items, assets: new Map(), keyOf: () => null, fonts: [] }))));

describe.skipIf(ids.length === 0)("corpus: import, keep, import", () => {
  it.each(ids)("%s comes back from the stored form as it went in, twice over", (id) => {
    const profile = parseProfileXml(xml[`../corpus/${id}/Profile.xml`]).profile;
    const items = parseDisplayItemsXml(xml[`../corpus/${id}/DisplayItems.xml`]).items;
    const first = kept(profile, items);
    expect(first.profile).toEqual(profile);
    expect(first.items).toEqual(items);
    const second = kept(first.profile, first.items);
    expect(second.profile).toEqual(first.profile);
    expect(second.items).toEqual(first.items);
  });

  it.each(ids)("%s: an edit changes that item and nothing else", (id) => {
    const items = parseDisplayItemsXml(xml[`../corpus/${id}/DisplayItems.xml`]).items;
    const profile = parseProfileXml(xml[`../corpus/${id}/Profile.xml`]).profile;
    const imported = kept(profile, items);
    const edited: DisplayItem[] = imported.items.map((item, i) => (i === 0 ? { ...item, X: item.X + 1 } : item));
    const back = kept(imported.profile, edited);
    expect(back.items).toEqual(edited);
    expect(back.items.slice(1)).toEqual(imported.items.slice(1));
    expect(back.profile).toEqual(imported.profile);
  });
});
