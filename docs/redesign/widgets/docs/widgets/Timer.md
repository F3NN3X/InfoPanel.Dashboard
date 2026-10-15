# Timer  `Timer`

A countdown with preset buttons and an optional pomodoro, for screens you can touch.

| | |
|---|---|
| File | `src/widgets/Timer.tsx` |
| Category | Info |
| Default / min span | 2×2 / 1×1 |
| Icon | `timer` (Material Symbols Rounded) |
| Rendering | DOM |
| Compact views | no (the buttons stay usable in a small zone) |
| Studio variant | none |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
presets, pomodoro, focusMin, breakMin
```
- `presets`: the buttons, minutes (setting "5, 15, 25"; at most eight, 1-1440 each).
- `pomodoro`: a Pomodoro button; it runs focus and break rounds (`focusMin`, default 25, and `breakMin`, default 5) until stopped.

## Data
None. The timer is the page's own (`src/lib/timer.ts`): one countdown shared by every Timer zone and the island. It runs in the browser, survives a reload (localStorage), and is not shared between kiosks.

## Layout by size
- Idle: the preset buttons, as many whole rows as fit (`presetsThatFit`).
- Running: the label (or "Paused", or the pomodoro round), the time left, a progress bar, and Pause / Stop. Below 70 px of height only the time and the buttons show.

## Dynamic Island
Setting `island` (**Send to island**, off by default, in the Timer group). With it on, the kiosk's island shows the countdown beside the time (amber; green for a break) and opens with "Timer done", "Break time" or "Back to focus" when a countdown runs out. The rules are in `src/widgets/island/timer.ts`; see [the island plan](../../../island/PLAN.md#what-shows-and-when).

## Core building blocks used
`Widget` · `shell` · `Num` · `Bar` · `Icon`
