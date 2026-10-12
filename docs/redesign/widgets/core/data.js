// Data contract helpers: read, parse and format InfoPanel Data API values, plus the live SSE hook.
import React, { useEffect, useState } from 'react';

/* ───────── data helpers ───────── */
export const get = (data, key, fb = '') => {
  const v = data?.[key];
  if (v == null) return fb;
  return typeof v === 'object' ? v.value ?? fb : v;
};
export const num = (v) => {
  const m = String(v ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
export const has = (v) => v != null && v !== '' && v !== '-' && v !== '—' && v !== 'Unknown';
export const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
export const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }) : '–');
export const fmtRate = (kbs) => {
  if (!Number.isFinite(kbs)) return '–';
  if (kbs >= 1024 * 1024) return `${fmt(kbs / 1048576, 2)} GB/s`;
  if (kbs >= 1024) return `${fmt(kbs / 1024, 1)} MB/s`;
  return `${fmt(kbs, 0)} KB/s`;
};
export const fmtMB = (mb) => {
  if (!Number.isFinite(mb)) return '–';
  if (mb >= 1024 * 1024) return `${fmt(mb / 1048576, 2)} TB`;
  if (mb >= 1024) return `${fmt(mb / 1024, mb >= 102400 ? 0 : 1)} GB`;
  return `${fmt(mb, 0)} MB`;
};
export const fmtGB = (gb) => (gb >= 1024 ? `${fmt(gb / 1024, 1)} TB` : `${fmt(gb, gb >= 100 ? 0 : 1)} GB`);
// "a, b, c\nd, e, f" → [["a","b","c"],["d","e","f"]]
export const rows = (v) => String(v ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(',').map((s) => s.trim()));
// Find the variable part of keys, e.g. detect(data, /^libre\.(.+)_cpu_total$/) → ["amd_ryzen_9_9950x3d"]
export const detect = (data, re) => {
  const out = [];
  for (const k in data || {}) { const m = k.match(re); if (m && !out.includes(m[1])) out.push(m[1]); }
  return out;
};
export const pretty = (slug) => String(slug).split('_').filter(Boolean).map((w) => (/^(amd|nvidia|rtx|gtx|wdc|ssd|nvme)$/i.test(w) || /\d/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(' ');

/* ───────── live data from the InfoPanel Data API ─────────
   const data = useInfoPanel({ url: 'http://localhost:5000', prefix: 'libre.' });
   Uses GET /events?prefix=&interval= (SSE: first the matching values, then only changes). */
const normalize = (p) => {
  if (Array.isArray(p)) return Object.fromEntries(p.map((r) => [r.key ?? r[0], r.value ?? r[2] ?? r[1]]));
  if (p && typeof p === 'object') return Object.fromEntries(Object.entries(p.sensors ?? p).map(([k, v]) => [k, v && typeof v === 'object' ? v.value : v]));
  return {};
};
export function useInfoPanel({ url = '', prefix = '', interval = 1000 } = {}) {
  const [data, setData] = useState({});
  useEffect(() => {
    const es = new EventSource(`${url}/events?prefix=${encodeURIComponent(prefix)}&interval=${interval}`);
    es.onmessage = (e) => { try { const next = normalize(JSON.parse(e.data)); setData((d) => ({ ...d, ...next })); } catch {} };
    return () => es.close();
  }, [url, prefix, interval]);
  return data;
}
export const imageUrl = (base, pluginId, imageId) => `${base}/api/images/${pluginId}/${imageId}`;

// Hardware ids present in the snapshot (LibreHardwareMonitor sensor slugs), shared by every hardware widget
export const hw = (data) => ({
  cpu: detect(data, /^libre\.(.+)_cpu_total$/)[0],
  gpu: detect(data, /^libre\.(.+)_gpu_core_load$/)[0],
  disks: detect(data, /^libre\.(.+)_power_on_hours$/),
  adapters: detect(data, /^libre\.(.+)_download_speed$/),
});
