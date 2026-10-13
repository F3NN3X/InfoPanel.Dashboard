import { useEffect, useState } from "react";
import type { ActiveAlert, AlertAction } from "./alerts";
import type { DashboardConfig, MonitorProfile } from "./layout";

/**
 * The control channel — runtime state the server holds (server/control.mjs):
 * the page each profile shows, a profile override and page auto-rotation.
 * Kiosks and the studio read it over one SSE stream and write it with POSTs;
 * none of it is config, so none of it enters the undo history.
 */

export const CONTROL_URL = "/api/control";
export const CONTROL_EVENTS_URL = "/events/control";

/** What the server publishes (`publicState`). */
export interface ControlState {
  /** The profile override; null = no override. */
  profile: string | null;
  /** The profile a kiosk last reported showing. */
  shown: string | null;
  profiles: Record<string, { page: string | null; rotating: boolean; override: "on" | "off" | null }>;
  /** The alerts the server holds right now (see alerts.ts). */
  alerts?: ActiveAlert[];
}

export type ControlAction = "page" | "profile" | "rotate" | "touch" | "alert";

/**
 * Send a control action. Resolves to the new state, or null when the server
 * is offline or refuses — callers never have to catch.
 */
export async function postControl(action: "alert", body: AlertAction): Promise<{ alerts: ActiveAlert[] } | null>;
export async function postControl(action: ControlAction, body: object): Promise<ControlState | null>;
export async function postControl(action: ControlAction, body: object): Promise<unknown> {
  try {
    const res = await fetch(`${CONTROL_URL}/${action}`, {
      method: "POST",
      // The custom header makes a cross-site POST preflight (see server.mjs).
      headers: { "Content-Type": "application/json", "X-Dashboard-Control": "1" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * The latest control state, or null until the first message (and while the
 * server is unreachable). `shownProfile` tells the server which profile this
 * kiosk shows. One subscription per page — never per zone. `enabled` off
 * opens nothing.
 */
export function useControl(shownProfile?: string, enabled = true): ControlState | null {
  const [state, setState] = useState<ControlState | null>(null);
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    const url = shownProfile ? `${CONTROL_EVENTS_URL}?profile=${encodeURIComponent(shownProfile)}` : CONTROL_EVENTS_URL;
    const events = new EventSource(url);
    events.onmessage = (e) => {
      try {
        setState(JSON.parse(e.data) as ControlState);
      } catch {
        // A malformed message: keep the last state.
      }
    };
    return () => events.close();
  }, [shownProfile, enabled]);
  return state;
}

/**
 * The page a kiosk shows: the `?page=` pin when the profile has it, else the
 * control channel's page for the profile when it still exists, else undefined
 * (the first page).
 */
export function kioskPageId(args: {
  pin: string | undefined;
  control: ControlState | null;
  profile: Pick<MonitorProfile, "id" | "pages">;
}): string | undefined {
  const has = (id: string | null | undefined): id is string =>
    id != null && args.profile.pages.some((p) => p.id === id);
  if (has(args.pin)) return args.pin;
  const page = args.control?.profiles[args.profile.id]?.page;
  return has(page) ? page : undefined;
}

/**
 * The profile a kiosk shows when something forces it: the `?profile=` pin
 * (each kiosk window keeps its own), then the control channel's override.
 * Undefined = resolve as usual (the config's pin, or by window size).
 */
export function kioskProfileId(args: {
  pin: string | null | undefined;
  control: ControlState | null;
  config: Pick<DashboardConfig, "profiles">;
}): string | undefined {
  const has = (id: string | null | undefined): id is string =>
    id != null && args.config.profiles.some((p) => p.id === id);
  if (has(args.pin)) return args.pin;
  return has(args.control?.profile) ? args.control.profile : undefined;
}

/** The state with one profile's page set (a local, optimistic switch). */
export function withControlPage(control: ControlState | null, profileId: string, page: string): ControlState {
  const base = control ?? { profile: null, shown: null, profiles: {} };
  const was = base.profiles[profileId] ?? { page: null, rotating: false, override: null };
  return { ...base, profiles: { ...base.profiles, [profileId]: { ...was, page } } };
}

/** The page before or after `current`, wrapping; undefined with fewer than two pages. */
export function neighbourPage(pageIds: string[], current: string, delta: 1 | -1): string | undefined {
  if (pageIds.length < 2) return undefined;
  const i = Math.max(0, pageIds.indexOf(current));
  return pageIds[(i + delta + pageIds.length) % pageIds.length];
}
