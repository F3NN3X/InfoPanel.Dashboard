// Timer: a countdown with preset buttons and a pomodoro. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { defineWidget, NONE } from "../define";
import { timerIsland } from "../island/timer";
import { boolOf, boolSetting, numberOf, numberSetting, textSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { TimerProps } from "./Timer";

/** "5, 15, 25" → [5, 15, 25]: whole minutes 1-1440, at most eight. */
const presetsOf = (v: unknown): number[] | undefined => {
  const list = String(v ?? "")
    .split(",")
    .map((x) => Math.round(Number(x.trim())))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 1440)
    .slice(0, 8);
  return list.length ? list : undefined;
};

export default defineWidget({
  meta,
  // Small zones keep the full layout.
  inspector: { header: "yes", compact: NONE },
  settings: [
    textSetting("presets", "Presets (minutes)", "5, 15, 25", { group: "Presets", hint: "The buttons, comma separated" }),
    boolSetting("pomodoro", "Pomodoro button", false, { group: "Pomodoro", hint: "Focus and break rounds until stopped" }),
    numberSetting("focusMin", "Focus (min)", 25, { min: 5, max: 90, step: 5, group: "Pomodoro", visibleIf: (v) => v.pomodoro === true }),
    numberSetting("breakMin", "Break (min)", 5, { min: 1, max: 30, step: 1, group: "Pomodoro", visibleIf: (v) => v.pomodoro === true }),
  ],
  island: timerIsland,
  render: {
    load: () => import("./Timer"),
    toProps: (s: ModuleSettings): Partial<TimerProps> => ({
      presets: presetsOf(s.presets),
      pomodoro: boolOf(s.pomodoro),
      focusMin: numberOf(s.focusMin),
      breakMin: numberOf(s.breakMin),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings. It draws without sensor keys (module.tsx SENSORLESS).
});
