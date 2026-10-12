import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { toFlat, toNames } from "@/widgets/data-adapter";
import SystemOverview from "@/widgets/SystemOverview";
import { systemModernProps, systemOverviewProps } from "@/widgets/registry/system-overview";
import { GROUP_A } from "@/widgets/registry/a";
import { STANDARD_SETTINGS } from "./standard-settings";
import { systemModernModule as mod } from "./system-modern";
import { effectiveSettings, type ModuleSettings } from "./types";

// The module's own keys, defaults and groups as they were before the port (src/modules/system-modern.tsx at 6513067).
const BEFORE: [string, unknown, string][] = [
  ["devices", "cpu,gpu,ram", "Devices"],
  ["showNames", false, "Devices"],
  ["showTemps", true, "Devices"],
  ["showPower", true, "Devices"],
  ["showCores", false, "CPU"],
  ["coreStyle", "heatmap", "CPU"],
  ["showVram", true, "GPU"],
  ["showClock", false, "GPU"],
  ["showHotspot", false, "GPU"],
  ["showFans", false, "GPU"],
  ["showMemClock", false, "GPU"],
  ["showPowerLimit", false, "GPU"],
  ["showMemory", true, "Memory"],
  ["showPageFile", false, "Memory"],
  ["showDiskTemp", true, "Drives"],
  ["showDiskIo", true, "Drives"],
  ["showDiskLife", false, "Drives"],
  ["diskFilter", "", "Drives"],
  ["sparkline", false, "Trends"],
  ["historyLength", 48, "Trends"],
  ["tempWarn", 80, "Thresholds"],
  ["tempCrit", 90, "Thresholds"],
  ["loadWarn", 80, "Thresholds"],
  ["loadCrit", 95, "Thresholds"],
  ["vramWarn", 90, "Thresholds"],
  ["tempUnit", "c", "Units & labels"],
  ["decimals", "0", "Units & labels"],
  ["cpuLabel", "", "Units & labels"],
  ["gpuLabel", "", "Units & labels"],
  ["ramLabel", "", "Units & labels"],
  ["diskLabel", "", "Units & labels"],
  ["cpuColor", "", "Device colors"],
  ["gpuColor", "", "Device colors"],
  ["ramColor", "", "Device colors"],
  ["diskColor", "", "Device colors"],
  ["vramColor", "", "Device colors"],
];

const SENSORS = fixtureSensors();
const DATA = toFlat(SENSORS);
const defaults = () => effectiveSettings(mod, {});
const render = (saved: ModuleSettings) => renderToString(mod.render(SENSORS, saved) as never);
/** The template with the module's mapping, at the full detail level (the SSR box is 0×0). */
const full = (saved: ModuleSettings) => renderToString(createElement(SystemOverview, { data: DATA, details: "full", ...systemOverviewProps(effectiveSettings(mod, saved)) }));

describe("systemmodern module", () => {
  it("keeps every own key, default and group", () => {
    expect((mod.settings ?? []).slice(0, STANDARD_SETTINGS.length)).toEqual(STANDARD_SETTINGS);
    expect((mod.settings ?? []).slice(STANDARD_SETTINGS.length).map((s) => [s.key, s.default, s.group])).toEqual(BEFORE);
  });

  it("keeps the options of its enums", () => {
    const opts = (key: string) => (mod.settings ?? []).find((s) => s.key === key)?.options?.map((o) => o.value);
    expect(opts("devices")).toEqual(["cpu", "gpu", "ram", "disk"]);
    expect((mod.settings ?? []).find((s) => s.key === "devices")?.multiple).toBe(true);
    expect(opts("coreStyle")).toEqual(["heatmap", "bars"]);
    expect(opts("tempUnit")).toEqual(["c", "f"]);
    expect(opts("decimals")).toEqual(["0", "1"]);
  });

  it("keeps its id, title, size, prefixes and idle behaviour; hidden from the Library", () => {
    expect(mod).toMatchObject({ id: "systemmodern", title: "System (modern)", minCols: 2, minRows: 1, prefixes: ["system.cpu.", "system.ram."], reads: ["libre."], libraryHidden: true });
    expect(mod.isIdle).toBeUndefined();
  });

  it("maps the defaults to the old look: CPU · GPU + VRAM · RAM, legacy details, no graphs", () => {
    expect(systemOverviewProps(defaults())).toEqual({
      sections: ["cpu", "gpu", "vram", "ram"],
      coreView: "off",
      show: { names: false, temps: true, power: true, clock: false, hotspot: false, fans: false, memClock: false, powerLimit: false, memory: true, pageFile: false, diskTemp: true, diskIo: true, diskLife: false },
      sparkline: false,
      historyLength: 48,
      warn: 80,
      crit: 95,
      tempWarn: 80,
      tempCrit: 90,
      vramWarn: 90,
      tempUnit: "c",
      decimals: 0,
    });
  });

  it.each<[string, ModuleSettings, Record<string, unknown>]>([
    ["devices", { devices: "ram,disk,cpu" }, { sections: ["cpu", "ram", "disk"] }],
    ["devices (none)", { devices: "" }, { sections: [] }],
    ["showVram", { showVram: false }, { sections: ["cpu", "gpu", "ram"] }],
    ["showCores", { showCores: true }, { coreView: "heatmap" }],
    ["coreStyle", { showCores: true, coreStyle: "bars" }, { coreView: "bars" }],
    ["coreStyle without threads", { showCores: false, coreStyle: "bars" }, { coreView: "off" }],
    ["showNames", { showNames: true }, { show: expect.objectContaining({ names: true }) }],
    ["showTemps", { showTemps: false }, { show: expect.objectContaining({ temps: false }) }],
    ["showPower", { showPower: false }, { show: expect.objectContaining({ power: false }) }],
    ["showClock", { showClock: true }, { show: expect.objectContaining({ clock: true }) }],
    ["showHotspot", { showHotspot: true }, { show: expect.objectContaining({ hotspot: true }) }],
    ["showFans", { showFans: true }, { show: expect.objectContaining({ fans: true }) }],
    ["showMemClock", { showMemClock: true }, { show: expect.objectContaining({ memClock: true }) }],
    ["showPowerLimit", { showPowerLimit: true }, { show: expect.objectContaining({ powerLimit: true }) }],
    ["showMemory", { showMemory: false }, { show: expect.objectContaining({ memory: false }) }],
    ["showPageFile", { showPageFile: true }, { show: expect.objectContaining({ pageFile: true }) }],
    ["showDiskTemp", { showDiskTemp: false }, { show: expect.objectContaining({ diskTemp: false }) }],
    ["showDiskIo", { showDiskIo: false }, { show: expect.objectContaining({ diskIo: false }) }],
    ["showDiskLife", { showDiskLife: true }, { show: expect.objectContaining({ diskLife: true }) }],
    ["diskFilter", { diskFilter: "king, wdc" }, { diskFilter: "king, wdc" }],
    ["sparkline", { sparkline: true }, { sparkline: true }],
    ["historyLength", { historyLength: 96 }, { historyLength: 96 }],
    ["historyLength (floor)", { historyLength: 3 }, { historyLength: 12 }],
    ["tempWarn", { tempWarn: 70 }, { tempWarn: 70 }],
    ["tempCrit", { tempCrit: 100 }, { tempCrit: 100 }],
    ["loadWarn", { loadWarn: 60 }, { warn: 60 }],
    ["loadCrit", { loadCrit: 85 }, { crit: 85 }],
    ["vramWarn", { vramWarn: 75 }, { vramWarn: 75 }],
    ["tempUnit", { tempUnit: "f" }, { tempUnit: "f" }],
    ["decimals", { decimals: "1" }, { decimals: 1 }],
    ["cpuLabel", { cpuLabel: " Ryzen " }, { labels: { cpu: "Ryzen" } }],
    ["gpuLabel", { gpuLabel: "RTX" }, { labels: { gpu: "RTX" } }],
    ["ramLabel", { ramLabel: "Mem" }, { labels: { ram: "Mem" } }],
    ["diskLabel", { diskLabel: "SSD" }, { labels: { disk: "SSD" } }],
    ["cpuColor", { cpuColor: "#111111" }, { colors: { cpu: "#111111" } }],
    ["gpuColor", { gpuColor: "#222222" }, { colors: { gpu: "#222222" } }],
    ["ramColor", { ramColor: "#333333" }, { colors: { ram: "#333333" } }],
    ["diskColor", { diskColor: "#444444" }, { colors: { disk: "#444444" } }],
    ["vramColor", { vramColor: "#555555" }, { colors: { vram: "#555555" } }],
  ])("maps %s", (_key, saved, expected) => {
    expect(systemOverviewProps(effectiveSettings(mod, saved))).toMatchObject(expected);
  });

  it("leaves empty labels and colours to the template", () => {
    const p = systemOverviewProps(defaults());
    expect(p.labels).toBeUndefined();
    expect(p.colors).toBeUndefined();
  });

  it.each([
    ["auto", "default"],
    ["card", "default"],
    ["standard", "default"],
    ["compact", "default"],
    ["simple", "default"],
    ["card", "studio"],
    ["simple", "studio"],
  ])("renders the fixture with layout %s, variant %s", (layout, variant) => {
    const html = render({ layout, variant });
    expect(html).toMatch(/\d/);
    if (variant === "default") expect(html).toContain("GPU");
  });

  it("shows the legacy defaults: GPU temperature, power, no hardware name", () => {
    const html = render({});
    expect(html).toContain("59°C");
    expect(html).toContain("361 W");
    expect(html).not.toContain("RTX 5090");
  });

  it.each<[string, ModuleSettings, (string | RegExp)[], (string | RegExp)[]]>([
    ["tempUnit f", { tempUnit: "f" }, ["138°F"], ["59°C"]],
    ["decimals 1", { decimals: "1", tempUnit: "c" }, ["58.9°C"], []],
    ["coreStyle bars", { showCores: true, coreStyle: "bars" }, ["transition-[height]"], []],
    ["coreStyle heatmap", { showCores: true }, [/title="Core 1 · /], []],
    ["devices with disks", { devices: "disk" }, ["Disks", "Kingston SFYRD2000G", "82%"], ["GPU"]],
    ["showNames", { showNames: true }, ["GeForce RTX 5090"], []],
    ["showTemps off", { showTemps: false }, [], ["59°C"]],
    ["showPower off", { showPower: false }, [], ["361 W"]],
    ["showHotspot", { showHotspot: true }, ["Hotspot"], []],
    ["showPageFile", { showPageFile: true }, ["Page"], []],
    ["cpuLabel", { cpuLabel: "Ryzen" }, [">Ryzen<"], []],
  ])("renders %s", (_name, saved, has, hasNot) => {
    const html = full(saved);
    for (const s of has) expect(html).toMatch(s);
    for (const s of hasNot) expect(html).not.toMatch(s);
  });

  it("renders drive details and honours the drive filter", () => {
    const html = full({ devices: "disk", showDiskLife: true });
    expect(html).toContain("64°C");
    expect(html).toMatch(/Life \d+%/);
    const filtered = full({ devices: "disk", diskFilter: "WDS100T2B0A-00SM50" });
    expect(filtered).toContain("WDC WDS100T2B0A 00SM50");
    expect(filtered).not.toContain("Kingston");
  });

  it("names drives by their sensors' display names when the fixture has them", () => {
    const named = { ...SENSORS, "libre.kingston_sfyrd2000g_used_space": { ...SENSORS["libre.kingston_sfyrd2000g_used_space"], name: "KINGSTON SFYRD2000G Used Space" } };
    const html = renderToString(createElement(SystemOverview, { data: toFlat(named), names: toNames(named), details: "full", ...systemOverviewProps(effectiveSettings(mod, { devices: "disk" })) }));
    expect(html).toContain("KINGSTON SFYRD2000G");
    expect(full({ devices: "disk" })).toContain("Kingston SFYRD2000G");
  });

  it("tints a load past its warning and a temperature past its threshold", () => {
    // GPU load 90 % against loadWarn 80; the GPU core at 59 °C against tempWarn 50.
    const html = full({ devices: "gpu", showVram: false, tempWarn: 50, tempCrit: 100 });
    expect(html.match(/#EDB232/g)?.length).toBeGreaterThanOrEqual(2);
    expect(full({ devices: "gpu", showVram: false, loadCrit: 85 })).toContain("#F2665E");
  });

  it("renders nothing without devices or data, like before", () => {
    expect(mod.render(SENSORS, { devices: "" })).toBeNull();
    expect(mod.render({}, {})).toBeNull();
    const drives = { "libre.x_nvme_used_space": { value: 10, unit: "%" } };
    expect(mod.render(drives, {})).toBeNull();
    expect(mod.render(drives, { devices: "disk" })).not.toBeNull();
  });

  it("shows the template's empty state when the chosen devices are not reported", () => {
    expect(renderToString(mod.render({ "system.cpu.load": { value: 5, unit: "%" } }, { devices: "gpu" }) as never)).toContain("No system data");
  });
});

describe("systemmodern default colours", () => {
  it("passes today's device colours when none is stored, the stored colour winning", () => {
    expect(systemModernProps(effectiveSettings(mod, {})).colors).toEqual({ cpu: "#38bdf8", gpu: "#a78bfa", ram: "#4ade80", vram: "#fbbf24", disk: "#fb7185" });
    expect(systemModernProps(effectiveSettings(mod, { ramColor: "#000000" })).colors).toMatchObject({ ram: "#000000", cpu: "#38bdf8" });
  });

  it("renders RAM green by default and the stored colour when set", () => {
    expect(render({ devices: "ram" })).toContain("--accent:#4ade80");
    expect(render({ devices: "ram" })).not.toContain("--accent:#fbbf24");
    expect(render({ devices: "ram", ramColor: "#123456" })).toContain("--accent:#123456");
  });
});

describe("SystemOverview zone", () => {
  const tpl = GROUP_A.find((m) => m.id === "SystemOverview")!;

  it("stores the new props under the legacy keys with the template's defaults", () => {
    const keys = (tpl.settings ?? []).slice(STANDARD_SETTINGS.length).map((s) => s.key);
    expect(keys).not.toContain("devices");
    expect(keys).toEqual(expect.arrayContaining(["showNames", "showDiskLife", "diskFilter", "sparkline", "historyLength", "tempWarn", "tempCrit", "vramWarn", "tempUnit", "decimals", "cpuLabel", "diskLabel", "diskColor"]));
    const p = systemOverviewProps(effectiveSettings(tpl, {}));
    expect(p.sections).toBeUndefined();
    expect(p.coreView).toBeUndefined();
    expect(p.sparkline).toBe(true);
    expect(p.historyLength).toBe(60);
    expect(Object.values(p.show ?? {}).every(Boolean)).toBe(true);
  });

  it("keeps the template's own palette (RAM amber) where the legacy id keeps its green", () => {
    expect(renderToString(tpl.render(SENSORS, {}) as never)).toContain("--accent:#fbbf24");
    expect(systemOverviewProps(effectiveSettings(tpl, {})).colors).toBeUndefined();
  });

  it("applies the colour and label keys", () => {
    const html = renderToString(tpl.render(SENSORS, { cpuColor: "#000000", ramLabel: "Memory" }) as never);
    expect(html).toContain("--accent:#000000");
    expect(html).toContain(">Memory<");
  });
});
