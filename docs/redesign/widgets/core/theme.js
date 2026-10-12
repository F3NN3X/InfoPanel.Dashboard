// Theme tokens: surfaces, skins, state colours, colour ramps, skin context and tone helpers.
import React from 'react';
import { num, clamp } from './data';
import { mix, hue } from './tokens';
import { BASE_SURFACES } from './surfaces';
import { defaultSkin } from './skins/default';
import { tuiSkin } from './skins/tui';
import { macosSkin } from './skins/macos';
import { fluentSkin } from './skins/fluent';
import { hudSkin } from './skins/hud';
import { inkSkin } from './skins/ink';
import { retroSkin } from './skins/retro';
import { iosSkin } from './skins/ios';
import { androidSkin } from './skins/android';
import { synthSkin } from './skins/synth';
import { brutalSkin } from './skins/brutal';
import { cyberSkin } from './skins/cyber';
import { nixieSkin } from './skins/nixie';
import { instrumentSkin } from './skins/instrument';

/* ───────── shell ───────── */
// Skin packs: one file per skin in core/skins/. Order = picker order.
export const SKIN_PACKS = [defaultSkin, tuiSkin, macosSkin, fluentSkin, hudSkin, inkSkin, retroSkin, iosSkin, androidSkin, synthSkin, brutalSkin, cyberSkin, nixieSkin, instrumentSkin];
export const SURFACES = { ...BASE_SURFACES, ...Object.assign({}, ...SKIN_PACKS.map((p) => p.surfaces)) };
export const SURFACE_NAMES = Object.keys(SURFACES);
export const SKINS = Object.fromEntries(SKIN_PACKS.map((p) => [p.name, p.skin]));


export const SKIN_NAMES = Object.keys(SKINS);
// Instrument palette, usable by any widget: ok / warn / crit / muted fills
export const INSTR = { card: '#161A20', muted: '#20252D', mutedFg: '#8D96A4', border: '#29303A', primary: '#7D95FF', chart2: '#3FC4D0', ok: '#3CC97F', warn: '#EDB232', crit: '#F2665E' };
/* Colour ramps for heatmaps & visualisers. rampColor(t 0-1, name, accentHex) → css rgb() */
export const RAMPS = {
  accent: null,
  thermal: ['#1e3a8a', '#0ea5e9', '#22c55e', '#facc15', '#f97316', '#ef4444'],
  viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  magma:   ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
  ice:     ['#0b1020', '#1e3a5f', '#2f7fb5', '#7dd3fc', '#f0f9ff'],
  synth:   ['#12062a', '#6b1ea8', '#ff4fd8', '#ff9e5e', '#ffe66d'],
  mono:    ['#18181b', '#52525b', '#a1a1aa', '#fafafa'],
};
const hex = (h) => { const s = String(h).replace('#', ''); const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0); };
export const rampColor = (t, name = 'accent', accentHex = '#34d399') => {
  t = Math.min(1, Math.max(0, t));
  const stops = RAMPS[name] ?? ['#18181c', accentHex];
  const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = hex(stops[i]), b = hex(stops[i + 1]);
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * f)).join(',')})`;
};
// resolve the live --accent of an element (for canvas drawing)
export const accentOf = (el, fb = '#34d399') => (el && getComputedStyle(el).getPropertyValue('--accent').trim()) || fb;
export const GRAPH_STYLES = ['area', 'line', 'step', 'bars', 'dots', 'braille'];
export const METER_STYLES = ['bar', 'pill', 'segments', 'blocks', 'hair', 'wave', 'square'];
export const SkinCtx = React.createContext({ skin: 'default', graph: 'area', meter: 'bar' });
export const useSkin = () => React.useContext(SkinCtx);
// Skin-aware numeral style for widgets that draw big numbers directly
export const numFont = (sk, weight = 700) => ({ fontFamily: sk.num, fontWeight: sk.numWeight ?? weight, fontStretch: sk.numStretch, ...(sk.numGlow ? { textShadow: '0 0 4px var(--accent), 0 0 14px var(--accent)' } : null) });
// Semantic state colours (stay meaningful under every skin)
export const STATE = { ok: '#3CC97F', warn: '#EDB232', crit: '#F2665E', none: 'rgba(255,255,255,0.07)' };


export const TONES = { ok: 'var(--accent)', warn: '#fbbf24', crit: '#f87171', muted: '#71717a' };
// 0-100 → colour for heatmaps. ramp 'accent' (accent intensity) or 'thermal' (blue → green → amber → red)
export const heat = (v, ramp = 'accent') => {
  const t = clamp(v) / 100;
  return ramp === 'accent' || !RAMPS[ramp] ? `color-mix(in oklab, var(--accent) ${8 + t * 92}%, #18181c)` : rampColor(t, ramp);
};
export const tone = (v, warn, crit) => (Number.isFinite(v) && crit != null && v >= crit ? 'crit' : Number.isFinite(v) && warn != null && v >= warn ? 'warn' : 'ok');
