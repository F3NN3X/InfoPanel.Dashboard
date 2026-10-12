import type { ModuleSetting, ModuleSettingValue } from "@/modules/types";
import {
  COMMON_LOCALES,
  resolveGeneral,
  type GeneralFont,
  type GeneralSettings,
  type MotionChoice,
} from "@/lib/general";
import type { SheetCard } from "./category-sheet";
import { SettingRow } from "./setting-control";

interface GeneralPanelProps {
  /** `DashboardConfig.general` (only the changed keys). */
  general: GeneralSettings | undefined;
  /** Set one key (undefined = back to its default). */
  onChange: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
}

const FONT: ModuleSetting = {
  key: "font",
  label: "Font",
  type: "select",
  default: "system",
  options: [
    { value: "system", label: "System" },
    { value: "sans", label: "Sans" },
    { value: "rounded", label: "Rounded" },
    { value: "serif", label: "Serif" },
    { value: "mono", label: "Mono" },
  ],
};

const CLOCK: ModuleSetting = {
  key: "hour12",
  label: "Clock",
  type: "select",
  default: "auto",
  options: [
    { value: "auto", label: "Locale" },
    { value: "24", label: "24 h" },
    { value: "12", label: "12 h" },
  ],
};

const SECONDS: ModuleSetting = { key: "showSeconds", label: "Show seconds", type: "boolean", default: true };

const MOTION: ModuleSetting = {
  key: "motion",
  label: "Motion",
  type: "select",
  default: "system",
  options: [
    { value: "system", label: "System" },
    { value: "reduce", label: "Reduce" },
    { value: "full", label: "Full" },
  ],
};

const CURSOR: ModuleSetting = { key: "hideCursor", label: "Hide cursor in kiosk", type: "boolean", default: false };

/** The locale select: System, the common locales, and a saved one not among them. */
function localeSetting(current: string): ModuleSetting {
  const known = current === "" || COMMON_LOCALES.some((l) => l.value === current);
  return {
    key: "locale",
    label: "Date & time locale",
    type: "select",
    default: "",
    options: [
      { value: "", label: "System" },
      ...COMMON_LOCALES.map((l) => ({ value: l.value, label: `${l.label} · ${l.value}` })),
      ...(known ? [] : [{ value: current, label: current }]),
    ],
  };
}

const HINT = "text-[11px] leading-snug text-muted-foreground/70";

/**
 * The General cards (nothing selected): dashboard-wide preferences for
 * every profile — the page font, how clocks read, motion and the kiosk
 * cursor. Each card counts the keys set in it and resets just those.
 */
export function generalCards(general: GeneralSettings | undefined, onChange: GeneralPanelProps["onChange"]): SheetCard[] {
  const g = resolveGeneral({ general });
  const clock = g.hour12 === undefined ? "auto" : g.hour12 ? "12" : "24";
  const row = (def: ModuleSetting, value: ModuleSettingValue, set: (v: ModuleSettingValue) => void) => (
    <SettingRow def={def} value={value} onChange={set} sources={null} />
  );
  const set = (keys: (keyof GeneralSettings)[]) => keys.filter((k) => general?.[k] !== undefined);
  const reset = (keys: (keyof GeneralSettings)[]) => () => keys.forEach((k) => onChange(k, undefined));
  const type = ["font"] as const;
  const clockKeys = ["hour12", "showSeconds", "locale"] as const;
  const display = ["motion", "hideCursor"] as const;

  return [
    {
      id: "doc:type",
      title: "Type",
      hint: "The page font",
      terms: ["Type", "Font", "Sans", "Serif", "Mono", "Rounded"],
      changed: set([...type]).length,
      onReset: reset([...type]),
      node: (
        <>
          {row(FONT, g.font, (v) => onChange("font", v === "system" ? undefined : (v as GeneralFont)))}
          <p className={HINT}>
            Every widget whose Font is Theme uses it; a Font set on the widget or in the global style still wins.
          </p>
        </>
      ),
    },
    {
      id: "doc:clock",
      title: "Clock & date",
      hint: "How clocks and dates read",
      terms: ["Clock", "Date", "Time", "Locale", "Show seconds", "12 h", "24 h"],
      changed: set([...clockKeys]).length,
      onReset: reset([...clockKeys]),
      node: (
        <>
          {row(CLOCK, clock, (v) => onChange("hour12", v === "auto" ? undefined : v === "12"))}
          {row(SECONDS, g.showSeconds, (v) => onChange("showSeconds", v === true ? undefined : false))}
          {row(localeSetting(g.locale), g.locale, (v) => onChange("locale", v === "" ? undefined : String(v)))}
          <p className={HINT}>
            For the Clock widget: the date&apos;s order and names follow the locale, and so does the clock when it
            is set to Locale.
          </p>
        </>
      ),
    },
    {
      id: "doc:display",
      title: "Display",
      hint: "Motion and the kiosk cursor",
      terms: ["Display", "Motion", "Reduce", "Hide cursor", "Kiosk"],
      changed: set([...display]).length,
      onReset: reset([...display]),
      node: (
        <>
          {row(MOTION, g.motion, (v) => onChange("motion", v === "system" ? undefined : (v as MotionChoice)))}
          <p className={HINT}>
            Reduce shows a background video&apos;s poster and calms meters and waveforms; System follows the
            operating system&apos;s setting.
          </p>
          {row(CURSOR, g.hideCursor, (v) => onChange("hideCursor", v === true ? true : undefined))}
        </>
      ),
    },
  ];
}
