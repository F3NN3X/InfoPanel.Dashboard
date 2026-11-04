// The D13 contrast test: every Look, in every mode it supports, on every card it draws, keeps fg, muted, ok, warn, crit and
// the axis label at 4.5:1 on the card (the pairs a widget draws as text or a thin line). A failure fails the test unless it
// is listed in KNOWN_GAPS with the ledger row (docs/look-system/progress.md) that owns it.
import { describe, expect, it } from "vitest";
import { loadLook, LOOK_IDS } from "@/looks";
import { resolveT1, type Look, type LookMode } from "@/looks/look";
import { SAMPLE_MATERIALS } from "@/looks/sample-materials";
import { SAMPLE_THEMES, sampleStyle } from "@/looks/sample-themes";
import { accentInk, contrastOf, LIGHT_FILL, STATUS_MODE } from "@/looks/status";
import { DEFAULT_ACCENT } from "@/looks/palette";
import { RAMP_START } from "@/looks/data-viz";
import { TEXT_VARS } from "@/widgets/core/theme";

/** Failures a Look knows and a ledger row owns: `<look>/<mode>/<card>/<pair>`. */
const KNOWN_GAPS: Record<string, string> = {
  // The accent as `ok` text on the cream cards: 4.21 and 4.43 (3:1 for numerals holds). Their accents were darkened once already for the mockup's look (L36).
  "field-kit/light/look-field-kit/ok": "L51",
  "tape-86/light/look-tape-86/ok": "L51",
};

const MIN = 4.5;
type Pair = "fg" | "muted" | "ok" | "warn" | "crit" | "axis-label";

/** The cards a Look draws in a mode, with the flat colour text sits on. */
function cards(look: Look, mode: LookMode): Record<string, string> {
  if (look.id === "classic") return mode === "light" ? { "matte-light": LIGHT_FILL } : { glass: RAMP_START, "matte-dark": "#18181b" };
  const theme = SAMPLE_THEMES.find((t) => t.id === look.id);
  const card = theme && SAMPLE_MATERIALS[`look-${theme.id}`];
  // A skin's own card has no flat hex here (gradients, patterns): its text is the shell's tone colours, checked on the tone's default fill.
  return card?.export?.startsWith("#") ? { [card.id]: card.export } : { card: mode === "light" ? LIGHT_FILL : RAMP_START };
}

/** The text colours a widget on this Look's card draws, as the shell sets them (`textVars`, the Look's layer over it). */
function colours(look: Look, mode: LookMode, fill: string): Record<Pair, string> {
  const vars = TEXT_VARS[mode];
  const theme = SAMPLE_THEMES.find((t) => t.id === look.id);
  const style = theme ? sampleStyle(theme) : {};
  const t1 = resolveT1(look, mode);
  const accent = String(style.accent ?? (look.id === "classic" ? DEFAULT_ACCENT : t1.accent));
  const status = STATUS_MODE[mode];
  return {
    fg: String(style.textColor ?? vars["--w-fg"]),
    muted: String(style.mutedColor ?? vars["--w-muted"]),
    // Only Classic's default accent darkens on a light card (`accentInk`); an accent a Look sets is its own.
    ok: look.id === "classic" && mode === "light" ? accentInk(accent, fill) : accent,
    warn: String(style.warn ?? vars["--w-warn"] ?? status.warn),
    crit: String(style.crit ?? vars["--w-crit"] ?? status.crit),
    "axis-label": vars["--w-faint"],
  };
}

describe("Look contrast (D13)", () => {
  it("every Look, mode and card holds its text pairs at 4.5:1, bar the known gaps", async () => {
    const failures: string[] = [];
    let checked = 0;
    for (const id of LOOK_IDS) {
      const look = await loadLook(id);
      if (!look) continue;
      for (const mode of look.modes.supported) {
        for (const [card, fill] of Object.entries(cards(look, mode))) {
          for (const [pair, colour] of Object.entries(colours(look, mode, fill))) {
            const ratio = contrastOf(colour, fill);
            if (ratio === undefined) continue;
            checked++;
            const key = `${id}/${mode}/${card}/${pair}`;
            if (ratio < MIN && !(key in KNOWN_GAPS)) failures.push(`${key} ${ratio.toFixed(2)}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(150);
    expect(failures).toEqual([]);
  });

  it("lists only gaps that still fail", async () => {
    const [kit, tape] = await Promise.all([loadLook("field-kit"), loadLook("tape-86")]);
    for (const [look, id, card] of [[kit, "field-kit", "look-field-kit"], [tape, "tape-86", "look-tape-86"]] as const) {
      const fill = cards(look!, "light")[card];
      expect(contrastOf(colours(look!, "light", fill).ok, fill)).toBeLessThan(MIN);
      expect(KNOWN_GAPS[`${id}/light/${card}/ok`]).toBe("L51");
    }
  });

  it("darkens an accent that fails on a light card, and keeps one that holds", () => {
    expect(contrastOf(accentInk(DEFAULT_ACCENT), LIGHT_FILL)).toBeGreaterThanOrEqual(MIN);
    expect(accentInk("#5B3FD4")).toBe("#5B3FD4");
    expect(accentInk("var(--x)")).toBe("var(--x)");
  });
});
