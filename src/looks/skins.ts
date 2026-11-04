// The 13 skins (src/widgets/core/skins) as Looks of the registry (D6, config v17): built from their packs and cards, in
// the chunk `loadLook` imports, so neither the kiosk nor the studio entry carries them. A skin Look is Classic's T0, T1
// and T3 with the skin's accent, fonts, corners and its own card as its T2; what else the skin draws (its header,
// graph, meter, ring and numerals) stays the pack's, selected by the Look's id, which is the skin's name (`ext.skin`).
import { SKIN_PACKS } from "@/widgets/core/theme";
import type { SkinPack } from "@/widgets/core/types";
import classic from "./classic/look.json";
import type { Look, LookMaterial, T1Entry, T1Name } from "./look";
import { MATERIALS } from "./materials";

const CLASSIC = classic as Look;
const NAMES: Readonly<Record<string, string>> = { tui: "TUI", hud: "HUD" };

/** A skin as a Look (dark only, as every skin is). */
export function skinLook(pack: SkinPack): Look {
  const s = pack.skin;
  const card = s.surface ? MATERIALS[s.surface] : undefined;
  const t1 = { ...CLASSIC.t1.dark! } as Record<T1Name, T1Entry>;
  if (s.accent) t1.accent = { value: s.accent, usage: t1.accent.usage };
  const material = (m: NonNullable<typeof card>): LookMaterial => ({ kind: m.kind, tone: m.tone, ...(m.export !== undefined ? { export: m.export } : {}) });
  return {
    schema: 1,
    id: pack.name,
    name: NAMES[pack.name] ?? pack.name[0].toUpperCase() + pack.name.slice(1),
    description: pack.description,
    tags: ["skin", "dark"],
    modes: { supported: ["dark"], stance: "Dark only, as the skin was." },
    fonts: { body: s.font ?? CLASSIC.fonts.body, mono: s.num ?? CLASSIC.fonts.mono, display: "{body}" },
    radius: s.radius !== undefined ? `${s.radius}px` : CLASSIC.radius,
    t0: CLASSIC.t0,
    t1: { dark: t1 },
    t2: card ? { default: card.id, materials: { [card.id]: material(card) } } : { default: CLASSIC.t2!.default },
    t3: CLASSIC.t3,
    ...(CLASSIC.export ? { export: CLASSIC.export } : {}),
    ext: { skin: pack.name, tokens: { ...s }, fonts: pack.fonts },
  };
}

/** The skin Looks by id (every skin but `default`, which is Classic). */
export const SKIN_LOOKS: Record<string, Look> = Object.fromEntries(SKIN_PACKS.filter((p) => p.name !== "default").map((p) => [p.name, skinLook(p)]));
