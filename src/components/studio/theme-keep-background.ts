import { parseFlag } from "./use-stored-flag";

/** "Keep my background", remembered per screen as a local preference (P-10): not config, so not saved with the screen and not exported. */
const key = (profileId: string): string => `studio.theme.keepBackground.${profileId}`;

export function getKeepBackground(profileId: string): boolean {
  try {
    return parseFlag(localStorage.getItem(key(profileId)), false);
  } catch {
    return false;
  }
}

export function setKeepBackground(profileId: string, keep: boolean): void {
  try {
    localStorage.setItem(key(profileId), keep ? "1" : "0");
  } catch {
    // storage is off: the choice is not remembered
  }
}
