import type { MonitorProfile, Placement, Widget } from "@/lib/layout";
import type { ModuleSetting } from "@/modules/types";
import type { Drawer } from "./left-rail";
import { isStyleSetting } from "./settings-model";
import { placementTitle } from "./studio-modules";
import { KEYS } from "./use-studio-shortcuts";
import { widgetName } from "./widget-kinds";
import { sortZones } from "./zone-geometry";
import type { InspectorTab } from "./zone-inspector";

/** What a command palette entry does (the studio carries it out). */
export type CommandAction =
  | { type: "add-module"; id: string }
  | { type: "add-preset"; id: string }
  | { type: "profile"; id: string }
  | { type: "drawer"; drawer: Drawer }
  | { type: "sources" }
  | { type: "toggle-grid" }
  | { type: "zoom-fit" }
  | { type: "zoom-in" }
  | { type: "zoom-out" }
  | { type: "save" }
  | { type: "export" }
  | { type: "import" }
  | { type: "copy-profile" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "shortcuts" }
  | { type: "select"; id: string }
  | { type: "duplicate" }
  | { type: "toggle-visible" }
  | { type: "remove" }
  | { type: "pick-widget" }
  | { type: "save-panel-preset" }
  | { type: "select-widget"; id: string }
  | { type: "widget-remove" }
  | { type: "widget-duplicate" }
  | { type: "widget-copy" }
  | { type: "widget-paste" }
  | { type: "widget-move"; delta: -1 | 1 }
  | { type: "tab"; tab: InspectorTab }
  | { type: "goto-setting"; tab: InspectorTab; label: string };

export interface Command {
  id: string;
  label: string;
  group: string;
  /** Shortcut or location shown on the right. */
  hint?: string;
  action: CommandAction;
}

export interface CommandState {
  /** Widgets, layout starters, panel presets and saved panels the Add drawer offers. */
  insertables: { kind: "module" | "panel"; id: string; title: string }[];
  profiles: Pick<MonitorProfile, "id" | "name" | "width" | "height">[];
  placements: Placement[];
  selected: Placement | null;
  /** The selected widget's settings (empty for panels and blank zones). */
  settings: ModuleSetting[];
  /** The selected panel widget (in `selected.panel`). */
  widget: Widget | null;
  /** A widget has been copied (Paste after is offered). */
  canPasteWidget: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  showSources: boolean;
}

const DRAWERS: { drawer: Drawer; label: string }[] = [
  { drawer: "add", label: "Add" },
  { drawer: "layers", label: "Layers" },
  { drawer: "profiles", label: "Profiles" },
];

function generalCommands(s: CommandState): Command[] {
  const general = (id: string, label: string, action: CommandAction, hint?: string): Command => ({
    id,
    label,
    group: "General",
    hint,
    action,
  });
  return [
    general("save", "Save", { type: "save" }, KEYS.save),
    ...(s.canUndo ? [general("undo", "Undo", { type: "undo" }, KEYS.undo)] : []),
    ...(s.canRedo ? [general("redo", "Redo", { type: "redo" }, KEYS.redo)] : []),
    general("export", "Export config", { type: "export" }),
    general("import", "Import config…", { type: "import" }),
    general("copy-profile", "Copy profile JSON", { type: "copy-profile" }),
    general("shortcuts", "Keyboard shortcuts", { type: "shortcuts" }, KEYS.cheatsheet),
    ...DRAWERS.map(({ drawer, label }) =>
      general(`drawer:${drawer}`, `Open drawer: ${label}`, { type: "drawer", drawer })
    ),
    general("sources", s.showSources ? "Back to Design" : "Open Sources", { type: "sources" }),
    general("grid", s.showGrid ? "Hide grid" : "Show grid", { type: "toggle-grid" }),
    general("zoom-fit", "Zoom to fit", { type: "zoom-fit" }, KEYS.fit),
    general("zoom-in", "Zoom in", { type: "zoom-in" }, KEYS.zoomIn),
    general("zoom-out", "Zoom out", { type: "zoom-out" }, KEYS.zoomOut),
  ];
}

/** `widgetKeys`: Ctrl+D / Del act on the selected widget, so the zone's show no key. */
function selectedCommands(selected: Placement, settings: ModuleSetting[], widgetKeys: boolean): Command[] {
  const zone = (id: string, label: string, action: CommandAction, hint?: string): Command => ({
    id: `zone:${id}`,
    label,
    group: "Selected zone",
    hint,
    action,
  });
  return [
    zone("pick", "Pick widget…", { type: "pick-widget" }),
    ...(selected.panel ? [zone("save-preset", "Save panel as preset…", { type: "save-panel-preset" })] : []),
    zone("duplicate", "Duplicate zone", { type: "duplicate" }, widgetKeys ? undefined : KEYS.duplicate),
    zone(
      "visible",
      selected.visible ? "Hide zone" : "Show zone",
      { type: "toggle-visible" },
      KEYS.hide
    ),
    zone("remove", "Remove zone", { type: "remove" }, widgetKeys ? undefined : KEYS.remove),
    zone("tab:content", "Show Content tab", { type: "tab", tab: "content" }),
    zone("tab:style", "Show Style tab", { type: "tab", tab: "style" }),
    ...settings.map((def): Command => {
      const tab: InspectorTab = isStyleSetting(def) ? "style" : "content";
      const where = tab === "style" ? "Style" : "Content";
      return {
        id: `setting:${def.key}`,
        label: `Go to setting: ${def.label}`,
        group: "Selected zone",
        hint: def.group ? `${where} › ${def.group}` : where,
        action: { type: "goto-setting", tab, label: def.label },
      };
    }),
  ];
}

/** The selected panel widget's actions (Move only where it can go). */
function widgetCommands(widgets: Widget[], widget: Widget, canPaste: boolean): Command[] {
  const cmd = (id: string, label: string, action: CommandAction, hint?: string): Command => ({
    id: `widget:${id}`,
    label,
    group: "Selected widget",
    hint,
    action,
  });
  const i = widgets.findIndex((w) => w.id === widget.id);
  return [
    cmd("duplicate", "Duplicate widget", { type: "widget-duplicate" }, KEYS.duplicate),
    cmd("copy", "Copy widget", { type: "widget-copy" }, KEYS.copy),
    ...(canPaste ? [cmd("paste", "Paste widget after", { type: "widget-paste" }, KEYS.paste)] : []),
    ...(i > 0 ? [cmd("up", "Move widget earlier", { type: "widget-move", delta: -1 }, "Alt+↑")] : []),
    ...(i >= 0 && i < widgets.length - 1
      ? [cmd("down", "Move widget later", { type: "widget-move", delta: 1 }, "Alt+↓")]
      : []),
    cmd("remove", "Remove widget", { type: "widget-remove" }, KEYS.remove),
  ];
}

/** "Select widget: …" for each widget of the selected panel. */
function selectWidgetCommands(widgets: Widget[]): Command[] {
  return widgets.map(
    (w, i): Command => ({
      id: `select-widget:${w.id}`,
      label: `Select widget: ${widgetName(w)}`,
      group: "Widgets",
      hint: `#${i + 1}${w.visible ? "" : " · hidden"}`,
      action: { type: "select-widget", id: w.id },
    })
  );
}

/**
 * Every command available in the studio's current state. Each one maps
 * to a control that is also reachable with the mouse.
 */
export function buildCommands(s: CommandState): Command[] {
  const widgets = s.selected?.panel?.widgets ?? [];
  return [
    ...(s.widget ? widgetCommands(widgets, s.widget, s.canPasteWidget) : []),
    ...(s.selected ? selectedCommands(s.selected, s.settings, s.widget !== null) : []),
    ...selectWidgetCommands(widgets),
    ...generalCommands(s),
    ...s.insertables.map(
      (item): Command => ({
        id: `add:${item.kind}:${item.id}`,
        label: `${item.kind === "panel" ? "Add panel" : "Add widget"}: ${item.title}`,
        group: "Add",
        action:
          item.kind === "panel"
            ? { type: "add-preset", id: item.id }
            : { type: "add-module", id: item.id },
      })
    ),
    {
      id: "profile:auto",
      label: "Switch profile: Auto (match window)",
      group: "Profiles",
      action: { type: "profile", id: "auto" },
    },
    ...s.profiles.map(
      (p): Command => ({
        id: `profile:${p.id}`,
        label: `Switch profile: ${p.name}`,
        group: "Profiles",
        hint: `${p.width}×${p.height}`,
        action: { type: "profile", id: p.id },
      })
    ),
    ...sortZones(s.placements).map(
      (p): Command => ({
        id: `select:${p.id}`,
        label: `Select zone: ${placementTitle(p)}`,
        group: "Zones",
        hint: `C${p.colStart} · R${p.rowStart}`,
        action: { type: "select", id: p.id },
      })
    ),
  ];
}

/** Lower-case and strip diacritics. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * How well a label matches a (folded, non-empty) query: 3 = prefix,
 * 2 = a word starts with it, 1 = substring, 0.5 = every query word is a
 * substring, 0 = no match.
 */
export function matchScore(label: string, query: string): number {
  const text = fold(label);
  if (text.startsWith(query)) return 3;
  if (text.split(/[^\p{L}\p{N}]+/u).some((word) => word.startsWith(query))) return 2;
  if (text.includes(query)) return 1;
  const words = query.split(/\s+/).filter(Boolean);
  return words.length > 1 && words.every((w) => text.includes(w)) ? 0.5 : 0;
}

/** Commands matching the query, best first (stable within a score). */
export function rankCommands(commands: Command[], query: string): Command[] {
  const q = fold(query.trim());
  if (q === "") return commands;
  return commands
    .map((command, index) => ({ command, index, score: matchScore(command.label, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.command);
}
