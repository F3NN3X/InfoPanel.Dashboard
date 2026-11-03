import { describe, expect, it } from "vitest";
import { detect, diskName, rowLabel, shortLabel, diskShort, firstDisk, fmtDate, fmtGB, fmtRate, gbParts, rateParts } from "@/widgets/core/data";

describe("fmtRate", () => {
  it("reads the rate sensors as bytes per second and scales them (decimal prefixes)", () => {
    expect(fmtRate(0)).toBe("0 B/s");
    expect(fmtRate(512)).toBe("512 B/s");
    expect(fmtRate(217_662)).toBe("218 KB/s");
    expect(fmtRate(3_276_000)).toBe("3.28 MB/s");
    expect(fmtRate(107_450_768)).toBe("107 MB/s"); // an Ethernet max: ~860 Mb/s, not 102 GB/s
    expect(fmtRate(2_330_114_048)).toBe("2.33 GB/s");
    expect(fmtRate(NaN)).toBe("–");
  });

  it("rateParts scales the number and unit apart, so a tile never rounds a KB/s reading to 0 MB/s", () => {
    expect(rateParts(13_500)).toEqual({ text: "13.5", unit: "KB/s" });
    expect(rateParts(3_276_000)).toEqual({ text: "3.28", unit: "MB/s" });
    expect(rateParts(0)).toEqual({ text: "0", unit: "B/s" });
  });

});

describe("identical drives", () => {
  // The Data API numbers the second and later drives of one model ("KINGSTON SFYRD2000G #2" → `__2`).
  const data = {
    "libre.kingston_sfyrd2000g_power_on_hours": "13171 h",
    "libre.kingston_sfyrd2000g__2_power_on_hours": "13172 h",
    "libre.kingston_sfyrd2000g__3_power_on_hours": "13172 h",
    "libre.samsung_ssd_980_power_on_hours": "5 h",
  };

  it("are found as separate drives", () => {
    expect(detect(data, /^libre\.(.+)_power_on_hours$/)).toHaveLength(4);
  });

  it("are named with their instance, and a model number is not mistaken for one", () => {
    expect(diskName("kingston_sfyrd2000g__2")).toBe("Kingston SFYRD2000G #2");
    expect(diskShort("kingston_sfyrd2000g__3")).toBe("Kingston #3");
    expect(diskShort("kingston_sfyrd2000g")).toBe("Kingston");
    expect(diskName("samsung_ssd_980")).toBe("Samsung SSD 980");
  });

  it("default to a model's first drive", () => {
    expect(firstDisk(["wdc_x__2", "kingston_y", "wdc_x"])).toBe("kingston_y");
    expect(firstDisk(["wdc_x__2"])).toBe("wdc_x__2");
    expect(firstDisk([])).toBeUndefined();
  });
});

describe("fmtDate", () => {
  const d = new Date(2026, 9, 26); // Monday
  it("writes each style through the given locale", () => {
    expect(fmtDate(d, "short", "en-US")).toBe("Mon, Oct 26");
    expect(fmtDate(d, "weekday", "en-US")).toBe("Mon");
    expect(fmtDate(d, "long", "en-US")).toBe("October 26, 2026");
  });
  it("follows another locale and treats an empty one as the browser's", () => {
    expect(fmtDate(d, "weekday", "de-DE")).toBe("Mo");
    expect(fmtDate(d, "weekday", "")).toBe(fmtDate(d, "weekday"));
  });
});

describe("shortLabel", () => {
  it("drops the vendor and puts the metric first, the unit saying load or temperature", () => {
    expect(shortLabel("AMD Ryzen 9 9950X3D CPU Total", "%")).toMatchObject({ metric: "CPU load", model: "Ryzen 9 9950X3D" });
    expect(shortLabel("NVIDIA GeForce RTX 5090 GPU Core", "°C")).toMatchObject({ metric: "GPU temp", model: "RTX 5090" });
    expect(shortLabel("Intel(R) Core i7-13700K CPU Package", "°C").model).toBe("Core i7-13700K");
  });

  it("takes the device from the model family when the name has no CPU or GPU word", () => {
    expect(shortLabel("Ryzen 9 9950X3D Core (Tctl/Tdie)", "°C")).toMatchObject({ metric: "CPU temp", model: "Ryzen 9 9950X3D" });
  });

  it("keeps a name with no CPU or GPU in it as its own metric", () => {
    expect(shortLabel("Memory Used", "%")).toMatchObject({ metric: "Memory Used", model: "" });
  });

  it("adds the device only where two rows share a metric", () => {
    const a = shortLabel("AMD Ryzen 9 9950X3D CPU Total", "%"),
      b = shortLabel("Intel Core i9 CPU Total", "%");
    expect(rowLabel(a, [a, b])).toBe("CPU load · Ryzen 9 9950X3D");
    expect(rowLabel(a, [a, shortLabel("NVIDIA GeForce RTX 5090 GPU Core", "%")])).toBe("CPU load");
  });
});

describe("shortLabel on names that are not a bare load or temperature", () => {
  it("keeps the remaining words so a memory or fan reading is not called load", () => {
    expect(shortLabel("NVIDIA GeForce RTX 5090 GPU Memory Used", "%").metric).toBe("GPU memory used");
    expect(shortLabel("NVIDIA GeForce RTX 5090 GPU Fan", "%").metric).toBe("GPU fan");
    expect(shortLabel("AMD Ryzen 9 9950X3D CPU Package", "W").metric).toBe("CPU");
  });

  it("tells numbered cores apart", () => {
    const a = shortLabel("AMD Ryzen 9 9950X3D CPU Core #1", "%"),
      b = shortLabel("AMD Ryzen 9 9950X3D CPU Core #2", "%");
    expect(a.metric).not.toBe(b.metric);
  });

  it("falls back to the full name when rows still collide after the device is added", () => {
    const a = shortLabel("AMD Ryzen 9 9950X3D CPU Total", "%"),
      b = shortLabel("AMD Ryzen 9 9950X3D CPU Core", "%");
    expect(rowLabel(a, [a, b])).toBe("AMD Ryzen 9 9950X3D CPU Total");
  });
});

describe("gbParts", () => {
  it("splits a size into its number and unit, a TB from 1024 GB", () => {
    expect(gbParts(12.34)).toEqual(["12.3", "GB"]);
    expect(gbParts(193)).toEqual(["193", "GB"]);
    expect(gbParts(2048)).toEqual(["2.0", "TB"]);
  });
  it("is what fmtGB joins", () => {
    expect(fmtGB(12.34)).toBe("12.3 GB");
  });
});
