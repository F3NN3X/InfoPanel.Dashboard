// Data contract helpers: read, parse and format InfoPanel Data API values.
// The live stream comes from the app's own store (src/lib/sensor-store.ts), not from here.
import type { Data } from "./types";

/* ───────── data helpers ───────── */
export const get = (data: Data | undefined, key: string, fb = ""): string => {
  const v = data?.[key];
  if (v == null) return fb;
  return typeof v === "object" ? v.value ?? fb : v;
};
/** A sensor's display name, or `fallback` (a label derived from the key) when it has none. */
export const sensorLabel = (key: string, names: Record<string, string> | undefined, fallback: string): string => names?.[key] || fallback;
export const num = (v: unknown): number => {
  const m = String(v ?? "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
export const has = (v: unknown): boolean => v != null && v !== "" && v !== "-" && v !== "—" && v !== "Unknown";
export const clamp = (v: number, a = 0, b = 100): number => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
export const fmt = (v: number, d = 0): string =>
  Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "–";
export const fmtRate = (kbs: number): string => {
  if (!Number.isFinite(kbs)) return "–";
  if (kbs >= 1024 * 1024) return `${fmt(kbs / 1048576, 2)} GB/s`;
  if (kbs >= 1024) return `${fmt(kbs / 1024, 1)} MB/s`;
  return `${fmt(kbs, 0)} KB/s`;
};
export const fmtMB = (mb: number): string => {
  if (!Number.isFinite(mb)) return "–";
  if (mb >= 1024 * 1024) return `${fmt(mb / 1048576, 2)} TB`;
  if (mb >= 1024) return `${fmt(mb / 1024, mb >= 102400 ? 0 : 1)} GB`;
  return `${fmt(mb, 0)} MB`;
};
export const fmtGB = (gb: number): string => (gb >= 1024 ? `${fmt(gb / 1024, 1)} TB` : `${fmt(gb, gb >= 100 ? 0 : 1)} GB`);
// "a, b, c\nd, e, f" → [["a","b","c"],["d","e","f"]]
export const rows = (v: unknown): string[][] =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(",").map((s) => s.trim()));
// Find the variable part of keys, e.g. detect(data, /^libre\.(.+)_cpu_total$/) → ["amd_ryzen_9_9950x3d"]
export const detect = (data: Data | undefined, re: RegExp): string[] => {
  const out: string[] = [];
  for (const k in data || {}) {
    const m = k.match(re);
    if (m && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
};
export const pretty = (slug: string): string =>
  String(slug)
    .split("_")
    .filter(Boolean)
    .map((w) => (/^(amd|nvidia|rtx|gtx|wdc|ssd|nvme)$/i.test(w) || /\d/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

// Hardware ids present in the snapshot (LibreHardwareMonitor sensor slugs), shared by every hardware widget
export const hw = (data: Data | undefined): { cpu?: string; gpu?: string; disks: string[]; adapters: string[] } => ({
  cpu: detect(data, /^libre\.(.+)_cpu_total$/)[0],
  gpu: detect(data, /^libre\.(.+)_gpu_core_load$/)[0],
  disks: detect(data, /^libre\.(.+)_power_on_hours$/),
  adapters: detect(data, /^libre\.(.+)_download_speed$/),
});
