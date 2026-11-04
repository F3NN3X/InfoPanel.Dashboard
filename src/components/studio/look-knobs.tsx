import { useRef, type ReactNode } from "react";
import { Pipette, RotateCcw } from "lucide-react";
import { onRovingKeyDown } from "@/lib/roving";
import type { Appearance } from "@/lib/style-resolve";
import { cn } from "@/lib/utils";
import type { ModuleSettings } from "@/modules/types";
import type { LookValues } from "./inspector-model";
import { lookName } from "./look-gallery-model";
import {
  ACCENTS,
  CORNER_STEPS,
  cornerStep,
  DENSITIES,
  densityOf,
  KNOB_KEYS,
  knobCustom,
  knobValue,
  lockedKnobs,
  surfaceChip,
  SURFACES,
  type KnobId,
} from "./look-knobs-model";

export interface LookKnobsProps {
  /** What the knobs show: the values where they edit over what that inherits (the Look's included, as the renderer resolves it). */
  values: LookValues;
  /** What a knob that is not Custom follows ("the Look", "the page"). */
  from: string;
  /** Write values (the caller detaches what it must). */
  onSet: (patch: ModuleSettings) => void;
  /** Clear keys, back to what the knob follows. */
  onClear: (keys: readonly string[]) => void;
  /** The heading ("Look: Term"); none for no heading. */
  title?: string;
  /** The knobs a screen's lock holds read-only, with the reason (`lockedKnobs`). */
  locked?: Partial<Record<KnobId, string>>;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent";
/** Every knob control is at least 44 px tall (G6). */
const SEGMENT = cn("min-h-11 flex-1 rounded-md px-1.5 text-caption font-medium text-ui-2 hover:bg-ui-hover disabled:opacity-50", FOCUS);
const SEGMENT_ON = "bg-ui-active text-ui-1";

const same = (a: unknown, b: string) => typeof a === "string" && a.trim().toLowerCase() === b.toLowerCase();

/** The control Reset hands focus to: the checked option, else the first control. */
const RESET_FOCUS = ["[aria-pressed=true]", "[role=radio][tabindex='0']", "button", "input"];

/** One knob: its name, the Custom chip with Reset, and its control. */
function Knob({ label, custom, from, onReset, locked, children }: { label: string; custom: boolean; from: string; onReset: () => void; locked?: string; children: ReactNode }) {
  const controls = useRef<HTMLDivElement>(null);
  // Reset goes away with Custom: focus moves to the knob's control, not the page.
  const reset = () => {
    onReset();
    requestAnimationFrame(() => {
      const el = controls.current;
      RESET_FOCUS.map((q) => el?.querySelector<HTMLElement>(q)).find((x) => x)?.focus();
    });
  };
  return (
    <div role="group" aria-label={label} title={locked} className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span className="font-ui-mono text-nano uppercase tracking-[0.08em] text-ui-hint">{label}</span>
        {locked ? (
          <span className="text-micro text-ui-hint">{locked}</span>
        ) : custom ? (
          <span className="flex items-center gap-1.5">
            <span className="rounded-full bg-ui-blue-bg px-2 py-px text-micro text-ui-blue-text">Custom</span>
            <button
              type="button"
              onClick={reset}
              aria-label={`Reset ${label} to ${from}`}
              title={`Reset to ${from}`}
              className={cn("flex h-11 w-11 items-center justify-center rounded-md text-ui-3 hover:bg-ui-hover hover:text-ui-1 disabled:opacity-50", FOCUS)}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ) : (
          <span className="text-micro text-ui-hint">From {from}</span>
        )}
      </div>
      <div ref={controls}>{children}</div>
    </div>
  );
}

/**
 * The knob row (D15): Accent, Surface, Corners and Density over the Look, each marked Custom while it differs from what
 * it follows, with a Reset back to it. Mode (light and dark) shows from P6, Variant with theme packs.
 */
export function LookKnobs({ values, from, onSet, onClear, title, locked = {} }: LookKnobsProps) {
  const custom = (id: KnobId) => knobCustom(values, id);
  const reset = (id: KnobId) => () => onClear(KNOB_KEYS[id]);
  const accent = knobValue(values, "accent");
  const surface = surfaceChip(values);
  const corner = cornerStep(knobValue(values, "radius"));
  const density = densityOf(values);
  const customAccent = typeof accent === "string" && accent !== "" && !ACCENTS.some((a) => same(accent, a.value));
  return (
    <section aria-label="Look knobs" data-nav-section="knobs" className="flex flex-col gap-3.5 px-4 pb-4">
      {title && <h2 className="text-body font-semibold text-ui-1">{title}</h2>}
      <Knob label="Accent" custom={custom("accent")} from={from} onReset={reset("accent")} locked={locked.accent}>
        <div className="flex flex-wrap items-center">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              aria-label={a.name}
              title={a.name}
              aria-pressed={same(accent, a.value)}
              disabled={locked.accent !== undefined}
              onClick={() => onSet({ accent: a.value })}
              className={cn("flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-50", FOCUS)}
            >
              <span
                className={cn("h-7 w-7 rounded-full", same(accent, a.value) && "shadow-[0_0_0_2px_var(--ui-bg-chrome),0_0_0_4px_#ededf0]")}
                style={{ background: a.value }}
              />
            </button>
          ))}
          <label title="Custom accent" className={cn("relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ui-accent")}>
            <span
              className={cn("flex h-7 w-7 items-center justify-center rounded-full border border-ui-strong text-ui-3", customAccent && "shadow-[0_0_0_2px_var(--ui-bg-chrome),0_0_0_4px_#ededf0]")}
              style={customAccent ? { background: accent as string } : undefined}
            >
              {!customAccent && <Pipette className="h-3.5 w-3.5" aria-hidden />}
            </span>
            <input
              type="color"
              aria-label="Accent: custom colour"
              disabled={locked.accent !== undefined}
              value={typeof accent === "string" && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#000000"}
              onChange={(e) => onSet({ accent: e.currentTarget.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </Knob>
      <Knob label="Surface" custom={custom("surface")} from={from} onReset={reset("surface")} locked={locked.surface}>
        <div role="radiogroup" aria-label="Surface" onKeyDown={(e) => onRovingKeyDown(e, "[role=radio]")} className="flex gap-1 rounded-lg border border-ui-default bg-ui-app p-1">
          {SURFACES.map((s) => {
            const on = surface === s.value;
            return (
              <button
                key={s.value || "look"}
                type="button"
                role="radio"
                aria-label={s.name}
                title={s.name}
                aria-checked={on}
                tabIndex={on || (s.value === "" && !SURFACES.some((x) => x.value === surface)) ? 0 : -1}
                disabled={locked.surface !== undefined}
                // The Look's own card is no value of the level's: picking it clears the knob.
                onClick={() => (s.value === "" ? onClear(KNOB_KEYS.surface) : onSet({ surface: s.value }))}
                className={cn(SEGMENT, "px-0.5", on && SEGMENT_ON)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </Knob>
      <Knob label="Corners" custom={custom("corners")} from={from} onReset={reset("corners")} locked={locked.corners}>
        <div className="flex min-h-11 items-center gap-3">
          <input
            type="range"
            // -1 is the Look's corners (no value stored), so every step can be picked from it.
            min={-1}
            max={CORNER_STEPS.length - 1}
            step={1}
            value={corner ?? -1}
            disabled={locked.corners !== undefined}
            aria-label="Corners"
            aria-valuetext={corner === undefined ? `${from}'s` : `${CORNER_STEPS[corner]} px`}
            onChange={(e) => {
              const step = Number(e.currentTarget.value);
              if (step < 0) onClear(KNOB_KEYS.corners);
              else onSet({ radius: String(CORNER_STEPS[step]) });
            }}
            className={cn("h-11 min-w-0 flex-1 accent-ui-blue disabled:opacity-50", FOCUS)}
          />
          <span className="w-14 shrink-0 text-right font-ui-mono text-micro text-ui-soft">{corner === undefined ? "Look" : `${CORNER_STEPS[corner]} px`}</span>
        </div>
      </Knob>
      <Knob label="Density" custom={custom("density")} from={from} onReset={reset("density")} locked={locked.density}>
        <div role="radiogroup" aria-label="Density" onKeyDown={(e) => onRovingKeyDown(e, "[role=radio]")} className="flex gap-1 rounded-lg border border-ui-default bg-ui-app p-1">
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={density === d.id}
              tabIndex={density === d.id || (density === "custom" && d.id === "normal") ? 0 : -1}
              disabled={locked.density !== undefined}
              onClick={() => (d.id === "normal" ? onClear(KNOB_KEYS.density) : onSet(d.values))}
              className={cn(SEGMENT, density === d.id && SEGMENT_ON)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Knob>
    </section>
  );
}

/**
 * The knobs over a widget's Look (the inspector's Style tab, lazy): an edit detaches its section, Reset follows the
 * page again (`withKnobReset`); a knob whose section the screen locks is read-only.
 */
export default function WidgetLookKnobs({ values, appearance, onSet, onClear }: Pick<LookKnobsProps, "values" | "onSet" | "onClear"> & { appearance: Appearance }) {
  const lookId = knobValue(values, "lookId");
  const locked = lockedKnobs(appearance, appearance.profileName ?? "the screen");
  return <LookKnobs title={`Look: ${lookName(lookId)}`} values={values} from="the page" onSet={onSet} onClear={onClear} locked={locked} />;
}
