import { describe, expect, it } from "vitest";
import { followed, oneOf, wholeIn } from "@/widgets/recipe/follow";
import { inUnits, liveItem, placeId, placePrefix, placeState } from "@/widgets/recipe/weather";

// Weather by place on the page: the place id the server writes its keys under (the same cases as ips-server's weather_tests.rs),
// an item from the server's readings in the units and hours asked for, and a setting that follows an option.

describe("placeId", () => {
  it("is the coordinates rounded to a hundredth of a degree, as the server keys them", () => {
    expect(placeId(59.9139, 10.7522)).toBe("n5991e1075");
    expect(placeId(-33.8688, 151.2093)).toBe("s3387e15121");
    expect(placeId(40.7128, -74.006)).toBe("n4071w7401");
    expect(placeId(0.004, -0.004)).toBe("n0e0");
    // a half rounds away from zero, as Rust's f64::round does (JavaScript's Math.round would give -12)
    expect(placeId(-0.125, 0.125)).toBe("s13e13");
    expect(placePrefix({ lat: 59.912, lon: 10.748 })).toBe("weather.place.n5991e1075.");
  });
});

const OSLO = { name: "Oslo", lat: 59.91, lon: 10.75 };
const P = "weather.place.n5991e1075.";
const data = {
  [`${P}temp`]: "4.2 °C",
  [`${P}high`]: "6 °C",
  [`${P}low`]: "-1 °C",
  [`${P}wind`]: "16.1 km/h",
  [`${P}condition`]: "Light rain",
  [`${P}status`]: "stale",
  [`${P}age`]: "42 min",
  ...Object.fromEntries(Array.from({ length: 24 }, (_, n) => [`${P}hourly.${n}.temp`, `${n} °C`])),
};

describe("liveItem", () => {
  it("reads a place's fields from the server's readings, its hourly list cut to the hours asked for", () => {
    const item = liveItem(data, OSLO, 8, "metric");
    expect(item).toEqual({ name: "Oslo", temp: 4.2, high: 6, low: -1, wind: 16.1, condition: "Light rain", hourly: [0, 1, 2, 3, 4, 5, 6, 7] });
    expect((liveItem(data, OSLO, 24, "metric").hourly as number[]).length).toBe(24);
  });

  it("gives imperial temperatures and wind when asked", () => {
    const item = liveItem(data, OSLO, 2, "imperial");
    expect([item.temp, item.high, item.low, item.wind, item.hourly]).toEqual([40, 43, 30, 10, [32, 34]]);
  });

  it("has only the name before the first answer, and says how old the data is", () => {
    expect(liveItem({}, OSLO, 8, "metric")).toEqual({ name: "Oslo" });
    expect(placeState(data, OSLO)).toEqual({ status: "stale", age: 42 });
    expect(placeState({}, OSLO).status).toBe("");
  });

  it("converts a sample item the same way", () => {
    expect(inUnits({ name: "X", temp: 0, hourly: [0, 10, 20] }, 2, "imperial")).toEqual({ name: "X", temp: 32, hourly: [32, 50] });
  });
});

describe("followed", () => {
  const values = { layout: "grid", hours: 6, bad: 99 };
  it("is the fixed value, the option's own, or its choice mapped; else the default", () => {
    const n = wholeIn(1, 12);
    expect(followed(4, values, n, 8)).toBe(4);
    expect(followed({ option: "hours" }, values, n, 8)).toBe(6);
    expect(followed({ option: "layout", map: { grid: 3 } }, values, n, 8)).toBe(3);
    expect(followed({ option: "layout", map: { list: 3 } }, values, n, 8)).toBe(8);
    expect(followed({ option: "bad" }, values, n, 8)).toBe(8);
    expect(followed(undefined, values, n, 8)).toBe(8);
    expect(followed({ option: "layout", map: { grid: "columns" } }, values, oneOf(["rows", "columns"]), "rows")).toBe("columns");
  });
});
