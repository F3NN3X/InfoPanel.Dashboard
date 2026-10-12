import { useEffect, useState } from "react";
import { getApiBase } from "@/lib/data-api";

export interface Endpoint {
  method: string;
  path: string;
  description: string;
}

/** The routes the Data API documents at `GET /api`, for when it cannot be asked. */
export const KNOWN_ENDPOINTS: readonly Endpoint[] = [
  { method: "GET", path: "/", description: "Every data point, grouped by source" },
  { method: "GET", path: "/api", description: "Endpoint list as JSON" },
  { method: "GET", path: "/api/sensors", description: "Full sensor snapshot" },
  { method: "GET", path: "/events", description: "Server-Sent Events: full snapshot every second" },
  {
    method: "GET",
    path: "/events?prefix={key prefix}&interval={ms}",
    description: "SSE: matching values, then only changes (100–10000 ms)",
  },
  { method: "GET", path: "/api/sources", description: "Plugins, containers and entries with names and keys" },
  { method: "GET", path: "/api/images/{pluginId}/{imageId}", description: "A plugin image as PNG" },
  { method: "POST", path: "/api/push", description: "Add sensor values from another process (local only)" },
  { method: "POST", path: "/api/clear", description: "Clear all pushed values (local only)" },
];

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** Read the `GET /api` body (an array, or an object holding one) into endpoints; [] when unreadable. */
export function parseEndpoints(body: unknown): Endpoint[] {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === "object"
      ? Object.values(body).find(Array.isArray)
      : undefined;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item): Endpoint[] => {
    if (!item || typeof item !== "object") return [];
    const e = item as Record<string, unknown>;
    const path = text(e.path) || text(e.url) || text(e.route);
    return path
      ? [{ method: (text(e.method) || "GET").toUpperCase(), path, description: text(e.description) || text(e.desc) }]
      : [];
  });
}

/** The Data API's routes: asked of `GET /api`, else the known list. */
export function useEndpoints(): readonly Endpoint[] {
  const [endpoints, setEndpoints] = useState<readonly Endpoint[]>(KNOWN_ENDPOINTS);
  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiBase()}/api`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("api index"))))
      .then((body: unknown) => {
        const parsed = parseEndpoints(body);
        if (!cancelled && parsed.length > 0) setEndpoints(parsed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return endpoints;
}
