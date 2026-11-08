# Stream Mixer  `StreamMixer`

Touch faders for this PC's Windows audio or Elgato Wave Link: icon, name, status line, a fader and level per channel, with tap-to-mute.

| | |
|---|---|
| File | `widgets/StreamMixer.tsx` |
| Category | Audio |
| Default / min span | 4×2 / 2×1 |
| Icon | `headphones` (Material Symbols Rounded) |
| Rendering | DOM + SVG · interactive |
| Compact views | yes — `compact` descriptor (ring of the first channel) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
source 'windows'|'wavelink', mix (a Wave Link mix id; unset = the first), channels [ids] (none = all)
labels, subs, icons { channelId: text } (name, status line and icon overrides)
fader 'leds'|'bar' (the rows view's fader)
view 'rows'|'strips'|'lcd' (its options: mixerLook)
```
Stored settings: `source`, `mix`, `channels`, `labels`, `subs`, `icons`, `fader`, `view`, `orientation` and the strip, meter, fader and LCD options of the mixer views (`src/widgets/registry/audio-settings.ts`, `mixerViewSettings`; `faderStep` and `faderWheel` are only here and in the other writable fader).

## Data
Owns prefixes: none. The channels come from the server's audio control (`useAudio`: this PC's Windows master, microphone and apps, or Wave Link's channels and mixes), not from the sensor tree; the fader and mute write back through it, and it is read-only where the server has refused writes.

Keys read: none directly. The Strips view's meters take Master and Mic levels through `useDeviceLevel` (`core/level-source.ts`), which reads the level-meter plugin's default output and input; a Wave Link channel or mix is metered by Wave Link itself; a Windows app has no level (its meter stays at silence).

## Layout by size
- Tiers handled explicitly: `sm` · `lg` (the rows' minimum height)
- Shapes handled explicitly: via CompactView
- Rows view: as many rows as the height fits (38 px each, 50 px at `lg`); the name from 240 px wide, the status line from 300 px wide and 44 px a row.
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Views
Setting `view`: **Rows** (`rows`, the default and what a widget saved before the views draws), **Strips** (`strips`, audiocn console strips: a fader on its track and scale, a meter and an LCD readout) or **LCD** (`lcd`, one LCD screen with a line per channel), vertical or horizontal (`orientation`). The strip, fader and LCD options and the fit rules are in [widget-settings.md](../../../../widget-settings.md#mixer-views--streammixer-volumemixer-wavelink). Writable: the strips' faders have a knob, move with the arrow keys (`faderStep`) and optionally the mouse wheel (`faderWheel`); the master strips come first. When the server has refused writes the faders are inert and the clip light (`meterClip`) shows its state but cannot be focused or clicked to reset. Strips and LCD fall back to Rows where the channels don't fit. The meter is audiocn's `LevelMeter` (options `meterVariant`, `meterBallistics`, `meterMinDb`, `meterMaxDb`, `meterTaper`, `meterWarnDb`, `meterClipDb`, `meterHold`, `meterValue`, `meterClip`).

## Core building blocks used
`Widget` · `shell` · `num` · `fmt` · `clamp` · `Icon` · `ChannelRow` · `Empty` · `hue`
