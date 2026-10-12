// The template widgets as dashboard modules; `src/modules/index.ts` appends them to the registry.
import type { DashboardModule } from "@/modules/types";
import { GROUP_A } from "./registry/a";
import { GROUP_B } from "./registry/b";
import { GROUP_C } from "./registry/c";
import { GROUP_D } from "./registry/d";

export const TEMPLATE_MODULES: DashboardModule[] = [...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D];
