/** Browser preference: the zoom mode ("fit", or a manual zoom factor). */
export const ZOOM_KEY = "studio.zoom";

export interface ZoomPref {
  fitting: boolean;
  manual: number;
}

const DEFAULT: ZoomPref = { fitting: true, manual: 1 };

/** The stored zoom mode; nothing stored or garbage = fit. */
export function parseZoomPref(raw: string | null): ZoomPref {
  if (raw === null || raw === "fit") return DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0.25 && n <= 2 ? { fitting: false, manual: n } : DEFAULT;
}

export function formatZoomPref(pref: ZoomPref): string {
  return pref.fitting ? "fit" : String(pref.manual);
}

export function loadZoomPref(): ZoomPref {
  try {
    return parseZoomPref(localStorage.getItem(ZOOM_KEY));
  } catch {
    return DEFAULT;
  }
}

export function saveZoomPref(pref: ZoomPref): void {
  try {
    localStorage.setItem(ZOOM_KEY, formatZoomPref(pref));
  } catch {
    // Storage unavailable: keep the session state.
  }
}
