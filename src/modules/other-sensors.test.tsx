import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OtherSensors } from "./other-sensors";

type Unclaimed = Parameters<typeof OtherSensors>[0]["unclaimed"];
const html = (unclaimed: unknown) => renderToString(<OtherSensors unclaimed={unclaimed as Unclaimed} settings={{}} subCols={2} />);

// visual-review / ledger #37: the sensor source line and multi-line values
describe("OtherSensors parity", () => {
  it("shows the sensor source line under a text value and a numeric one", () => {
    const out = html([
      ["acme.note", { text: "hello", unit: "", source: "Acme Plugin" }],
      ["acme.temp", { value: 41.25, unit: "°C", source: "Board Monitor" }],
    ]);
    expect(out).toContain("Acme Plugin");
    expect(out).toContain("Board Monitor");
  });

  it("shows no source line when the sensor has none", () => {
    expect(html([["acme.note", { text: "hello", unit: "" }]])).not.toContain("text-[11px] text-[color:var(--w-faint)]");
  });

  it("keeps every line of a multi-line value (no 3-line clamp)", () => {
    const out = html([["acme.table", { text: "a\nb\nc\nd\ne", unit: "" }]]);
    expect(out).toContain("a\nb\nc\nd\ne");
    expect(out).not.toContain("line-clamp-3");
  });
});
