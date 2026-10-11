import { describe, expect, it } from "vitest";
import { parseForecast, parseForecastLine } from "./forecast";

describe("parseForecastLine", () => {
  it("parses a full yr line", () => {
    expect(parseForecastLine("Thu 8 Oct, Light rain, 12 °C / 4 °C, 8.1mm, 4.5 m/s N")).toEqual({
      date: "Thu 8 Oct",
      desc: "Light rain",
      high: 12,
      low: 4,
      precip: 8.1,
      wind: "4.5 m/s N",
    });
  });

  it("keeps negative temperatures and tolerates missing fields", () => {
    expect(parseForecastLine("Fri 9 Oct, Snow, -2 °C / -7.5 °C")).toEqual({
      date: "Fri 9 Oct",
      desc: "Snow",
      high: -2,
      low: -7.5,
      precip: undefined,
    });
    expect(parseForecastLine("Sat 10 Oct")).toEqual({ date: "Sat 10 Oct", precip: undefined });
  });
});

describe("parseForecast", () => {
  const text = "Mon 12, Sun, 9 °C / 2 °C\n\n  Tue 13, Rain, 10 °C / 3 °C, 32.9mm \nWed 14, Cloudy, 14 °C / 7 °C\n";

  it("skips blank lines and caps the day count", () => {
    const days = parseForecast(text, 2);
    expect(days.map((d) => d.date)).toEqual(["Mon 12", "Tue 13"]);
    expect(days[1].precip).toBe(32.9);
  });

  it("returns nothing for missing text", () => {
    expect(parseForecast(undefined, 5)).toEqual([]);
    expect(parseForecast("", 5)).toEqual([]);
  });
});
