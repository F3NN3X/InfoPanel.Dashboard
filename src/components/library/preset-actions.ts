/**
 * What the Library does with a Style, each a config edit through the studio's history (one undo step): apply it to
 * the selection or overwrite it from the selection, rename, duplicate and delete. The built-in Styles can be applied
 * and duplicated, nothing more. Themes, palettes and skins are handled in Theme.
 */
import { Copy, Paintbrush, Pencil, RefreshCw, SlidersHorizontal, Trash2 } from "lucide-react";
import { uid, type StylePreset } from "@/lib/layout";
import type { LibraryItem } from "@/lib/library";
import { CONFIG_STYLE, CONFIG_WPRESET, isBuiltinItem } from "@/lib/my-library/config-items";
import { ALL_MODULES } from "@/components/studio/studio-modules";
import type { UserWidgetPreset } from "@/lib/widget-presets";
import { deleteWidgetPreset, duplicateWidgetPreset, renameWidgetPreset } from "@/lib/widget-presets-edit";
import { deleteStylePreset, duplicateStylePreset, renameStylePreset, updateStylePreset } from "@/lib/style-presets";
import type { ModuleSettings } from "@/modules/types";
import { applyStyle, type StudioBridge } from "./library-actions";
import type { DetailAction } from "./library-detail";

export interface PresetContext {
  bridge: StudioBridge;
  /** The look the selected widget has of its own; null = nothing selected. */
  selectionStyle: ModuleSettings | null;
  /** Select an item (a copy just made, or none after a delete). */
  select: (id: string | null) => void;
  /** Focus the item's name field. */
  rename: (id: string) => void;
}

/** A saved Style: the ones the Library may rename and delete. */
export const isUserPreset = (item: Pick<LibraryItem, "id">): boolean => item.id.startsWith(CONFIG_STYLE) || item.id.startsWith(CONFIG_WPRESET);
export const isPresetItem = (item: Pick<LibraryItem, "kind">): boolean => item.kind === "style" || item.kind === "wpreset";
const isWidgetPreset = (item: Pick<LibraryItem, "kind">): boolean => item.kind === "wpreset";

const dataId = (item: LibraryItem) => (item.data as { id: string }).id;

/** Why a Style can't take the selection's look, or undefined when it can. */
function updateBlocked(ctx: PresetContext): string | undefined {
  if (ctx.selectionStyle === null) return "Select a widget on the canvas first";
  return Object.keys(ctx.selectionStyle).length === 0 ? "The selected widget follows the theme: it has no style of its own" : undefined;
}

/** The selected zones a saved widget preset applies to: the ones that hold its widget. */
const presetZones = (item: LibraryItem, ctx: PresetContext) => ctx.bridge.selection.filter((z) => z.module === (item.data as UserWidgetPreset).widget);

/** A saved widget preset onto the selected zones of its widget: its view and settings, one undo step (the size stays). */
function applyWidgetPreset(item: LibraryItem, ctx: PresetContext): void {
  const preset = item.data as UserWidgetPreset;
  const mod = ALL_MODULES.find((m) => m.id === preset.widget);
  const ids = new Set(presetZones(item, ctx).map((z) => z.id));
  if (ids.size === 0) {
    ctx.bridge.toast(`Select a ${mod?.title ?? preset.widget} widget first`);
    return;
  }
  const patch = { ...(preset.view ? { [mod?.viewKey ?? "view"]: preset.view } : {}), ...preset.settings };
  ctx.bridge.updateProfile((p) => ({ ...p, placements: p.placements.map((z) => (ids.has(z.id) ? { ...z, settings: { ...z.settings, ...patch } } : z)) }));
  ctx.bridge.toast(`Applied ${item.name} to ${ids.size === 1 ? "the widget" : `${ids.size} widgets`}`);
}

/** The item's main action (double-click, Enter): apply the Style, or the widget preset, to the selection. */
export function presetPrimary(item: LibraryItem, ctx: PresetContext): DetailAction {
  if (isWidgetPreset(item)) {
    const none = presetZones(item, ctx).length === 0;
    return {
      label: "Apply to selection",
      icon: SlidersHorizontal,
      run: () => applyWidgetPreset(item, ctx),
      disabled: none,
      title: none ? "Select a widget of this kind on the canvas first" : "Sets the view and settings; the size stays",
    };
  }
  const none = ctx.bridge.selection.length === 0;
  return {
    label: "Apply to selection",
    icon: Paintbrush,
    run: () => void applyStyle(ctx.bridge, item),
    disabled: none,
    title: none ? "Select a widget on the canvas first" : undefined,
  };
}

/** A saved widget preset's other actions: rename, duplicate, delete. */
function widgetPresetSecondary(item: LibraryItem, ctx: PresetContext): DetailAction[] {
  const { bridge } = ctx;
  return [
    { label: "Rename", icon: Pencil, run: () => ctx.rename(item.id) },
    {
      label: "Duplicate",
      icon: Copy,
      run: () => {
        const id = uid("wpreset");
        bridge.setConfig((c) => duplicateWidgetPreset(c, dataId(item), id, new Date().toISOString()));
        ctx.select(CONFIG_WPRESET + id);
      },
      title: "A saved copy to change",
    },
    {
      label: "Delete",
      icon: Trash2,
      run: () => {
        bridge.setConfig((c) => deleteWidgetPreset(c, dataId(item)));
        ctx.select(null);
        bridge.toast(`Deleted ${item.name}`);
      },
    },
  ];
}

/** The rest of the item's actions. */
export function presetSecondary(item: LibraryItem, ctx: PresetContext): DetailAction[] {
  if (isWidgetPreset(item)) return widgetPresetSecondary(item, ctx);
  const { bridge } = ctx;
  const builtin = isBuiltinItem(item);
  const out: DetailAction[] = [];
  if (!builtin) {
    const blocked = updateBlocked(ctx);
    out.push({
      label: "Update from selection",
      icon: RefreshCw,
      disabled: blocked !== undefined,
      title: blocked ?? "Replace this Style's settings with the selected widget's style",
      run: () => {
        bridge.setConfig((c) => updateStylePreset(c, dataId(item), ctx.selectionStyle ?? {}));
        bridge.toast(`Updated ${item.name} from the selection`);
      },
    });
    out.push({ label: "Rename", icon: Pencil, run: () => ctx.rename(item.id) });
  }
  out.push({
    label: "Duplicate",
    icon: Copy,
    run: () => {
      const id = uid("style");
      if (builtin) {
        const style = item.data as StylePreset;
        bridge.setConfig((c) => ({ ...c, stylePresets: [...(c.stylePresets ?? []), { id, name: `${style.name} copy`, settings: { ...style.settings } }] }));
      } else bridge.setConfig((c) => duplicateStylePreset(c, dataId(item), id));
      ctx.select(CONFIG_STYLE + id);
    },
    title: "A saved copy to change",
  });
  if (!builtin)
    out.push({
      label: "Delete",
      icon: Trash2,
      run: () => {
        bridge.setConfig((c) => deleteStylePreset(c, dataId(item)));
        ctx.select(null);
        bridge.toast(`Deleted ${item.name}`);
      },
    });
  return out;
}

/** Rename a saved Style or widget preset (the detail's name field). */
export function renamePreset(item: LibraryItem, bridge: StudioBridge, name: string): void {
  bridge.setConfig((c) => (isWidgetPreset(item) ? renameWidgetPreset(c, dataId(item), name) : renameStylePreset(c, dataId(item), name)));
}
