import { afterEach, describe, expect, it, vi } from "vitest";
import { addPlace, movePlace, placeList, placeOf, searchPlaces, usesHere, withHere } from "@/components/studio/place-list/place-search";

// Place lists of Weather by place: the search goes to the dashboard server's route only (never the provider), a hit is stored to
// the server's precision, and "Use this PC's location first" puts the picked place first once.

afterEach(() => vi.unstubAllGlobals());

const OSLO = { name: "Oslo", lat: 59.91, lon: 10.75 };
const TOKYO = { name: "Tokyo", lat: 35.68, lon: 139.69 };

describe("place search", () => {
  it("asks the dashboard server's route, and reads its hits", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify([{ name: "Brevik", admin1: "Telemark", country: "Norway", lat: 59.0533, lon: 9.7007 }, { name: 3 }]), { status: 200 });
    });
    expect(await searchPlaces(" Brevik ")).toEqual({ found: [{ name: "Brevik", admin1: "Telemark", country: "Norway", lat: 59.0533, lon: 9.7007 }] });
    expect(calls).toEqual(["/api/weather/places?q=Brevik&lang=en"]);
    expect(await searchPlaces("B")).toEqual({ found: [] });
    expect(calls).toHaveLength(1);
  });

  it("says why there is nothing: the source off, the server's refusal, no answer", async () => {
    vi.stubGlobal("fetch", async () => new Response("weather by place is off", { status: 403, headers: { "X-Weather": "off" } }));
    expect((await searchPlaces("Oslo")).error).toBe("Weather by place is off on this server");
    vi.stubGlobal("fetch", async () => new Response("too many place searches; try again in a minute", { status: 429 }));
    expect((await searchPlaces("Oslo")).error).toBe("too many place searches; try again in a minute");
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    expect((await searchPlaces("Oslo")).error).toBe("the dashboard server did not answer");
  });
});

describe("a place list", () => {
  it("stores a hit to a hundredth of a degree, and each spot once, at most twelve", () => {
    expect(placeOf({ name: "Brevik", lat: 59.0533, lon: 9.7007 })).toEqual({ name: "Brevik", lat: 59.05, lon: 9.7 });
    expect(addPlace([OSLO], { ...OSLO, name: "Oslo again" })).toEqual([OSLO]);
    expect(addPlace([OSLO], TOKYO)).toEqual([OSLO, TOKYO]);
    const twelve = Array.from({ length: 12 }, (_, k) => ({ name: `P${k}`, lat: k, lon: k }));
    expect(addPlace(twelve, TOKYO)).toHaveLength(12);
  });

  it("reads a stored list (JSON text) and moves a place", () => {
    expect(placeList(JSON.stringify([OSLO, { name: "bad" }, TOKYO]))).toEqual([OSLO, TOKYO]);
    expect(placeList("not json")).toEqual([]);
    expect(movePlace([OSLO, TOKYO], 1, 0)).toEqual([TOKYO, OSLO]);
    expect(movePlace([OSLO, TOKYO], 1, 2)).toEqual([OSLO, TOKYO]);
  });

  it("puts this PC's place first once, and takes it away again", () => {
    const here = withHere([OSLO, TOKYO], { name: "Brevik", lat: 59.0533, lon: 9.7007 });
    expect(here).toEqual([{ name: "Brevik", lat: 59.05, lon: 9.7, here: true }, OSLO, TOKYO]);
    expect(usesHere(here)).toBe(true);
    expect(withHere(here, TOKYO)[0]).toEqual({ ...TOKYO, here: true });
    expect(withHere(here, TOKYO)).toHaveLength(3);
    expect(withHere(here, undefined)).toEqual([OSLO, TOKYO]);
    expect(usesHere([OSLO])).toBe(false);
  });
});
