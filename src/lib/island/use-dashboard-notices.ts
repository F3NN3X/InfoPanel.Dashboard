import { useEffect, useRef } from "react";
import { getApiBase } from "@/lib/data-api";
import { extras, type ObsState } from "@/lib/extras";
import type { IslandNotices } from "./config";
import type { IslandBus } from "./bus";
import {
  CALENDAR_SOURCE,
  DASHBOARD_SOURCE,
  LAYOUT_NOTICE,
  ON_AIR_SOURCE,
  calendarUpdate,
  onAirUpdate,
  pageNotice,
  pluginChanges,
} from "./dashboard-notices";
import { applyUpdate } from "./sources";

/** How often the kiosk asks the Data API which plugins report, ms. */
export const PLUGIN_POLL_MS = 30_000;
/** How often the calendar countdown is worked out again, ms. */
const CALENDAR_TICK_MS = 15_000;

export interface DashboardNoticeInputs {
  notices: IslandNotices;
  /** The page shown now (its name). */
  page: string;
  /** Goes up by one per studio save that reached the kiosk. */
  layoutVersion: number;
  calendarLead: number;
}

/** The dashboard's own notices on the kiosk (`dashboard-notices.ts`), each only while switched on. */
export function useDashboardNotices(bus: IslandBus, { notices, page, layoutVersion, calendarLead }: DashboardNoticeInputs): void {
  const shownPage = useRef<string | null>(null);
  useEffect(() => {
    const n = notices.page ? pageNotice(shownPage.current, page) : null;
    shownPage.current = page;
    if (n) bus.notify({ ...n, source: DASHBOARD_SOURCE });
  }, [bus, notices.page, page]);

  const seenLayout = useRef(layoutVersion);
  useEffect(() => {
    if (notices.layout && layoutVersion !== seenLayout.current) bus.notify({ ...LAYOUT_NOTICE, source: DASHBOARD_SOURCE });
    seenLayout.current = layoutVersion;
  }, [bus, notices.layout, layoutVersion]);

  usePluginNotices(bus, notices.plugins);
  useOnAir(bus, notices.onAir);
  useCalendar(bus, notices.calendar, calendarLead);
}

/** The plugins `/api/sources` lists, by id, with their names. */
async function reportingPlugins(): Promise<Map<string, string> | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/sources`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { plugins?: { id?: unknown; name?: unknown; containers?: unknown[] }[] };
    const list = (body.plugins ?? []).filter((p) => typeof p.id === "string" && (p.containers?.length ?? 0) > 0);
    return new Map(list.map((p) => [String(p.id), typeof p.name === "string" && p.name ? p.name : String(p.id)]));
  } catch {
    // The Data API is down: the connection warning covers it, and the next poll compares again.
    return null;
  }
}

function usePluginNotices(bus: IslandBus, on: boolean): void {
  useEffect(() => {
    if (!on) return;
    let prev: Map<string, string> | null = null;
    let gone = new Set<string>();
    let alive = true;
    const poll = async () => {
      const next = await reportingPlugins();
      if (!alive || !next) return;
      const result = pluginChanges(prev, next, gone);
      gone = result.gone;
      prev = next;
      for (const n of result.notices) bus.notify({ ...n, source: DASHBOARD_SOURCE });
    };
    void poll();
    const timer = setInterval(() => void poll(), PLUGIN_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [bus, on]);
}

function useOnAir(bus: IslandBus, on: boolean): void {
  useEffect(() => {
    if (!on) return;
    let before: ObsState | null = null;
    const run = (obs: ObsState) => {
      applyUpdate(bus, ON_AIR_SOURCE, onAirUpdate(before, obs));
      before = obs;
    };
    const stop = extras.subscribe((s) => run(s.obs));
    run(extras.getState().obs);
    return () => {
      stop();
      bus.clearActivity(ON_AIR_SOURCE);
    };
  }, [bus, on]);
}

function useCalendar(bus: IslandBus, on: boolean, leadMin: number): void {
  useEffect(() => {
    if (!on) return;
    let announced = new Set<string>();
    const run = () => {
      const result = calendarUpdate(extras.getState().calendar.events, Date.now(), leadMin, announced);
      announced = result.announced;
      applyUpdate(bus, CALENDAR_SOURCE, result);
    };
    const stop = extras.subscribe(run);
    run();
    const timer = setInterval(run, CALENDAR_TICK_MS);
    return () => {
      stop();
      clearInterval(timer);
      bus.clearActivity(CALENDAR_SOURCE);
    };
  }, [bus, on, leadMin]);
}
