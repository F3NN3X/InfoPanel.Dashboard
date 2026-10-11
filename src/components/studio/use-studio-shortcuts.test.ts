import { describe, expect, it } from "vitest";
import { shortcutAction, type KeyInput, type ShortcutContext } from "./use-studio-shortcuts";

const key = (k: string, mods: Partial<Omit<KeyInput, "key">> = {}): KeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

const IDLE: ShortcutContext = { typing: false, overlay: false };
const TYPING: ShortcutContext = { typing: true, overlay: false };
const DIALOG: ShortcutContext = { typing: false, overlay: true };

describe("shortcutAction", () => {
  it("maps the plain zone keys", () => {
    expect(shortcutAction(key("Delete"), IDLE)).toEqual({ type: "remove" });
    expect(shortcutAction(key("Backspace"), IDLE)).toEqual({ type: "remove" });
    expect(shortcutAction(key("h"), IDLE)).toEqual({ type: "toggle-visible" });
    expect(shortcutAction(key("Escape"), IDLE)).toEqual({ type: "escape" });
    expect(shortcutAction(key("?", { shiftKey: true }), IDLE)).toEqual({ type: "cheatsheet" });
  });

  it("nudges with arrows and resizes with Shift+arrows", () => {
    expect(shortcutAction(key("ArrowRight"), IDLE)).toEqual({ type: "nudge", cols: 1, rows: 0 });
    expect(shortcutAction(key("ArrowUp"), IDLE)).toEqual({ type: "nudge", cols: 0, rows: -1 });
    expect(shortcutAction(key("ArrowLeft", { shiftKey: true }), IDLE)).toEqual({
      type: "resize",
      cols: -1,
      rows: 0,
    });
    expect(shortcutAction(key("ArrowDown", { shiftKey: true }), IDLE)).toEqual({
      type: "resize",
      cols: 0,
      rows: 1,
    });
  });

  it("maps the ctrl (and cmd) shortcuts", () => {
    expect(shortcutAction(key("s", { ctrlKey: true }), IDLE)).toEqual({ type: "save" });
    expect(shortcutAction(key("z", { ctrlKey: true }), IDLE)).toEqual({ type: "undo" });
    expect(shortcutAction(key("Z", { ctrlKey: true, shiftKey: true }), IDLE)).toEqual({ type: "redo" });
    expect(shortcutAction(key("y", { ctrlKey: true }), IDLE)).toEqual({ type: "redo" });
    expect(shortcutAction(key("d", { metaKey: true }), IDLE)).toEqual({ type: "duplicate" });
    expect(shortcutAction(key("k", { ctrlKey: true }), IDLE)).toEqual({ type: "palette" });
    expect(shortcutAction(key("0", { ctrlKey: true }), IDLE)).toEqual({ type: "zoom-fit" });
    expect(shortcutAction(key("=", { ctrlKey: true }), IDLE)).toEqual({ type: "zoom-in" });
    expect(shortcutAction(key("+", { ctrlKey: true, shiftKey: true }), IDLE)).toEqual({ type: "zoom-in" });
    expect(shortcutAction(key("-", { ctrlKey: true }), IDLE)).toEqual({ type: "zoom-out" });
  });

  it("leaves unrelated keys and Alt combos alone", () => {
    expect(shortcutAction(key("a"), IDLE)).toBeNull();
    expect(shortcutAction(key("c", { ctrlKey: true }), IDLE)).toBeNull();
    expect(shortcutAction(key("z", { ctrlKey: true, altKey: true }), IDLE)).toBeNull();
    expect(shortcutAction(key("H", { shiftKey: true }), IDLE)).toBeNull();
  });

  it("ignores plain keys while typing, but keeps Esc, save, undo/redo and the palette", () => {
    expect(shortcutAction(key("Delete"), TYPING)).toBeNull();
    expect(shortcutAction(key("Backspace"), TYPING)).toBeNull();
    expect(shortcutAction(key("h"), TYPING)).toBeNull();
    expect(shortcutAction(key("ArrowLeft"), TYPING)).toBeNull();
    expect(shortcutAction(key("?"), TYPING)).toBeNull();
    expect(shortcutAction(key("d", { ctrlKey: true }), TYPING)).toBeNull();
    expect(shortcutAction(key("0", { ctrlKey: true }), TYPING)).toBeNull();
    expect(shortcutAction(key("Escape"), TYPING)).toEqual({ type: "escape" });
    expect(shortcutAction(key("s", { ctrlKey: true }), TYPING)).toEqual({ type: "save" });
    expect(shortcutAction(key("z", { ctrlKey: true }), TYPING)).toEqual({ type: "undo" });
    expect(shortcutAction(key("y", { ctrlKey: true }), TYPING)).toEqual({ type: "redo" });
    expect(shortcutAction(key("k", { ctrlKey: true }), TYPING)).toEqual({ type: "palette" });
  });

  it("leaves Esc and plain keys to an open dialog, keeping save and undo/redo", () => {
    expect(shortcutAction(key("Escape"), DIALOG)).toBeNull();
    expect(shortcutAction(key("Delete"), DIALOG)).toBeNull();
    expect(shortcutAction(key("ArrowDown"), DIALOG)).toBeNull();
    expect(shortcutAction(key("k", { ctrlKey: true }), DIALOG)).toBeNull();
    expect(shortcutAction(key("s", { ctrlKey: true }), DIALOG)).toEqual({ type: "save" });
    expect(shortcutAction(key("z", { ctrlKey: true }), DIALOG)).toEqual({ type: "undo" });
  });
});
