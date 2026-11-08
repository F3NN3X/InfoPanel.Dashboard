import { describe, expect, it } from "vitest";
import { modules } from "@/modules";
import type { SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { renderModule } from "@/widgets/test-render";

const drive = modules.find((m) => m.id === "DriveSpace")!;
// One drive 10% full: under the default thresholds, so its bar is the ok state.
const P = "plugins.drive-info-plugin.c.";
const sensors = {
  ...Object.fromEntries(Object.entries(fixtureSensors()).filter(([k]) => !k.startsWith("plugins.drive-info-plugin."))),
  [`${P}name`]: { text: "C:", unit: "", name: "C: · Name", source: "infopanel" },
  [`${P}total_size`]: { value: 1000, unit: "MB", name: "C: · Total Size", source: "infopanel" },
  [`${P}used_space`]: { value: 100, unit: "MB", name: "C: · Used Space", source: "infopanel" },
  [`${P}available_space`]: { value: 900, unit: "MB", name: "C: · Available Space", source: "infopanel" },
} as unknown as SensorMap;
const GREY = "background:var(--w-faint, #8a8a94)";

describe("DriveSpace ok bar", () => {
  it("draws accent where Neutral below thresholds was never saved, or is off", () => {
    expect(renderModule(drive, {}, sensors)).not.toContain(GREY);
    expect(renderModule(drive, { neutral: false }, sensors)).not.toContain(GREY);
  });
  it("draws grey where it was saved on", () => {
    expect(renderModule(drive, { neutral: true }, sensors)).toContain(GREY);
  });
});
