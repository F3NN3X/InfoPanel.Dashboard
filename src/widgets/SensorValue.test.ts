import { describe, expect, it } from "vitest";
import { isNumericText } from "./SensorValue";

describe("isNumericText", () => {
  it("accepts a number with an optional unit", () => {
    for (const v of ["62.5", "62.5 %", "-4 °C", "1,234 MB/s", "62,5%", "3200 RPM"]) expect(isNumericText(v), v).toBe(true);
  });
  it("keeps addresses, times, versions, dates and resolutions as text", () => {
    for (const v of ["192.168.1.5", "12:30", "1.2.3", "2024-01-05", "1920x1080", "3 / 4", "online", ""]) expect(isNumericText(v), v).toBe(false);
  });
});
