import { defineConfig } from "vitest/config";
import base from "../../vite.config";

// On-demand audits (`npm run audit:views`): reports, not tests, so `npm test` never runs them. The base config is a
// function of the mode (the stats build), so it is called rather than spread.
// The base config splits into projects, which carry their own `include`: drop them so this one applies.
export default defineConfig((env) => {
  const config = base(env);
  return { ...config, test: { ...config.test, projects: undefined, include: ["tools/audit/*.audit.tsx"] } };
});
