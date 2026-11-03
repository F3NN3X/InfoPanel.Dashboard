# Batch 8: audiocn mixer views (D-21, user-directed)

D-21 is `fixed`. The rows view from batch 2b stays the default. All three mixers (StreamMixer, VolumeMixer, WaveLink) now also offer the audiocn **Strips** and **LCD** views, vertical or horizontal. Each widget keeps its own data. WaveLink did not use the audiocn components before this batch: it used only the audio maths (`src/lib/audio/`) and its own `LedLadder`/`MeterPair` meters.

## Vendored components
- `src/components/ui/audiocn/`: `channel-strip.tsx`, `mixer.tsx`, `fader.tsx`, `lcd-display.tsx`, `db-scale.tsx`, `use-audio-config.tsx` (upstream `hooks/`). They sit next to the app's shadcn-style `ui/` primitives and are mapped by `src/components/ui/**` (`components-ui`).
- The MIT notice is in `src/components/ui/audiocn/LICENSE`, the same way `src/assets/meteocons/LICENSE` is kept, plus a header comment in each file.
- Local changes from upstream:
  - imports point to the folder (`./db-scale`, `./use-audio-config`);
  - the `"use client"` line is gone;
  - there are two `local:` edits. The console cap line is `hsl(var(--foreground))` (`fader.tsx:183`) and the LCD primary ink is `hsl(var(--primary))` (`lcd-display.tsx:68`), because the app's tokens are HSL triplets.
  - a third `local:` edit: `channel-strip.tsx` imports `./badge`, a copy of the app's `Badge` (same `variant` names). It replaces upstream's `@/components/ui/badge`. When the lazy chunk imported the app's badge, Rollup split it into its own chunk on the kiosk's first load. That made 35 requests, over `kioskLoadRequests` (34), and `kiosk-budget.spec.ts` failed.
- `lib/audio`:
  - Nothing was added. The components need only `decibels`, `taper`, `types` and `ballistics` (type only), which are identical to upstream apart from line endings.
  - `bands.ts` and `frame-loop.ts` are untouched.
- `level-meter.tsx` was not vendored in this batch; **batch 8b vendors it** (with `db-readout`, `clip-indicator`, `use-visibility`) and draws it in `ChannelStrip.Meter`, so the meter options below are exposed. See `batch-8b-notes.md`. In this batch `ChannelStrip.Meter` held our own meters (Wave Link's `MeterPair`; an `LedLadder` of the volume for the other two).

## Theming (`src/widgets/core/mixer-views.css`)
- The components use shadcn token classes (`bg-muted/40`, `bg-primary`, `text-muted-foreground`, `bg-input`, …). Tailwind compiles these to `hsl(var(--x))` (`@theme inline`, `src/index.css:18`).
- Inside a `.audiocn` scope, each token is set to a relative-colour body such as `--muted: from color-mix(in oklab, var(--w-fg) 10%, transparent) h s l`. `hsl(from <colour> h s l)` then keeps the colour and its alpha. Because of this, no vendored class needed editing.
- Text follows `--w-fg` and `--w-muted`, which the shell sets from the surface tone. Fills use the text colour at a low share. `--primary` comes from each strip's `--channel-accent`: the fader fill, the colour tag and the LCD's "Channel" ink.
- `src/index.css:41-46` adds `--color-meter-ok`, `--color-meter-warn` and `--color-channel-mute` (plus the `-foreground` pairs) for the strip status badge. They are set only inside the scope.
- The knob is the text colour. The console cap is the text colour with an inverted line (`--ac-inverse`).
- LCD **Auto** follows the widget's surface, not the page's `prefers-color-scheme` (`lcdAppearanceFor`, `mixer-views.tsx`):
  - light tone: backlit;
  - dark and theme tones: glowing.

  **Uncertain:** a light app theme on the `theme` surface still gets the glowing LCD (see the paper shots).
- LCD label contrast (V1): upstream's dim label ink measured 1.9–2.9:1. The labels now take 80% of the lit ink in the backlit LCD and 85% in the glowing one. Measured in the browser: light labels 5.76–7.17:1, dark labels 4.71–9.59:1, values ≥ 6.25:1.
- The meter's ok colour is the theme's live token (`var(--wl-live, var(--accent))`), not a hex (nit 1). Warn and crit follow `TONES`.
- Checked in screenshots on glass (dark), matte-light (light), the paper theme on the theme surface, and the nixie, tui and cyber skins. The other skins all use dark skin surfaces, so they take the dark path.

## Views and fit
- `MIXER_VIEWS` (`src/widgets/core/mixer-look.ts:74`):
  - `rows`: the default; today's layout, untouched;
  - `strips`: a `Mixer` of `ChannelStrip`s. Each strip has a header, a meter, a `Fader` with `FaderTrack`, `FaderRange`, `FaderScale` and `FaderThumb`, an `LcdDisplay` readout, and mute in `ChannelStripControls`. Masters go after a `MixerSeparator` in `MixerMaster`: StreamMixer's Master, and WaveLink's mixes when Mixes is on;
  - `lcd`: one `LcdDisplay` with a `LcdDisplayRow` per channel (name, then level or MUTE). Vertical is a list; horizontal is columns.
- Why only two audiocn views: a "faders only" view would be Strips with Plain style, the LCD off and the meter off. Those are settings, so it was not a distinct view.
- The meta declares the views, so the View row, the Add catalog's views and the widget-QA views row all pick them up.
- Fit: `mixerFit` and `thinTicks` (`src/widgets/core/mixer-fit.ts`) are pure functions.
  - A view that can't fit one strip or line draws the rows.
  - Strips step down before any channel is left out (fix round 1, V2): the picked size, each smaller size (lg → default → sm), then sm **dense** (tight padding, 4px gaps), then sm **bare** (no scale, status line, icon or badge; the readout becomes text where the LCD has no room). Only then does it show fewer, with a "+n" mark.
  - The fit counts what is really drawn: the name length, a read-only fader's track (no thumb), and the controls row (mute button 28, mute mark 24, route dots 8, else none).
  - A short zone drops a strip's LCD before it gives up the view.
  - Vertical strips share the zone's width. Horizontal strips share its height (`minmax(0,1fr)` rows, centred content), with 4px kept below the last one for the fader's touch area.
  - The separator before the masters is reserved only when some strips are masters and some aren't.
  - LCD view (V1): the text size comes from the zone, from the `lcdSize` step up to 48px, at a 1.5em line pitch; the master separator is reserved. Horizontal columns are as wide as the longest name, on one row or two, whichever gives the larger text.
  - Scale ticks are thinned to the measured fader travel. Upstream's thinning only hides labels, and the overflow probe counted the hidden ones as overlaps.
  - Where a widget draws its summary (StreamMixer and VolumeMixer up to 2x2, the 2x4 column), the summary is unchanged.

## Behaviour
- **StreamMixer** writes through `setVolume`/`toggleMute` (`control.ts`), as the rows do. There is a 500 ms hold after release, like `MixFader`.
- `ReadOnly` still wraps the view. With `audioRefusal` set, the faders are disabled and draw no thumb. `ReadOnly` now also sets `inert` on what it wraps, and the mute buttons are `disabled` (strips and rows), so a refused mixer's mute can't be reached from the keyboard either (S3).
- Base UI's slider gives the writable thumbs `role="slider"` and keyboard handling. Checked in `tests/widgets/StreamMixer.test.tsx` ("the strips view"):
  - ArrowUp: Master 30 → 31;
  - PageDown: Mic 60 → 50.
- **VolumeMixer** and **WaveLink** stay read-only. WaveLink wrote nothing before: no audio-control import, only readouts.
  - Their faders render `FaderTrack` + `FaderRange` with no `FaderThumb`, so there is no knob and no slider role (D-21: no white knob in read-only kiosk mode). The fader is `disabled`, and stays at full opacity.
  - Mute shows as a mark.
  - WaveLink's mix routes become live/muted dots under each channel.
  - The mixes become master strips.
  - Faders are in dB from −60 to 0 when the plugin sends `levelDb` (1.2+), otherwise in %.
  - Input devices were not drawn in the audiocn views in this batch (only the rows view, at lg). Batch 8b draws them in Strips and LCD, as a group of their own.

## Settings (`src/widgets/registry/audio-settings.ts:109` `mixerViewSettings`, `:158` `mixerLookOf`)
- **Keys added to all three mixers:**
  - `view`;
  - `stripVariant`, `stripSize`, `stripAccent`, `stripIcon`, `stripSub`, `stripMeter`, `stripLcd`, `stripStatus`;
  - `faderVariant`, `faderRange`, `faderScale`, `scaleLabels`, `scaleSide`, `scaleTicks`;
  - `lcdVariant`, `lcdAppearance`, `lcdSize`, `lcdMatrix`, `lcdScanlines`, `lcdStatus`.
- **Keys added to some mixers only:**
  - `orientation`: StreamMixer and VolumeMixer. WaveLink keeps its `meterOrientation`, which now applies in every view.
  - `faderTaper`: WaveLink.
  - `faderStep`, `faderWheel`: StreamMixer.
- Visibility uses `visibleIf`:
  - strip, fader and scale rows show only in Strips; scale rows only with Scale on;
  - LCD rows show in LCD, and in Strips with the LCD readout on;
  - StreamMixer's `fader` (LEDs/Bar) is now gated to Rows (`viewOnly`, `stream-audio.ts`).
- Wiring:
  - registry: `stream-audio.ts` (StreamMixer), `c.ts` (VolumeMixer), `WAVELINK_SETTINGS` / `wavelinkToProps`;
  - prop: `mixerLook` on each widget.

### Every upstream prop
**Mixer**
- `orientation`: exposed as `orientation` (WaveLink `meterOrientation`).
- `size`: exposed as `stripSize`.
- `minDb`, `maxDb`, `zones`, `ballistics`: exposed in batch 8b as `meterMinDb`, `meterMaxDb`, `meterWarnDb` + `meterClipDb`, and `meterBallistics` (passed on the `Mixer`, which hands them to every strip's `LevelMeter`).
- `disabled`: not exposed. It follows the widget's write state.
- Parts:
  - `MixerChannels.scrollable`: not exposed. It is fixed off, because a kiosk can't scroll and the fit counts the rest.
  - `MixerHeader`, `MixerTitle`, `MixerActions`: not used. The widget header is the mixer's header.
  - `MixerEmpty`: not used. Each widget's own empty state stands.
  - Ctrl+arrow strip navigation comes with `MixerChannels`.

**ChannelStrip**
- `orientation`: from the mixer.
- `variant`: exposed as `stripVariant` (default/card/ghost). `master` is used for the master strips.
- `size`: exposed as `stripSize`.
- `muted`: from data.
- `solo`, `dimmed`: not exposed. No source has solo.
- `selected`: not exposed. There is no selection on a dashboard.
- `disabled`: not exposed. It follows the write state.
- `accent`: exposed as `stripAccent`. The colour is the widget's channel colour.
- `render`: not exposed (render prop).
- Parts:
  - `ChannelStripIcon`: exposed as `stripIcon` (horizontal strips; vertical strips leave it out for height).
  - `ChannelStripDescription`: exposed as `stripSub`.
  - `ChannelStripStatus`: exposed as `stripStatus` (horizontal strips).
  - `ChannelStripMeter`: exposed as `stripMeter`; its `LevelMeter` options are exposed in batch 8b.
  - `ChannelStripValue`: exposed as `stripLcd` (LCD or plain text).
  - `ChannelStripActions`: not used. Controls holds mute.
  - `ChannelStripNotice`: not exposed. `ReadOnly` and the widgets' own states cover it.

**Fader**
- `value`, `defaultValue`, `onValueChange`, `onValueCommitted`: not exposed (data and callbacks).
- `min`, `max`: not exposed. They are the unit's: 0–100 %, or −60–0 dB.
- `step`: exposed as `faderStep` (StreamMixer).
- `largeStep`: not exposed. It is 10 × step.
- `fineStep`: not exposed. It is 1 % or 0.1 dB.
- `resetValue`: not exposed. Double-click reset is a no-op (the current value), because jumping a live volume on a touch panel is a hazard.
- `taper`: exposed as `faderTaper` (WaveLink's dB faders; a % fader is linear).
- `origin`: not exposed. A volume is not a bipolar gain.
- `detents`: not exposed. It is empty, because a % fader has no unity point and the dB faders are read-only.
- `silenceAtMin`: not exposed. Windows 0 % is not −∞.
- `allowWheel`: exposed as `faderWheel` (StreamMixer).
- `orientation`: from the view.
- `variant`: exposed as `faderVariant`.
- `size`: exposed as `stripSize`.
- `format`: not exposed (the unit's).
- `disabled`: not exposed (write state).
- `aria-label`: set to "<name> level".
- Parts:
  - `FaderRange`: exposed as `faderRange`.
  - `FaderThumb`: drawn only on a writable fader.
  - `FaderScale` → `DbScale`: `ticks` exposed as `scaleTicks`, `side` as `scaleSide`, `labels` as `scaleLabels`; `format` is the unit's; `taper`, `min`, `max` and `orientation` come from the fader.
  - `FaderLabel`: not used. The strip title and the aria-label name it.
  - `FaderValue editable`: not exposed. Typing a value is not a touch-kiosk action, and the LCD shows the value.
  - `FaderReset`: not exposed (same hazard as `resetValue`).

**LcdDisplay**
- `variant`: exposed as `lcdVariant`.
- `appearance`: exposed as `lcdAppearance`.
- `size`: exposed as `lcdSize`.
- `matrix`: exposed as `lcdMatrix`.
- `scanlines`: exposed as `lcdScanlines`.
- `LcdDisplayStatus`: exposed as `lcdStatus`. It blinks while the source is live and is off otherwise; `busy` is unused.
- `LcdDisplayValue.live`: not exposed. `aria-live` would announce at the stream's rate.
- `LcdDisplaySeparator`: used between channels and masters.
- `LcdDisplaySelect*`: not exposed. It is an interactive picker; channel and mix choices live in settings.
- A custom `--lcd-display-ink`: not exposed as its own colour. Channel ink follows the accent and the channel colour, so it would have added a colour row to the Widget colours tests for little gain.

## Saved data
- Every key is optional: a missing or unknown value is the default (`mixerLookOf`). There is no config version and no `mergeConfig` change.
- `tests/widgets/registry/mixer-views.test.ts`, for each widget:
  - `{}` and the schema defaults give `MIXER_LOOK` (the rows view);
  - every option round-trips through JSON;
  - unknown values fall back;
  - the `visibleIf` gates are checked.
- InfoPanel export:
  - VolumeMixer exports its volume and mute sensors (`native/modules/specs.ts:70`) and reads no view setting;
  - StreamMixer and WaveLink are not exportable (`native/tiers.ts:108,112`);
  - so nothing changes.
- `tests/lib/__fixtures__/v8-parity.json` is unchanged (not in `git status`).

## Tests
- New:
  - `tests/widgets/core/mixer-fit.test.ts`: the fit (the size steps, dense, bare, the masters' separator in both orientations, the LCD font from the zone, its separator, two-row columns, a read-only fader's height) and `thinTicks` (a single tick, duplicates, ticks at one position);
  - `tests/widgets/mixer-views.test.tsx`: happy-dom. Each widget draws strips and lcd in both orientations and falls back to rows when too small. VolumeMixer and WaveLink have no `[role=slider]`; StreamMixer has one per channel (S2). In a tight zone the strips drawn plus the "+n" mark add up to every channel. It also checks LCD Auto;
  - `tests/widgets/registry/mixer-views.test.ts`: the settings (S1: its SSR render test was removed, because SSR draws the lazy widgets' fallback and so checked no view; the `.tsx` test above renders each view);
  - four StreamMixer strips cases: keyboard, refusal (no slider and no thumb), a refused write can't mute from the keyboard in strips or rows (`inert`, disabled button, no `act` call), and no look = rows.
- `views.test.ts` (each view renders once through `module.render`) now lists the three mixers. It renders through SSR too, so for the mixers it has the same limit S1 found.
- `c.schema.test.ts` maps the new `view` spec prop for VolumeMixer and WaveLink.
- Snapshot: `refiled-widgets.schema.test.ts.snap` (VolumeMixer and WaveLink; StreamMixer isn't in it) only gains rows: the Layout section (`view`, plus `orientation` on VolumeMixer) and the Strip, Fader and LCD sections, with `faderTaper` on WaveLink. No existing row moved or changed.

## Budgets (`npm run perf:budgets`, Windows build)
| | HEAD (worktree build) | batch 8 | change |
|---|---|---|---|
| kiosk | 273796 B | 275596 B | +1800 |
| studio | 611627 B | 615339 B | +3712 |

- The audiocn code and the view are out of the first bundle: the `mixer-views` chunk (19.2 KB gzip) and `mixer-views.css` load with the three lazy widgets.
- What grew:
  - the eager registry chunk (`sensor-store`, +1798 B): the settings schema of the three mixers;
  - in studio, Base UI internals were re-split into shared chunks (`composite`, `useCompositeListItem`, `DirectionContext`) once the lazy chunk imports the slider too;
  - plus import specifiers.
- The budgets were raised by exactly those measured deltas (`tools/perf/budgets.json`: kiosk 273810 → 275610, studio 611540 → 615252). `perf:budgets` exits 0. Studio is 87 B over its new budget but within the limit, the same 87 B that HEAD's Windows build reads over the old one.
- The kiosk's request count is back at HEAD's (no new eager chunk).
- Not budgeted: the main CSS grew from 28042 to 32340 B gzip. Tailwind scans the vendored classes into the one stylesheet, and it can't be split per chunk.
- For the commit message (nit 4): "Budgets rise by the measured deltas: kiosk 273796 → 275596 B (+1800, the three mixers' settings schema in the eager `sensor-store` chunk, +1798 B); studio 611627 → 615339 B (+3712, the same plus Base UI internals re-split into `composite`, `useCompositeListItem` and `DirectionContext` once the lazy mixer chunk imports the slider). The audiocn code itself loads lazily. Studio reads 87 B over its new budget on Windows, the same offset HEAD reads; confirm the Linux CI number after push."

## Overflow probe
`scratchpad\refine\b8-overflow.mjs` covers the three widgets × `rows`, `strips` and `lcd` × vertical and horizontal, at 1x1, 2x2, 4x2, 2x4 and 4x4. It ran twice:
- with the defaults: `of-b8.json`;
- with every size and shape option turned up (lg strips, lg LCD, console cap, card, badge, scale after): `of-b8-opts.json`.

Result: clean, except StreamMixer and VolumeMixer at 2x4 (`clipped` in `div.relative.mt-auto > div.absolute.inset-y-0`). Those are in the compact column summary, which is the same in every view including rows and which this batch doesn't touch. So they are probably pre-existing, but not checked against a HEAD build.

Fix round 1 re-ran both. Same result, plus one false positive: StreamMixer strips at 4x2 and 4x4 (both orientations) report Base UI's visually hidden `<input>` inside each thumb as clipped (2px). It is meant to be clipped. Fit changes that went into this round, found by the probe: the "+n" mark no longer overflows by 2px, and the last horizontal fader's touch area no longer spills out of the zone.

## Screenshots
- `scratchpad\refine\shots\b8\final\`: `<look>_<widget>_<view>-<orientation>_<span>.png`. That is 120 PNGs: 3 widgets × (strips, lcd) × (vertical, horizontal), plus rows, at 2x2 and 4x4, for dark (glass), light (matte-light), paper (theme surface) and nixie.
- Sheets: `shots\b8\sheet-dark-4x4.png`, `sheet-paper-4x4.png`, `sheet-light-nixie-4x4.png`, and `sheet-2x2.png` (fix round 1, regenerated).
- Option combinations (console cap, card, Live badge, amber LCD, scale after, lg) in dark and tui: `shots\b8\options\` and `shots\b8\options.png`.
- What to look at:
  - StreamMixer 4x4 strips, vertical and horizontal (writable knobs);
  - WaveLink 4x2 vertical (masters after the separator, LCD dropped);
  - VolumeMixer 4x4 horizontal (7 of 8, "+1");
  - LCD 4x4 in light (backlit) and nixie.

## Not done or uncertain
- StreamMixer has no widget spec under `docs/redesign/widgets/docs/widgets/`, so nothing was updated there. VolumeMixer and WaveLink `.md` and `.facts.json` were updated.
- The help article `streaming.md` gained one sentence. No other article lists a mixer's views.
- VolumeMixer's Device name off leaves the strips' titles and LCD labels empty, as it does for the rows.
