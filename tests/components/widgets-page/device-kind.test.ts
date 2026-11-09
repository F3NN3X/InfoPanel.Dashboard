import { describe, expect, it } from "vitest";
import { addBlock, blockAt, devicesIn, newRecipe, pickBinding, recipeIssues } from "@/components/widgets-page/builder-model";
import { changeDeviceKind } from "@/components/widgets-page/device-kind";
import type { Block, Recipe } from "@/widgets/recipe/types";

// G16: a device option's Kind. The CPU card becomes the GPU card in one go: every key that names the option reads the GPU's key for
// the same role (load, temperature, clock, power), and a key with no counterpart stays and is listed.

const CPU = "amd_ryzen_9_9950x3d";
const GPU = "nvidia_geforce_rtx_5090";
const DATA = {
  [`libre.${CPU}_cpu_total`]: "64.2 %",
  [`libre.${CPU}_core__tctl_tdie`]: "67.5 °C",
  [`libre.${CPU}_cores__average`]: "5120 MHz",
  [`libre.${CPU}_cpu_core__1`]: "80 %",
  [`libre.${GPU}_gpu_core_load`]: "87 %",
  [`libre.${GPU}_gpu_core`]: "61 °C",
  [`libre.${GPU}_gpu_core_clock`]: "2700 MHz",
};
const DEVICES = devicesIn(DATA);
const sensorOf = (r: Recipe, path: number[]) => ((blockAt(r, path) as Extract<Block, { bind: unknown }>).bind as { sensor: string }).sensor;

/** A CPU card that lets people pick the CPU: a ring of the load, a value of the temperature, one of the clock and one of core 1. */
function cpuCard(): Recipe {
  let r = newRecipe("CPU card", new Set());
  for (const key of ["cpu_total", "core__tctl_tdie", "cores__average", "cpu_core__1"]) r = addBlock(r, [], key === "cpu_total" ? "ring" : "value", `libre.${CPU}_${key}`).recipe;
  return pickBinding(r, [0], DEVICES);
}

describe("a device option's Kind", () => {
  it("rewrites each key to the new kind's key for its role, and lists those it cannot map", () => {
    const cpu = cpuCard();
    expect(sensorOf(cpu, [0])).toBe("libre.{cpu}_cpu_total");
    const { recipe, unmapped } = changeDeviceKind(cpu, "cpu", "gpu", DATA);
    expect([0, 1, 2, 3].map((k) => sensorOf(recipe, [k]))).toEqual(["libre.{cpu}_gpu_core_load", "libre.{cpu}_gpu_core", "libre.{cpu}_gpu_core_clock", "libre.{cpu}_cpu_core__1"]);
    expect(unmapped).toEqual(["libre.{cpu}_cpu_core__1"]);
    expect(recipe.options).toEqual([{ key: "cpu", label: "GPU", type: "device", kind: "gpu", default: "auto" }]);
    expect(recipeIssues(recipe).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("maps by role only where the new kind's device has the key, when the readings name one", () => {
    // the GPU in the data has no power reading: the package key stays and is listed
    const withPower = addBlock(cpuCard(), [], "value", `libre.${CPU}_package`).recipe;
    const picked = pickBinding(withPower, [4], DEVICES);
    const { unmapped } = changeDeviceKind(picked, "cpu", "gpu", DATA);
    expect(unmapped).toContain("libre.{cpu}_package");
    // with no reading of a GPU at all, the role table decides
    expect(changeDeviceKind(picked, "cpu", "gpu", {}).unmapped).toEqual(["libre.{cpu}_cpu_core__1"]);
  });

  it("a renamed option keeps its name; a picked device and the presets' picks go back to Auto", () => {
    const named = { ...cpuCard(), options: [{ key: "cpu", label: "Processor", type: "device" as const, kind: "cpu" as const, default: CPU }] };
    const withPreset = { ...named, presets: [...named.presets, { id: "mine", name: "Mine", settings: { cpu: CPU }, size: [3, 2] as [number, number] }] };
    const { recipe } = changeDeviceKind(withPreset, "cpu", "gpu", DATA);
    expect(recipe.options[0]).toMatchObject({ label: "Processor", kind: "gpu", default: "auto" });
    expect(recipe.presets[1].settings).toEqual({});
    // the same kind, or an option that is not a device: nothing changes
    expect(changeDeviceKind(recipe, "cpu", "gpu", DATA).recipe).toBe(recipe);
    expect(changeDeviceKind(recipe, "nope", "cpu", DATA).recipe).toBe(recipe);
  });
});
