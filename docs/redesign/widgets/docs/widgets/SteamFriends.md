# Steam Friends  `SteamFriends`

Your Steam friends as a list or a table, colour-coded by status.

| | |
|---|---|
| File | `src/widgets/SteamFriends.tsx` |
| Category | Gaming |
| Default / min span | 2×2 / 1×1 |
| Icon | `group` (Material Symbols Rounded) |
| Rendering | DOM |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | `studio` descriptor: online count, one row per friend |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
view        list | table (default list)
sort        status | name | plugin (default status: in-game, online, away, busy, offline)
showCounts  online / in-game / total line above the list (default off)
ingameOnly  only friends playing something (default off)
showTime    the "Last online" time (default on)
colors      { ingame, online, away, busy, offline } (default Steam's colours)
```

## Data
Keys read:
- `plugins.InfoPanel.SteamAPI.SteamAPI-Social.friends-activity` (table: Friend, Status, Playing, Last Online)
- `plugins.InfoPanel.SteamAPI.SteamAPI-Social.friends-online`, `friends-ingame`, `total-friends`

The plugin lists only the friends who are online, and sends no friend avatars.

## Status
Playing a game wins over away, as in Steam: a friend who is snoozing in a game shows in the in-game colour, dimmed. Otherwise Busy, Away/Snooze and Offline map to their own colour, and anything else (Online, Looking to play/trade) is online.

## Layout by size
- List: two-line rows with a status-tinted initial from 33px of height (not at `xs`), else one line with a status dot. The time hides below 160px of width.
- Table: Friend, Status, Playing, Last online. Columns drop as the box narrows: Status below 300px, Last online below 220px, Playing below 160px.
- Rows that do not fit are left out.

## Core building blocks used
`Widget` · `shell` · `get` · `rows` · `has` · `fitRows` · `Empty`
