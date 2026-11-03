import { CLASSIC_LOOK, isLookId, SKIN_LOOK_IDS } from "@/looks/ids";
import { STYLE_SETTINGS } from "@/modules/standard-settings";

/**
 * A level's Look (`lookId`, config v17) as the theme parts and the Skin picker read it, and the skins' names as the UI
 * writes them. Split from `theme-model` so the kiosk, which only stores Looks, doesn't carry them.
 */

/** A stored Look id as one: unset and an id this build doesn't know are Classic. */
export const lookOf = (lookId: unknown): string => (isLookId(lookId) ? lookId : CLASSIC_LOOK);

/** Whether two stored Look ids are the same Look. */
export const sameLook = (a: unknown, b: unknown): boolean => lookOf(a) === lookOf(b);

/** The skin Look a Look draws its widgets in (the Skin picker's tile): a skin's own Look, else Classic (the Default skin). */
export const skinOf = (lookId: unknown): string => (typeof lookId === "string" && SKIN_LOOK_IDS.includes(lookId) ? lookId : CLASSIC_LOOK);

/** The Look a skin pack is: the skin's name, the Default skin's is Classic. */
export const lookOfSkin = (name: string): string => (name === "default" ? CLASSIC_LOOK : name);

const SKIN_OPTIONS = STYLE_SETTINGS.find((d) => d.key === "lookId")?.options ?? [];

/** The skin a Look draws in, named as the Skin select writes it: Default (Classic, a sample Look, unset), TUI, HUD, else capitalized. */
export const skinLabel = (lookId: unknown): string => {
  const value = skinOf(lookOfSkin(String(lookId)));
  return SKIN_OPTIONS.find((o) => o.value === value)?.label ?? value;
};
