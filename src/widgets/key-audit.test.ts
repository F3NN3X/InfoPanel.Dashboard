/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import snapshot from "./__fixtures__/snapshot.json";

/**
 * Every data key a widget spec reads must exist in a real /api/sensors
 * snapshot, except vendor alternatives this machine doesn't have.
 */
const SPECS = import.meta.glob<string>("../../docs/redesign/widgets/docs/widgets/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const keys = Object.keys(snapshot.sensors);

/** Prefixes for hardware the snapshot machine doesn't have (Intel CPU, AMD/Intel GPU, other SSD brands). */
const ABSENT_VENDORS = new Set([
  "libre.intel_",
  "libre.amd_radeon",
  "libre.intel_arc",
  "libre.samsung_",
  "libre.crucial_",
  "libre.wd_",
]);

function specKeys(md: string): string[] {
  const section = md.split("Keys read")[1]?.split("\n## ")[0] ?? "";
  return [...section.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
}

describe("widget spec keys resolve against the snapshot", () => {
  const specs = Object.entries(SPECS);
  it("finds all 45 specs", () => expect(specs).toHaveLength(45));
  for (const [path, md] of specs) {
    it(path.split("/").pop() ?? path, () => {
      const missing = specKeys(md)
        .map((k) => k.split(/\$\{|\*/)[0])
        .filter((head) => !ABSENT_VENDORS.has(head) && !keys.some((k) => k.startsWith(head)));
      expect(missing).toEqual([]);
    });
  }
});
