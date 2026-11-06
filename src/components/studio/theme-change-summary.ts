import type { ThemePart, ThemeState } from "@/lib/theme-apply";
import { cardOfSection } from "./theme-cards";

const PART_NAME: Readonly<Record<ThemePart, string>> = { palette: "Colors", skin: "Theme", corners: "Corners", background: "Background" };

/** What changed at a level since its theme was applied: the theme parts and the fine-tune sections holding values of the level's own, once each. */
export function changeSummary(state: ThemeState): { count: number; what: string } {
  const all = [...new Set([...state.changed.map((p) => PART_NAME[p]), ...state.own.map((sec) => cardOfSection(sec).title)])];
  return { count: all.length, what: all.join(" · ") };
}

/** "1 change from Field Kit", "3 changes from Field Kit", or "Matches Field Kit". */
export const changesLine = (count: number, name: string): string => (count === 0 ? `Matches ${name}` : `${count} ${count === 1 ? "change" : "changes"} from ${name}`);
