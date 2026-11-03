// The Studio chrome tokens that Settings and Help also name: each --ui-* colour with the --color-s-* tokens that were
// exact copies of it. tokens.css is generated from this (tools/looks/generate.mjs), so the twins are aliases.
export const STUDIO_TWINS: readonly { ui: string; value: string; s: readonly string[] }[] = [
  { ui: "bg-app", value: "#0c0c0e", s: ["win"] },
  { ui: "bg-panel", value: "#111114", s: ["card"] },
  { ui: "bg-tile", value: "#141418", s: ["tile"] },
  { ui: "bg-hover", value: "#1a1a1f", s: ["hover", "side-line"] },
  { ui: "border-subtle", value: "#1f1f24", s: ["card-line"] },
  { ui: "border-menu", value: "#2e2e35", s: ["menu"] },
  // Boundaries of controls (fields, checkboxes, segmented, switch tracks, drag handles): 3:1 on every panel. Dividers keep the subtle ones.
  { ui: "border-control", value: "#66666f", s: ["input-line", "track-line"] },
  { ui: "border-edge", value: "#3a3a44", s: ["edge"] },
  { ui: "text-1", value: "#ededf0", s: ["t1"] },
  { ui: "text-2", value: "#c9c9cf", s: ["t2"] },
  { ui: "text-3", value: "#9696a0", s: ["t3"] },
  // Hints, helpers, captions and placeholders (4.5:1 on panels and cards); not for disabled text, that is text-disabled.
  { ui: "text-hint", value: "#8a8a94", s: ["muted", "dim"] },
  { ui: "text-disabled", value: "#55555e", s: ["faint"] },
  { ui: "text-strong", value: "#d4d4da", s: ["strong"] },
  { ui: "accent", value: "oklch(0.72 0.15 255)", s: ["accent"] },
];
