import type { DashboardConfig } from "@/lib/layout";

/**
 * The config without profile `id` (never the last one: the same config back). Deleting the edited
 * profile or the pinned one hands the pick to "auto"; any other delete leaves `activeProfile` alone.
 */
export function withoutProfile(config: DashboardConfig, id: string, editedId: string): DashboardConfig {
  if (config.profiles.length <= 1 || !config.profiles.some((p) => p.id === id)) return config;
  const repick = id === editedId || id === config.activeProfile;
  return {
    ...config,
    profiles: config.profiles.filter((p) => p.id !== id),
    activeProfile: repick ? "auto" : config.activeProfile,
  };
}
