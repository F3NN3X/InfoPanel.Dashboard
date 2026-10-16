// Environment-driven locations and the version of server.mjs. Pure; exported for the tests.

import fs from "node:fs";
import path from "node:path";

/** The directory to serve: DASHBOARD_DIST when set, else `fallback`. */
export const resolveDist = (env, fallback) => (env.DASHBOARD_DIST ? path.resolve(env.DASHBOARD_DIST) : fallback);

/** The data directory: DASHBOARD_DATA_DIR when set, else `fallback`. */
export const resolveDataDir = (env, fallback) => (env.DASHBOARD_DATA_DIR ? path.resolve(env.DASHBOARD_DATA_DIR) : fallback);

/** The `version` of the package.json at `file`, or "0.0.0" when it is missing or unreadable. */
export function readVersion(file) {
  try {
    const version = JSON.parse(fs.readFileSync(file, "utf8")).version;
    return typeof version === "string" && version ? version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
