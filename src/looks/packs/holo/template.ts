// Holo's page template (P11): a radial cluster. The largest zone is the core (the FPS gauge) and the stage draws an elbow
// connector from it to every other zone (`hubLinks`), so the layout and the connectors are made for each other. Applying the
// pack never moves a widget: this is offered in the New screen flow.
import { zone, type ScreenTemplate, type ShapeLayout } from "@/lib/screen-templates/kit";

const cluster: ShapeLayout = {
  cols: 12,
  rows: 6,
  pages: [
    [
      zone("FpsMonitor", [5, 2, 4, 4], { view: "gauge", sparkline: false }),
      zone("FramePacing", [5, 1, 4, 1]),
      zone("GpuMonitor", [1, 1, 4, 3]),
      zone("CpuMonitor", [9, 1, 4, 3]),
      zone("Thermals", [1, 4, 4, 3]),
      zone("GpuRings", [9, 4, 4, 3]),
    ],
  ],
};

export const HOLO_COCKPIT: ScreenTemplate = {
  id: "holo-cockpit",
  name: "Holo cockpit",
  blurb: "A core gauge with the panels around it, joined by elbow connectors",
  fits: ["wide", "standard"],
  size: { width: 1920, height: 1080 },
  look: {
    theme: "zinc",
    radius: 0.125,
    style: { lookId: "holo", surface: "look-holo", accent: "#4FD8FF", textColor: "#EAF9FF", mutedColor: "#7FA6B8", font: "auto" },
    background: { type: "gradient", gradient: { from: "#0B2A3E", to: "#020810", angle: 180 } },
    gap: 24,
    padding: 24,
  },
  layouts: { wide: cluster, standard: cluster },
};

export default [HOLO_COCKPIT];
