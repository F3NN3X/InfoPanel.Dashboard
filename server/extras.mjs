// The server's extras for kiosks: OBS's on-air state and the upcoming calendar events
// (server/obs.mjs, server/calendar.mjs), from the integrations in their own file
// (server/integrations.mjs). GET /api/extras and the SSE /events/extras carry only that state;
// GET/PUT /api/integrations is the studio's view of the settings, with secrets write-only.
//
// Node built-ins only.

import { createCalendar } from "./calendar.mjs";
import { createIntegrations } from "./integrations.mjs";
import { createObs } from "./obs.mjs";

export function createExtras({ file, log = () => {} }) {
  const integrations = createIntegrations({ file });
  const listeners = new Set();
  const state = () => ({ obs: obs.state(), calendar: calendar.state() });
  const publish = () => {
    const s = state();
    for (const l of listeners) l(s);
  };
  const obs = createObs({ settings: () => integrations.get().obs, onChange: publish, log });
  const calendar = createCalendar({ links: () => integrations.get().calendar.links, onChange: publish, log });

  obs.reconfigure();
  void calendar.reconfigure();
  integrations.subscribe((next, prev) => {
    if (JSON.stringify(next.obs) !== JSON.stringify(prev.obs)) obs.reconfigure();
    if (JSON.stringify(next.calendar) !== JSON.stringify(prev.calendar)) void calendar.reconfigure();
  });

  return {
    state,
    integrations,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
