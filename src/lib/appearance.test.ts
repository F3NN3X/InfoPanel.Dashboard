import { describe, expect, it } from "vitest";
import {
  backgroundKey,
  backgroundLayers,
  color,
  cssUrl,
  mediaUrl,
  normalizeBackground,
  posterBackground,
  resolveBackground,
  videoPolicy,
  videoStyle,
  mediaKindOf,
  withBackground,
  withBackgroundType,
  type PageBackground,
} from "./appearance";
import { mergeConfig, type DashboardConfig } from "./layout";

const image = (extra: Partial<PageBackground> = {}): PageBackground => ({
  type: "image",
  src: "/assets/ip/arcv2/arc-mono-ref.png",
  ...extra,
});

describe("resolveBackground", () => {
  const dash: PageBackground = { type: "color", color: "#112233" };
  const own: PageBackground = { type: "gradient", gradient: { from: "#000", to: "#fff", angle: 90 } };

  it("uses the profile's own background over the dashboard's", () => {
    expect(resolveBackground({ background: dash }, { background: own })).toBe(own);
  });

  it("inherits the dashboard's when the profile sets none", () => {
    expect(resolveBackground({ background: dash }, {})).toBe(dash);
  });

  it("treats an explicit none on the profile as no background", () => {
    expect(resolveBackground({ background: dash }, { background: { type: "none" } })).toBeUndefined();
  });

  it("is undefined when nothing is set or the dashboard is none", () => {
    expect(resolveBackground({}, {})).toBeUndefined();
    expect(resolveBackground({ background: { type: "none", color: "#fff" } }, {})).toBeUndefined();
  });

  it("lets a profile show one while the dashboard is none", () => {
    expect(resolveBackground({ background: { type: "none" } }, { background: dash })).toBe(dash);
  });

  it("shows only the fill (or nothing) for an image or video with no file yet", () => {
    expect(resolveBackground({ background: { type: "image" } }, {})).toBeUndefined();
    expect(resolveBackground({ background: { type: "video", color: "#123" } }, {})).toEqual({
      type: "color",
      color: "#123",
    });
  });
});

describe("backgroundLayers", () => {
  it("fills a color background with no media or overlay", () => {
    expect(backgroundLayers({ type: "color", color: "#123456", dim: 50 })).toEqual({
      fill: { backgroundColor: "#123456" },
      media: null,
      overlay: null,
    });
  });

  it("draws a gradient at its angle, without a fill", () => {
    const l = backgroundLayers({ type: "gradient", gradient: { from: "#111", to: "#eee", angle: 45 } });
    expect(l.fill).toEqual({});
    expect(l.media).toEqual({ backgroundImage: "linear-gradient(45deg, #111, #eee)" });
  });

  it("falls back to the default gradient and color", () => {
    expect(backgroundLayers({ type: "gradient" }).media?.backgroundImage).toMatch(/^linear-gradient\(160deg/);
    expect(backgroundLayers({ type: "color" }).fill.backgroundColor).toBe("#0b0b0f");
  });

  it.each([
    ["cover", "cover", "no-repeat"],
    ["contain", "contain", "no-repeat"],
    ["stretch", "100% 100%", "no-repeat"],
    ["center", "auto", "no-repeat"],
    ["tile", "auto", "repeat"],
  ] as const)("maps fit %s to size %s / %s", (fit, size, repeat) => {
    const { media } = backgroundLayers(image({ fit }));
    expect(media?.backgroundSize).toBe(size);
    expect(media?.backgroundRepeat).toBe(repeat);
  });

  it("covers, centered, by default, over the letterbox fill", () => {
    const l = backgroundLayers(image());
    expect(l.media).toMatchObject({
      backgroundImage: 'url("/assets/ip/arcv2/arc-mono-ref.png")',
      backgroundPosition: "center center",
      backgroundSize: "cover",
    });
    expect(l.fill).toEqual({ backgroundColor: "#0b0b0f" });
  });

  it("maps the nine positions to CSS keywords", () => {
    const pos = (x: "start" | "center" | "end", y: "start" | "center" | "end") =>
      backgroundLayers(image({ position: { x, y } })).media?.backgroundPosition;
    expect(pos("start", "start")).toBe("left top");
    expect(pos("end", "center")).toBe("right center");
    expect(pos("center", "end")).toBe("center bottom");
  });

  it("has no media for an image without a source (the fill shows)", () => {
    const l = backgroundLayers({ type: "image", color: "#222", dim: 40 });
    expect(l).toEqual({ fill: { backgroundColor: "#222" }, media: null, overlay: null });
  });

  it("stacks the tint over the dim in one overlay", () => {
    expect(backgroundLayers(image({ dim: 40 })).overlay).toEqual({
      backgroundImage: "linear-gradient(rgb(0 0 0 / 40%), rgb(0 0 0 / 40%))",
    });
    const both = backgroundLayers(image({ dim: 20, tint: "#ff0000", tintOpacity: 30 })).overlay;
    expect(both?.backgroundImage).toBe(
      "linear-gradient(color-mix(in srgb, #ff0000 30%, transparent), color-mix(in srgb, #ff0000 30%, transparent)), " +
        "linear-gradient(rgb(0 0 0 / 20%), rgb(0 0 0 / 20%))"
    );
  });

  it("ignores a tint with no opacity", () => {
    expect(backgroundLayers(image({ tint: "#ff0000" })).overlay).toBeNull();
  });

  it("blurs the media and bleeds it past the edges by twice the radius", () => {
    const { media } = backgroundLayers(image({ blur: 8 }));
    expect(media?.filter).toBe("blur(8px)");
    expect(media?.inset).toBe(-16);
    expect(backgroundLayers(image()).media?.filter).toBeUndefined();
  });

  it("gives a video only its fill color as CSS layers (the <video> element draws the media)", () => {
    expect(backgroundLayers({ type: "video", src: "/a.mp4", color: "#010101" })).toEqual({
      fill: { backgroundColor: "#010101" },
      media: null,
      overlay: null,
    });
  });

  it("escapes quotes in the image URL", () => {
    expect(cssUrl('/a"b\\c.png')).toBe('url("/a\\"b\\\\c.png")');
  });
});

describe("normalizeBackground", () => {
  it("drops non-objects and unknown types", () => {
    for (const bad of [undefined, null, "image", 3, [], {}, { type: "pattern" }]) {
      expect(normalizeBackground(bad)).toBeUndefined();
    }
  });

  it("keeps a valid background as it is", () => {
    const bg: PageBackground = {
      type: "image",
      src: "https://example.com/a.jpg",
      fit: "tile",
      position: { x: "end", y: "start" },
      dim: 30,
      tint: "#336699",
      tintOpacity: 25,
      blur: 6,
      color: "#000",
      gradient: { from: "#111", to: "#222", angle: 10 },
    };
    expect(normalizeBackground(bg)).toEqual(bg);
    expect(normalizeBackground({ type: "none" })).toEqual({ type: "none" });
  });

  it("clamps numbers and drops invalid fields", () => {
    expect(
      normalizeBackground({
        type: "image",
        src: "javascript:alert(1)",
        poster: 5,
        fit: "zoom",
        dim: 250,
        tintOpacity: -4,
        blur: 999,
        rate: 100,
        color: "red; background: url(x)",
        tint: "",
        loop: "yes",
        position: { x: "left" },
        gradient: { from: "#000" },
      })
    ).toEqual({ type: "image", dim: 100, tintOpacity: 0, blur: 40, rate: 4 });
  });

  it("wraps the gradient angle and fills a missing one", () => {
    expect(normalizeBackground({ type: "gradient", gradient: { from: "#0", to: "#1", angle: -90 } })?.gradient?.angle).toBe(270);
    expect(normalizeBackground({ type: "gradient", gradient: { from: "#0", to: "#1" } })?.gradient?.angle).toBe(160);
  });

  it("completes a half-set position", () => {
    expect(normalizeBackground({ type: "image", position: { y: "end" } })?.position).toEqual({ x: "center", y: "end" });
  });
});

describe("mediaUrl", () => {
  it("accepts http(s), paths and data images; refuses other schemes", () => {
    expect(mediaUrl(" /api/assets/abc ")).toBe("/api/assets/abc");
    expect(mediaUrl("http://127.0.0.1:3922/x.png")).toBe("http://127.0.0.1:3922/x.png");
    expect(mediaUrl("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(mediaUrl("data:text/html,<b>")).toBeUndefined();
    expect(mediaUrl("file:///C:/x.png")).toBeUndefined();
    expect(mediaUrl("/a\nb")).toBeUndefined();
    expect(mediaUrl("")).toBeUndefined();
  });

  it("refuses protocol-relative URLs that would load from another host", () => {
    expect(mediaUrl("//evil.example/x.png")).toBeUndefined();
    expect(mediaUrl("/\\evil.example/x.png")).toBeUndefined();
    expect(mediaUrl("\\\\evil.example\\x.png")).toBeUndefined();
  });
});

describe("color", () => {
  it("accepts hex, names and color functions", () => {
    for (const c of ["#abc", "#11223344", "teal", "rgb(1, 2, 3)", "hsl(220 15% 10% / .5)", "color-mix(in srgb, red 40%, transparent)", "var(--accent)"])
      expect(color(c)).toBe(c);
  });

  it("refuses values that could fetch or break out of the CSS value", () => {
    for (const c of ["red), url(//evil.example/x", "url(//evil.example)", "image-set('x')", "red; top: 0", "red\"", ""])
      expect(color(c)).toBeUndefined();
  });

  it("drops a bad tint or gradient color from a stored background", () => {
    expect(normalizeBackground({ type: "color", color: "url(//evil)", tint: "red),url(//x" })).toEqual({ type: "color" });
  });
});

describe("withBackground", () => {
  const config = (): DashboardConfig =>
    mergeConfig({
      profiles: [
        { id: "a", name: "A", width: 800, height: 480, cols: 4, rows: 2, fit: "fill", placements: [] },
        { id: "b", name: "B", width: 800, height: 480, cols: 4, rows: 2, fit: "fill", placements: [] },
      ],
    });
  const bg: PageBackground = { type: "color", color: "#abcdef" };

  it("sets the dashboard background for all profiles", () => {
    const next = withBackground(config(), { kind: "all" }, bg);
    expect(next.background).toBe(bg);
    expect(next.profiles.every((p) => resolveBackground(next, p) === bg)).toBe(true);
  });

  it("sets and clears one profile's background, leaving the others", () => {
    const set = withBackground(config(), { kind: "profile", profileId: "a" }, { type: "none" });
    expect(set.profiles.find((p) => p.id === "a")?.background).toEqual({ type: "none" });
    expect(set.profiles.find((p) => p.id === "b")?.background).toBeUndefined();
    const cleared = withBackground(set, { kind: "profile", profileId: "a" }, undefined);
    expect(cleared.profiles.find((p) => p.id === "a")?.background).toBeUndefined();
  });

  it("keys undo steps per scope", () => {
    expect(backgroundKey({ kind: "all" })).toBe("background:all");
    expect(backgroundKey({ kind: "profile", profileId: "a" })).toBe("background:a");
  });
});

describe("video backgrounds", () => {
  const video = (extra: Partial<PageBackground> = {}): PageBackground => ({
    type: "video",
    src: "/api/assets/a.mp4",
    ...extra,
  });

  it("plays, pauses while hidden, and shows the poster on reduced motion", () => {
    expect(videoPolicy({ motion: "full", hidden: false })).toBe("play");
    expect(videoPolicy({ motion: "full", hidden: true })).toBe("pause");
    expect(videoPolicy({ motion: "reduce", hidden: false })).toBe("poster");
    expect(videoPolicy({ motion: "reduce", hidden: true })).toBe("poster");
  });

  it("shows the poster as an image with the video's look, or the fill without one", () => {
    const bg = video({ poster: "/p.png", fit: "contain", dim: 30, color: "#111" });
    expect(posterBackground(bg)).toEqual({ ...bg, type: "image", src: "/p.png" });
    expect(posterBackground(video({ color: "#111" }))).toEqual({ type: "color", src: undefined, color: "#111" });
  });

  it("dims and tints over a video", () => {
    expect(backgroundLayers(video({ dim: 40 })).overlay).toEqual({
      backgroundImage: "linear-gradient(rgb(0 0 0 / 40%), rgb(0 0 0 / 40%))",
    });
    expect(backgroundLayers({ type: "video", dim: 40 }).overlay).toBeNull();
  });

  it.each([
    ["cover", "cover"],
    ["contain", "contain"],
    ["stretch", "fill"],
    ["center", "none"],
    ["tile", "none"],
  ] as const)("fits %s as object-fit %s", (fit, objectFit) => {
    expect(videoStyle(video({ fit })).objectFit).toBe(objectFit);
  });

  it("positions the frame and fills the page", () => {
    expect(videoStyle(video({ position: { x: "start", y: "end" } }))).toEqual({
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "left bottom",
    });
  });

  it("blurs with the same edge bleed as an image", () => {
    const style = videoStyle(video({ blur: 5 }));
    expect(style).toMatchObject({ filter: "blur(5px)", left: -10, top: -10, width: "calc(100% + 20px)" });
  });
});

describe("withBackgroundType", () => {
  it("names a URL's media kind by its extension", () => {
    expect(mediaKindOf("/assets/bg/aurora.png")).toBe("image");
    expect(mediaKindOf("https://x.test/clip.WEBM?v=2")).toBe("video");
    expect(mediaKindOf("https://x.test/stream")).toBeUndefined();
    expect(mediaKindOf(undefined)).toBeUndefined();
  });

  it("moves an image to the poster when switching to video", () => {
    expect(withBackgroundType({ type: "image", src: "/a.png", dim: 20 }, "video")).toEqual({
      type: "video",
      poster: "/a.png",
      dim: 20,
    });
    expect(withBackgroundType({ type: "image", src: "/a.png", poster: "/p.jpg" }, "video")).toEqual({
      type: "video",
      poster: "/p.jpg",
    });
  });

  it("shows the poster when a video switches to image, and keeps the poster", () => {
    expect(withBackgroundType({ type: "video", src: "/v.webm", poster: "/p.jpg" }, "image")).toEqual({
      type: "image",
      src: "/p.jpg",
      poster: "/p.jpg",
    });
    expect(withBackgroundType({ type: "video", src: "/v.webm" }, "image")).toEqual({ type: "image" });
  });

  it("keeps the source when its kind fits or is unknown, and for the other types", () => {
    expect(withBackgroundType({ type: "image", src: "https://x.test/stream" }, "video").src).toBe("https://x.test/stream");
    expect(withBackgroundType({ type: "video", src: "/v.mp4" }, "color")).toEqual({ type: "color", src: "/v.mp4" });
  });
});
