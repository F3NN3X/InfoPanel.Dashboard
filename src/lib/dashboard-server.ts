import type { DashboardConfig } from "@/lib/layout";

/**
 * Endpoints of the dashboard's own server (server.mjs), which serves this
 * page — so they are same-origin paths. `npm run dev` proxies them to the
 * running server (vite.config.ts). Sensor data comes from InfoPanel's
 * Data API instead (see lib/data-api).
 */
export const CONFIG_URL = "/api/config";
export const CONFIG_EVENTS_URL = "/events/config";
export const IMAGE_PROXY_URL = "/api/image-proxy";

/** Save the config on the server, where every kiosk page reads it. */
export async function pushConfig(config: DashboardConfig): Promise<void> {
  const res = await fetch(CONFIG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error(`config save failed: ${res.status}`);
}
