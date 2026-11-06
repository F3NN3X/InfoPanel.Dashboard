// The status the sidebar reads, connected unless a test says otherwise.
import type { ApiHealth } from "@/components/studio/use-data-api-grace";
import type { StudioStatus } from "@/components/studio/use-status-bar";

export const sidebarStatus = (health: Partial<ApiHealth> = {}, status: Partial<StudioStatus> = {}): StudioStatus => {
  const apiHealth: ApiHealth = { link: "connected", downMs: 0, downSince: null, lastDrop: null, ...health };
  return {
    dataApi: { state: apiHealth.link, latencyMs: 2, base: "http://127.0.0.1:3921" },
    apiHealth,
    retryApi: () => {},
    server: { kind: "browser", host: "127.0.0.1" },
    kiosks: 0,
    restartNeeded: false,
    save: "saved",
    ...status,
  };
};
