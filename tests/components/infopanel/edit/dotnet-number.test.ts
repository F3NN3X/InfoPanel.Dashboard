import { describe, expect, it } from "vitest";
import { dotnetDouble, dotnetFloat } from "@/components/infopanel/edit/dotnet-number";

describe("number formats", () => {
  it("writes doubles and floats as XmlConvert does", () => {
    expect([1, 0.5, 2.675, 1e-7, 1e21, -0, Infinity, -Infinity, NaN].map(dotnetDouble)).toEqual(["1", "0.5", "2.675", "1E-7", "1E+21", "-0", "INF", "-INF", "NaN"]);
    expect([Math.fround(1.33), Math.fround(0.1), 3, Math.fround(16777217)].map(dotnetFloat)).toEqual(["1.33", "0.1", "3", "16777216"]);
  });
});
