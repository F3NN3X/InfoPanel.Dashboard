// The dashboard server's integrations: the OBS WebSocket connection and the calendar (ICS) links.
// They hold secrets (the OBS password, the private calendar URLs), so they live in their own file
// beside the config, never in config.json: every kiosk downloads the config, and only the server
// reads this file. The studio sees the public form (`publicIntegrations`) and writes changes with
// PUT /api/integrations (`applyIntegrations`); a secret is write-only.
//
// Node built-ins only. `normalizeIntegrations`, `publicIntegrations` and `applyIntegrations` are pure.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const OBS_DEFAULT_PORT = 4455;
export const MAX_LINKS = 10;
const MAX_LABEL = 40;

export const emptyIntegrations = () => ({ obs: { host: "", port: OBS_DEFAULT_PORT, password: "" }, calendar: { links: [] } });

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v, max = 2048) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A host name or IP for OBS, or "" (no scheme, path or spaces). */
export function cleanHost(v) {
  const h = text(v, 253);
  return /^(\[[0-9a-f:.]+\]|[a-z0-9._-]+)$/i.test(h) ? h : "";
}

const cleanPort = (v) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 65535 ? Number(v) : OBS_DEFAULT_PORT);

/** A calendar link as an https/http URL (webcal:// is https), or null. */
export function cleanCalendarUrl(v) {
  const raw = text(v).replace(/^webcals?:\/\//i, "https://");
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Tolerant read of the stored file. */
export function normalizeIntegrations(raw) {
  const base = emptyIntegrations();
  if (!isObject(raw)) return base;
  const obs = isObject(raw.obs) ? raw.obs : {};
  const links = isObject(raw.calendar) && Array.isArray(raw.calendar.links) ? raw.calendar.links : [];
  return {
    obs: { host: cleanHost(obs.host), port: cleanPort(obs.port ?? OBS_DEFAULT_PORT), password: typeof obs.password === "string" ? obs.password : "" },
    calendar: {
      links: links
        .filter(isObject)
        .map((l) => ({ id: text(l.id, 64), label: text(l.label, MAX_LABEL), url: cleanCalendarUrl(l.url) }))
        .filter((l) => l.id && l.url)
        .slice(0, MAX_LINKS),
    },
  };
}

/** What the studio may see: no password, and each link only as its host. */
export function publicIntegrations(s) {
  return {
    obs: { host: s.obs.host, port: s.obs.port, hasPassword: s.obs.password !== "" },
    calendar: { links: s.calendar.links.map((l) => ({ id: l.id, label: l.label, host: new URL(l.url).host })) },
  };
}

/**
 * The state with a studio patch applied, or { error }:
 * - `obs`: { host?, port?, password? } — a password string replaces it, "" clears it, absent keeps it.
 * - `calendar.links`: the full list in order; { id, label? } keeps a stored link, { url, label? } adds one.
 */
export function applyIntegrations(s, patch, newId = () => crypto.randomUUID()) {
  if (!isObject(patch)) return { error: "expected a JSON object" };
  let next = s;
  if (patch.obs !== undefined) {
    if (!isObject(patch.obs)) return { error: "obs: expected an object" };
    const o = patch.obs;
    const host = o.host === undefined ? s.obs.host : cleanHost(o.host);
    if (o.host !== undefined && text(o.host) !== "" && host === "") return { error: "obs.host: a host name or IP address" };
    next = {
      ...next,
      obs: {
        host,
        port: o.port === undefined ? s.obs.port : cleanPort(o.port),
        password: typeof o.password === "string" ? o.password.slice(0, 512) : s.obs.password,
      },
    };
  }
  if (patch.calendar !== undefined) {
    const list = isObject(patch.calendar) && Array.isArray(patch.calendar.links) ? patch.calendar.links : null;
    if (!list) return { error: "calendar.links: expected a list" };
    if (list.length > MAX_LINKS) return { error: `calendar.links: at most ${MAX_LINKS}` };
    const byId = new Map(s.calendar.links.map((l) => [l.id, l]));
    const links = [];
    for (const item of list) {
      if (!isObject(item)) return { error: "calendar.links: expected objects" };
      const label = text(item.label, MAX_LABEL);
      if (typeof item.id === "string" && byId.has(item.id)) {
        const kept = byId.get(item.id);
        links.push({ ...kept, label: item.label === undefined ? kept.label : label });
        continue;
      }
      const url = cleanCalendarUrl(item.url);
      if (!url) return { error: "calendar.links: an http(s) or webcal link" };
      links.push({ id: newId(), label, url });
    }
    next = { ...next, calendar: { links } };
  }
  return { state: next };
}

/** The stored integrations with persistence and change listeners. */
export function createIntegrations({ file }) {
  let state = emptyIntegrations();
  try {
    state = normalizeIntegrations(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    // None saved yet.
  }
  const listeners = new Set();
  return {
    get: () => state,
    public: () => publicIntegrations(state),
    apply(patch) {
      const result = applyIntegrations(state, patch);
      if (result.error) return result;
      const prev = state;
      state = result.state;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      // Owner-only: it holds the OBS password and the secret calendar links (POSIX; Windows keeps the folder's ACL).
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
      fs.renameSync(tmp, file);
      fs.chmodSync(file, 0o600);
      for (const l of listeners) l(state, prev);
      return { state };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

