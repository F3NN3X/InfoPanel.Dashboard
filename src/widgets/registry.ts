// The template widgets as dashboard modules; `src/modules/index.ts` appends them to the registry. The group files and the
// widget folders (`src/widgets/<kebab-id>/`, listed in registry.generated.ts) side by side, in `order.ts`'s order: the
// generator turns that into each folder widget's place, so the kiosk entry carries three numbers, not the list.
import { isDeviceKind, type DashboardModule } from "@/modules/types";
import { GROUP_A } from "./registry/a";
import { GROUP_B } from "./registry/b";
import { GROUP_C } from "./registry/c";
import { GROUP_D } from "./registry/d";
import { GROUP_E } from "./registry/e";
import { GROUP_HISTORY } from "./registry/history";
import { GROUP_STREAM_AUDIO } from "./registry/stream-audio";
import { GROUP_STREAM_CHAT } from "./registry/stream-chat";
import { GROUP_STREAM_DECK } from "./registry/stream-deck";
import { GROUP_STREAM_OBS } from "./registry/stream-obs";
import { TIME_WIDGETS } from "./registry/time";
import { fitSettings, INSPECTOR_META } from "./registry/inspector-meta";
import { folderModule } from "./folder-module";
import { FOLDER_SLOTS, FOLDER_WIDGETS } from "./registry.generated";

/** The device kind of a widget's `device` / `devices` row. */
const deviceKindOf = (m: DashboardModule): DashboardModule["deviceKind"] => {
  const from = m.settings?.find((d) => d.key === "device" || d.key === "devices")?.optionsFrom;
  return isDeviceKind(from) ? from : undefined;
};

const GROUPS: DashboardModule[] = [...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D, ...GROUP_E, ...TIME_WIDGETS, ...GROUP_HISTORY, ...GROUP_STREAM_AUDIO, ...GROUP_STREAM_OBS, ...GROUP_STREAM_CHAT, ...GROUP_STREAM_DECK];

/** The group widgets with their `INSPECTOR_META` entry, and each folder widget inserted at its place (in ascending order). */
const ALL = FOLDER_WIDGETS.reduce(
  (list, w, i) => [...list.slice(0, FOLDER_SLOTS[i]), folderModule(w), ...list.slice(FOLDER_SLOTS[i])],
  GROUPS.map((m) => ({ ...m, inspectorMeta: INSPECTOR_META[m.id] }))
);

/** Each with its inspector metadata (header, small zones, ...; `inspector-meta.ts`, or the folder's own) and the Fit rows it can draw. */
export const TEMPLATE_MODULES: DashboardModule[] = ALL.map(({ inspectorMeta: meta, ...m }) => {
  const kind = deviceKindOf(m);
  return {
    ...m,
    ...meta,
    ...(meta ? { settings: fitSettings(m.settings ?? [], meta.compact) } : {}),
    ...(kind ? { deviceKind: kind } : {}),
  };
});
