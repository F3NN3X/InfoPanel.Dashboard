import { describe, expect, it } from "vitest";
import { FONT_IDS, fontById, type FontDocument } from "@/lib/fonts";
import { ensureSkinFonts } from "./fonts";
import { SKIN_PACKS } from "./theme";

/** A document stand-in that records appended links. */
function fakeDocument() {
  const links: { id: string; href: string }[] = [];
  const doc = {
    head: { appendChild: (n: { id: string; href: string }) => links.push(n) },
    getElementById: (id: string) => links.find((l) => l.id === id) ?? null,
    createElement: () => ({ id: "", rel: "", href: "" }),
  } as unknown as FontDocument;
  return { doc, links };
}

describe("skin fonts", () => {
  it("lists only catalog ids, each a downloadable font", () => {
    for (const pack of SKIN_PACKS)
      for (const id of pack.fonts) expect(fontById(id)?.google, `${pack.name}: ${id}`).toBeDefined();
  });

  it("keeps the existing catalog ids in place", () => {
    expect(FONT_IDS.slice(0, 18)).toEqual([
      "system", "sans", "rounded", "serif", "mono", "inter", "geist", "roboto", "manrope", "outfit",
      "space-grotesk", "ibm-plex-sans", "nunito", "rajdhani", "orbitron", "oswald", "jetbrains-mono", "fira-code",
    ]);
  });

  it("loads a skin's fonts once", () => {
    const { doc, links } = fakeDocument();
    ensureSkinFonts("instrument", doc);
    ensureSkinFonts("instrument", doc);
    expect(links.map((l) => l.id)).toEqual(["font-ibm-plex-sans", "font-ibm-plex-mono", "font-archivo"]);
  });

  it("does nothing for system-font skins, unknown skins or without a document", () => {
    const { doc, links } = fakeDocument();
    ensureSkinFonts("macos", doc);
    ensureSkinFonts("nope", doc);
    expect(links).toHaveLength(0);
    expect(() => ensureSkinFonts("tui", undefined)).not.toThrow();
  });
});
