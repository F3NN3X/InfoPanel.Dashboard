---
id: themes
title: Themes
icon: palette
related: [widget-settings, background, presets]
verified: 1.3.0-beta.36
---

Set the look once and every widget follows. Change it only where a widget should differ.

## Where looks come from

:::flow
Built-in — Built into each widget
Screen — The screen's own theme
Page — What a page changes
Widget — Only sections you change
:::

Each layer overrides the one before it. Content settings (sensors, what to show) are never themed; they always belong to the widget.

## The Look view

**Look** on the rail is the one place for the look, and you always edit what is live: a change shows on the screen at once. The header reads **Live look of** and the level: a screen (with its size) or a page. The screen and page each have a menu to pick another one. Each screen owns its look; nothing above it is shared. A line under it says what the level is: "The look of ‹screen›", or for a page "What ‹page› changes from ‹screen›. Palette, corners and background come from ‹screen›." At a screen, **Lock all** and **Unlock all** sit beside it.

The column holds, from the top: the card of the applied look, the **knobs** of its Look, the **Look gallery**, and **Advanced · Fine-tune**.

## Looks and the gallery

A **Look** is how widgets are drawn: their card, colors, type, rings, meters and graphs. **Classic** is the default; the skins (TUI, macOS, HUD, Synth and the others) and the sample Looks (Field Kit, Term, Paper and the others) are Looks too. **Choose a Look** shows each one as a card drawn by the real widgets, tagged (minimal, technical, retro, neon, gaming, glass, light). The chips filter by tag and the search box by name. One click applies a Look: the level stores which Look it is and only what you change on top, so the Look's own card, accent, text colors and font come with it. A sample Look also brings its screen colors, corners and page background; tick **Keep my background** to keep yours. Your **Saved looks** follow the Looks as cards.

**Saved and template looks** opens every saved look and every screen template's look, filtered by **All**, **Saved**, **Templates** or **Light**. Your saved looks come first; each **⋯** says which levels use it (or "Not in use") and has **Rename**, **Duplicate** and **Delete**. Then one row for each screen template with a chip for each variant. Meters, Orbit and Ticker look the same, so they are one row, tagged "also Orbit, Ticker".

Picking a look writes its colors, Look, corners and background. The first one picked on a level that has none yet replaces its look, fine-tune included. After that, picking one adds to the look: it keeps the fine-tune changes you made at this level since. A variant also brings the card opacity and color swaps a new screen from it has. **Keep my background** is off by default and stays as you set it until the studio closes. On a page a look brings its Look and fine-tune values only. Widgets with their own colors or card look keep them; the toast counts them and **Make them follow** puts them back. **+ Save current look** at the bottom saves the level's look.

## The knobs

Above the gallery, the knobs change the few things you most often change on top of a Look: **Accent** (six colors and a custom one), **Surface** (the Look's own card, Glass, Light, Dark or Theme), **Corners** and **Density** (Compact, Normal or Roomy: the inner padding and the gap between items). A knob reads **From the Look** until you change it; then it reads **Custom**, and its reset button puts the Look's value back. Light and dark mode and a theme pack's variants will be knobs too, once a Look offers them. Align and size are layout, not knobs.

A widget's **Style** tab in Edit starts with the same knobs under **Look: ‹name›**. A change there is that widget's own (the section it is in stops following the page), and the reset button makes it follow again.

## The look card

The card shows the applied look's name and a line saying what it is:

- **Saved theme · also on ‹places›**, or **Saved theme · only here**: one of your saved looks.
- **From a screen template**: a template's look, named "Template · Variant", for example "Terminal · Amber".
- **Custom look · not saved**, with **Save look**. A saved look you deleted still in use reads "‹name› (deleted)".

Under **Made of**: **Colors** (the 19 color tokens and the accent) opens the Colors picker, **Base corners** is a slider (0 to 24 px) and **Background** opens the Background picker. On a page these are the screen's and can't be changed there. The card's **⋯** has **Reset to ‹name›**, **Rename**, **Duplicate** and **Delete**. Reset puts every part back to the look, background included, and clears this level's fine-tune changes in one undo step; pages keep their own.

Once you change a part after applying a saved look, a bar in the preview's header, beside the zoom, says "Changed here. Updating ‹name› also changes ‹places›." **Update ‹name›** saves it and refreshes every level that uses it (each keeps what it changed since); **Save as new** saves a new one. For a template's look the bar offers **Save look**, which saves "‹Template · Variant› copy".

To give other screens the same look, open **Saved and template looks** at a screen and choose **Apply to other screens…**: tick the screens (or **Select all**) and press **Apply**. Each screen follows the usual rules, **Keep my background** included, and one Undo takes it all back. The command palette's **Apply theme to all screens: ‹name›** does the same for every screen.

## Colors and Background

- **Colors** lists the six built-in palettes (Zinc is the built-in default), then the palettes you saved, tagged **Yours**. Each of yours has a **⋯** with what uses it, **Rename**, **Duplicate** and **Delete**. **+ Save current colors as a palette** saves the level's 19 tokens and its accent. A palette brings its accent: a look's palette the look's accent, one of yours the accent it was saved with, Ocean and Forest their own color; Zinc and the other grays keep the screen's. The glow, number glow and border colors that were the old accent change with it. Changing the colors keeps the Look, corners, background and the rest of the fine-tune.
- **Background** offers **This theme's**, **Solid**, **Gradient** and **Image**, then the background editor for the kind you picked (see [Backgrounds](background)).

## Fine-tune

Under the gallery, **Advanced · Fine-tune** lists the sections that sit on top of the theme: **Colors**, **Text**, **Shape & spacing**, **Surface & border**, **Units & format**, **Thresholds**, **Motion** and **Custom CSS**. One opens at a time. Each shows a one-line summary and a chip saying where its values come from:

| Chip | Means |
|---|---|
| **Changed here** | This level holds the value |
| **From theme** | The value the applied theme wrote |
| **From ‹screen›** | Inherited from the screen |
| **Built-in** | Nothing set; the app's default |
| **Locked** | The screen forces this section on its pages and widgets |

Editing a row makes the section **Changed here**. **Reset to inherited** goes back; with a theme applied it goes back to the theme's values. On a page, **Change here** makes a section the page's own. Colors has **Widget colors**, **Status**, **Series colors**, and **More · all 19 color tokens**. The tokens are the palette, so changing one changes the theme (the Update bar shows), not the section. Page font is in Text; it isn't part of a theme, so switching themes keeps it.

## The preview

The preview on the right draws the page at its real shape with the live look. The page buttons above it preview another page of the screen; the level you edit stays. A widget that differs from the level has a blue tag naming the section it changes. The pill says how many widgets differ; click it to hide or show the tags.

Click a widget to select it. The bar under the preview says what it uses of its own, with **Use theme's value** and **Open in Edit ↗**. With nothing selected, **Make all follow** resets every widget that differs on the page shown.

After a change, a row under the preview header says what happened, for example "Applied Desk. Palette, skin and corners changed. Background kept. 2 fine-tune changes kept.", with **Reset to ‹name›** where fine-tune was kept, and **Undo**.

## From the command palette

Each saved theme has two commands: **Apply theme: ‹name›**, which brings its background, and **Apply theme, keep background: ‹name›**. They apply at the level the Look view is set to, or the screen in Design before you have opened it.

## Follow theme, section by section

Every themable section in a widget's Style tab starts out following the theme, with the same chips as Fine-tune.

- Change a row, or choose **Change here** in the chip's menu, to change that section for this widget only. Rows start from the theme values.
- Choose **Reset to inherited** to follow again.

Inside a panel, a panel widget's chip says **From Panel** and its menu offers the same two choices.

## Locking

At a screen, **Lock** on a fine-tune section forces it on every page and widget of that screen, whatever their own setting. **Lock all** and **Unlock all** do every section at once. A locked section shows **Locked** in widgets and pages. Their own values are kept and come back when you unlock it; the section says how many widgets differ.

## Surfaces

| Surface | Look |
|---|---|
| Auto | The card the chosen skin uses |
| Glass | Translucent dark gradient with white text |
| Matte (light) / Matte (dark) | Solid light gray or near-black card |
| Match theme | Built from the theme tokens; follows light or dark themes |
| Solid, Outline, Flat, Tinted | Plain variations on the card |
| Aurora, Neon, Holo, Mesh, Carbon, Inset, Studio, Terminal | Decorative materials |

Panels also offer **None**, **Card** and **Bordered card**. Opacity, blur, border and glow apply on top of any surface.
