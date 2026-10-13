# Waviz porting spec (renderer + 29 presets)

Source: https://github.com/Waviz-Team/Waviz (HEAD cloned shallow, read from `src/`). Local copy:
`...\scratchpad\waviz-src` (note: a `public/rainDrops.mp4:Zone.Identifier` path breaks a normal Windows
checkout; files were extracted with `git cat-file`).
Files: `src/visualizers/visualizer.ts` (all drawing), `src/utils/mathUtils.ts` (windows, periodic),
`src/utils/colorUtils.ts` (colour parsing), `src/analysers/analyzer.ts`, `src/types/types.ts`,
`src/components/{Bars,Waves,Dots,Particles,Mixed}/*.tsx` (presets). Note the repo has no `polarBars` viz,
no gallery file and no `src/analyzer` dir (it is `src/analysers`). "Gallery description" = the `//*` header
comment of each preset file (the only description text in the repo).

All pixel quantities below are ABSOLUTE canvas pixels (amplitudes, radii, dash lengths, line widths).
Preset canvases are 500x300 (Dots1-4: 600x350, black bg). On a differently sized canvas, scale pixel values
by `min(w/500, h/300)` or tune.

---------------------------------------------------------------------------------------------------
## A. Layer model

A visualiser renders a list of layers every frame. Per frame:

```
render(layers):                       // layers = one layer object or array
  ctx.clearRect(0,0,W,H)
  for L in layers: layer(merge(DEFAULTS, L))   // merge = Object.assign: SHALLOW, key-level replace
  frame++                              // frame counter, starts 0, used by autoRotate / particles
  schedule next frame
DEFAULTS = { domain:['time'], coord:['rect'], viz:['line'], color:['#E34AB0'], stroke:[2] }
```
Every option is a positional tuple; `undefined`/hole means "use the function default". A layer that
provides a key replaces the WHOLE tuple (e.g. `color:['linearGradient']` loses nothing but also inherits
nothing from default color). `fill` has no default (off).

### A.1 layer(L) order of operations
```
ctx.beginPath()
data  = preprocess(L.domain)         // number[]  (centred, scaled)
pts   = L.coord[0]=='polar' ? toPolar(data, ...L.coord[1..3]) : toRect(data)   // [x,y][]
build path / marks for L.viz[0] (line|bars|dots|particles; anything else -> line)
ctx.strokeStyle = colour(L.color)    // set AFTER path built, still before stroke()
if L.fill: fill(L.coord[0], fill[0], fill[1], fill[2])   // see A.6 (buggy)
ctx.lineWidth = L.stroke[0] (default 2); if L.stroke[1]=='dashes': ctx.setLineDash([10,10])
if L.coord[0]=='polar' and L.viz[0] != 'bars': ctx.closePath()
ctx.stroke()
```
Everything (line, bars, dots, particles) is rendered by ONE `stroke()` of one path. There is no per-item
colour. Dots/particles are 1x1 `roundRect(x,y,1,1,1000)` sub-paths (a ~0.5px-radius circle) so their
visible diameter is about `lineWidth + 1` px; the `stroke[0]` IS the dot size.
Default `lineJoin/lineCap` (miter/butt) are never changed; bars are therefore flat-ended strokes whose
`lineWidth` is the bar width.

### A.2 domain = [kind, amplitude=100, range=1024, window?]
```
kind 'freq'  -> src = analyser byte freq array  (len 1024)
kind 'time' (or anything else) -> src = analyser byte time array (len 1024)
x[i] = ((src[i]/255) - 0.5) * amplitude        // centred, signed, in PIXELS
x    = x.slice(0, range)                       // "first `range` samples/bins", NOT downsampled
if kind=='time' and window: x[n] *= w(n, N=x.length)    // applied after scaling/slicing; freq ignores window
```
- `amplitude` may be negative (freq presets use -200: louder bin => y goes UP the screen, see rect).
- `range` is a hard truncation of the array, then the truncated slice is stretched over the full width/
  circle. `['time',200]` therefore shows the first 200 of 1024 samples (about 4.5 ms at 44.1 kHz), i.e.
  a zoomed-in waveform. `['freq', amp, 300]` = bins 0..299 (about 0..6.5 kHz at 44.1 kHz, bin = sr/2048).
- Time data is 128-centred so silence gives x ~= 0.0 (`(128/255-0.5)*amp = 0.0039*amp`). Freq silence
  gives x = -0.5*amp.
- Window names (case-insensitive): `hann|hanning`, `hamming`, `exponential|exp`, `blackman-harris|bharris|blackmanh`.
```
hann(n)     = 0.5 - 0.5*cos(2*pi*n/(N-1))
hamming(n)  = 0.54 - 0.46*cos(2*pi*n/(N-1))
exp(n)      = exp(-0.01*n)                       // a=0.01 default; NOT normalised to N (200 samples -> ends 0.135)
bharris(n)  = 0.35875 - 0.48829*cos(2*pi*n/(N-1)) + 0.14128*cos(4*pi*n/(N-1)) - 0.01168*cos(6*pi*n/(N-1))
```
  Presets only use hann, hamming, exponential. (`polarInter`, `blackman-harris` exist but nothing needs
  `polarInter`.) No temporal smoothing is done in the renderer (only the analyser's built-in one, section B).

### A.3 coord = ['rect'] | ['polar', radius=100, rotationDeg=0, autoRotate=0]
```
rect:   for i in 0..N-1:  x = i/N * W;   y = H/2 + data[i]        // y down: positive data => LOWER on screen
polar:  p = makePeriodic(data)                                    // always, not optional
        rot = rotationDeg*pi/180 + frame*autoRotate/100           // radians; autoRotate=100 => 1 rad/frame
        for i: r = p[i] + radius
               a = -(i*2*pi)/N                                    // clockwise-from-+x as drawn in y-down? it is
               pts[i] = [ r*cos(a+rot) + W/2,  r*sin(a+rot) + H/2 ]   // negative angle step
makePeriodic(d): diff = d[N-1]-d[0]; out[i] = d[i] - diff*i/(N-1)  // linear de-trend so first==last (closes the seam)
```
For 'rect' the radius/rotation args are ignored (e.g. `['rect',100]` in Mixed7).
Polar line = closed path through pts (closePath), so the last point connects back to the first.

### A.4 viz
```
['line', samples=1024]:  step = ceil(N/samples); beginPath; moveTo(pts[0]); for i=step.. by step: lineTo(pts[i])
['dots', samples=100]:   step = ceil(N/samples); for i=0 by step: ctx.roundRect(pts[i].x, pts[i].y, 1,1,1000)
['bars', numBars=20]:    step = ceil(N/numBars); mode & innerRadius come from the COORD tuple (coord[0], coord[1]); innerRadius default 100
   rect :  off = W/numBars/2
           for i=0 by step: [x,y]=pts[i]; moveTo(x+off, H); lineTo(x+off, y)       // bar rises from the canvas bottom to the data y
   polar:  c=(W/2,H/2)
           for i=0 by step: a = -(i*2*pi)/N                      // NOTE: rotation/autoRotate NOT applied to bars
                            p0 = c + innerRadius*(cos a, sin a)
                            dist = |pts[i]-c|                    // = |radius + periodicData[i]| (rotation-invariant)
                            mag  = |dist - innerRadius| + innerRadius   // grows outward only (mirror of negative excursions)
                            p1 = c + mag*(cos a, sin a);  moveTo(p0); lineTo(p1)
   (bars use a different `numBars` meaning than `samples`: step = ceil(N/numBars), so actual bar count can be < numBars)
['particles', velocity=[1,1], gravity=1, lifespan=Infinity, birthrate=1, samples=100]   // see A.5
```
Note rect-bar baseline: with time domain, silence leaves bars at about H/2 height (y = H/2 + ~0), not at 0.
With `freq` and amplitude -200 silence puts the bar top at y = H/2 + 100.

### A.5 particles (system is shared, stateful)
One `particleSystem` array lives on the Visualizer and is SHARED by every particle layer (and persists
across frames). Each particle layer call does, in order:
```
if frame % birthrate == 0:
    step = round(N/samples)                       // BUG: 0 when samples > 2N => infinite loop/freeze; clamp to >=1
    for i=0; i<N; i+=step: push Particle(pos = pts[i] (already rect/polar coords), born=frame)
Particle: vel = [(rand()-0.5)*velocity[0], (rand()-0.5)*velocity[1]]   // symmetric random in +-v/2, constant sign decided at birth
          update(): vel.y += gravity; pos += vel;  if pos.x<0||pos.x>W||pos.y<0||pos.y>H: live=false
for each particle e in the whole system:          // (iterating while splicing => skips every other dead element; harmless)
    if frame - e.born > lifespan: e.live=false
    if e.live: e.update() else: splice(e)         // dead ones are removed
    ctx.roundRect(e.pos.x, e.pos.y, 1,1,1000)     // drawn into THIS layer's path, with THIS layer's colour & lineWidth
```
Consequences to decide when porting: (1) with two particle layers (Mixed8) every particle is updated and
drawn twice per frame (2x speed, 2x gravity, half lifespan) and takes whichever layer's colour; (2) spawn
positions are a snapshot of the waveform at birth - particles never follow the audio afterwards; (3) gravity
is px/frame^2 added each frame, frame-rate dependent; (4) non-particle layers never draw particles.
Faithful port: keep a per-visualizer pool; a clean port: per-layer pool, dt-scaled. Preset gravity values
range -0.02..1.

### A.6 colour = tuple (all set `strokeStyle`; fill uses its own tuple)
```
[cssColor]                                  -> strokeStyle = cssColor   (any canvas colour string; '#rrggbbaa' ok)
['linearGradient', c1='#E34AB0', c2='#5BC4F9', flip='']
     flip!='flip': createLinearGradient(0, H/2, W, H/2)   // left->right across WHOLE canvas
     flip=='flip': createLinearGradient(W/2, 0, W/2, H)   // top->bottom ("flip" = vertical axis)
     stops: 0->c1, 1->c2
['radialGradient', c1, c2, inner=0, outer=250]
     createRadialGradient(W/2,H/2,inner, W/2,H/2,outer); stops 0->c1, 1->c2   // centred on canvas, pixel radii
['randomColor']        -> `rgb(${rand*255},${rand*255},${rand*255})`  // new float colour EVERY FRAME per layer (flicker)
['randomPalette', arr = ['#57BBDE','#9DDE57','#CC57DE','#DE9C57']]
                        -> arr[ round(rand*arr.length) ]   // BUG: can index arr.length => undefined (see D)
```
Gradients span the whole canvas (not the shape's bounds), so a gradient bar/line shows the colour for its
screen position. There is no per-item colour: one colour/gradient per layer per frame.
Colour parsing helper (Wave4/Wave7 only): accepts `rgb()/rgba()`, `hsl()`, `#rrggbb` (hex `substring(1,3)...`),
else a CSS-name lookup (full 147-name table in `colorUtils.ts`; 3-digit hex unsupported).
`rgbToHsl` returns `[round(h*360), round(s*100), round(l*100)]` with the standard formula (s is `undefined`
for greys => NaN). Port: use any robust colour parser.

### A.7 stroke / fill
```
stroke = [width=2, style]    // style 'dashes' => ctx.setLineDash([10,10]) (never reset, see D)
fill   = ['solid', colourString]          // ONLY working form. Used by Mixed11 ('#a3daec60')
      rect  branch: lineTo(W,H); lineTo(0,H); closePath(); then FALLS THROUGH (missing break) into polar branch
      polar branch: solid -> fillStyle = colour; then ctx.fill()
      'gradient' type -> rect: linearGradient(c[0],c[1],flip); polar: radialGradient(c[0],c[1]);  (but see D: type
      names never match what IOptions documents, 'linearGradient'; nothing in the presets uses it)
```
Fill is executed before closePath/stroke, on the same path as the stroke (the canvas closes the subpath for fill).
No flip/mirror transforms exist (`mirror()` is an empty stub). "Flip" is only the vertical-gradient flag above.

### A.8 loop / lifecycle
`render` = clear, draw, frame++, `requestAnimationFrame(render)` (no timestamps, runs at display rate;
all motion is per-frame). Presets start on audio `play`, stop on `pause`. `stop()` = `cancelAnimationFrame(lastId)`.
Convenience: `simpleLine(c)` = `{color:[c]}`; `simpleBars(c)` = `{domain:['time',300], viz:['bars'], color:[c], stroke:[30]}`;
`simplePolarLine(c)` = `{coord:['polar'], color:[c]}`; `simplePolarBars(c)` = `{domain:['time',200], coord:['polar'], viz:['bars',25], color:[c], stroke:[20]}`.

---------------------------------------------------------------------------------------------------
## B. Data contract

- `AudioContext.createAnalyser()`, `fftSize = 2048` (hard-coded), `frequencyBinCount = 1024`.
  `smoothingTimeConstant`, `minDecibels`, `maxDecibels` are NEVER set => browser defaults: smoothing 0.8,
  min -100 dB, max -30 dB. A port should set those explicitly if it wants identical visuals.
- Freq: `getByteFrequencyData(Uint8Array(1024))`, 0..255, bin k = k * sampleRate / 2048 (about 21.5-23.4 Hz/bin).
- Time: `getByteTimeDomainData(Uint8Array(1024))`, 0..255, 128 = zero. The array is half of fftSize so only
  1024 samples (about 21-23 ms) are read; presets slice a further `range` (<=750) of those.
- Both are re-read on every layer (each layer calls the analyser again; layers in the same frame can see
  slightly different data). Cheaper port: read once per frame, share between layers.
- Preprocess converts to `number[]` each layer: `(v/255 - 0.5) * amplitude`, slice to `range`.
- Our port: feed `Uint8Array` 0..255 freq (length >= max range used, 1024 recommended) and 128-centred time
  data; if our sensor/audio source yields normalised floats, map to the same byte scale first.
- `AudioAnalyzer` also exposes `bufferLength` (=1024); `Input` wires `<audio>`/`<video>` element, MediaStream
  (microphone/screen audio) or URL into the analyser (element source also `connect(destination)`).

---------------------------------------------------------------------------------------------------
## C. The 29 presets

Common to every preset: React wrapper; `options` is a positional prop array (the "props" column);
`Object.assign(defaults, userOptions)`. Layers are drawn in array order (later on top). Unspecified
keys = render DEFAULTS (domain `['time']`=amp 100/range 1024, `rect`, `line`, `#E34AB0`, stroke 2).
"props" = which user options replace what. Colour tuples listed in full; `-` in a tuple = hole (default).

Legend: D=domain[kind,amp,range,window], C=coord[mode,radius,rotDeg,autoRot], V=viz, K=colour, S=stroke.

### Bars
| # | description | props -> effect | layers (defaults) |
|---|---|---|---|
| Bar1 | Simple vertical bars visualizer | [color, numBars] -> K=[color], V=['bars',n] | 1: D ['time'], C rect, V ['bars',10], K ['#E34AB0'], S [25] |
| Bar2 | Centered, wave-like bars using a Hann window | [color, numBars] -> K=[color], V=['bars',n] | 1: D ['time',750,-,'hann'], C ['rect'], V ['bars',40], K ['#E93EB7'], S [2] (stroke default 2 => thin bars; no stroke key) |
| Bar3 | Bars with a linear gradient and "flip" effect | [color1,color2] -> K=['linearGradient',c1,c2,'flip']; (when props given also forces D ['freq',-200,100], V ['bars',12], S [30,'dashes']) | 1: D ['freq',-200,100], V ['bars',10], K ['linearGradient','#0088ffff','#00ffd5ff','flip'], S [30,'dashes'] |
| Bar4 | Bars arranged in a polar (circular) layout with a linear gradient | [color1,color2,radius] -> C=['polar',radius], K=['linearGradient',c1,c2] | 1: D ['time',250], C ['polar'] (radius default 100), V ['bars',50], K ['linearGradient','#E93EB7','#24B9F7'], S [2] (default) |
| Bar5 | Bars with a customizable linear gradient and bar count | [color1,color2,numBars] -> K=['linearGradient',c1,c2], V=['bars',n] | 1: D ['time',500,-,'hamming'], C ['rect'], V ['bars',15], K ['linearGradient','#E93EB7','#24B9F7'], S [25] |
| Bar6 | Frequency-domain bars using FFT on first 300 samples | [color,numBars] -> V=['bars',n]; K=options[0] (passes a bare string - BUG, see D: only the first character reaches the tuple, so colour override does not work) | 1: D ['freq',-200,300], C ['rect'], V ['bars',11], K ['#E93EB7'], S [25] |

### Waves
| # | description | props | layers |
|---|---|---|---|
| Wave1 | Simple waveform line, customizable color and sample count | [color, range] -> K=[color], D=['time',range] | 1: (nothing) = D ['time'], rect, line, K ['#E34AB0'], S [2] |
| Wave2 | Waveform line hanned with a linear gradient | [color1,color2] -> K=['linearGradient',c1,c2] | 1: D ['time',200,-,'hann'], C ['rect'], K ['linearGradient','#E93EB7','#24B9F7'], S [2] |
| Wave3 | Three overlapping waveform lines, each with its own color | [c1,c2,c3] -> K=[ci] per layer | L0: D ['time',400], rect, ['line'], K ['#2F4FC4'], S [3]; L1: D ['time',300], K ['#DED414'], S [2]; L2: D ['time',200], K ['#DE3914'], S [1] |
| Wave4 | Multi-layered waveform lines with dynamic color gradients | [baseColor string] -> layer colours derived (below) | 8 rect line layers, D ['time',R] with R = 450,400,350,300,250,200,150,100; S default 2; K default hex: '#eb1b00ff','#eb4300ff','#ff6715ff','#ff9320ff','#ffb836ff','#ffca68ff','#ffdd9dff','#ffeeceff' (fire ramp) |
| Wave5 | Polar hanned wave that defaults to look like fire | [color1,color2,radius,angleDeg] -> C=['polar',radius,angle], K=['linearGradient',c1,c2] (omitting radius/angle falls back to 100/0, not 100/90) | 1: D ['time',150,-,'hann'], C ['polar',-,90] (r=100, rot=90deg), K ['linearGradient','red','orange'], S [2] |
| Wave6 | Polar wave amped up with exp window to look like lightning | [color1,color2,radius] -> C=['polar',radius,-,100], K=['linearGradient',c1,c2] | 1: D ['time',250,-,'exponential'], C ['polar',-,-,100] (r=100, autoRot=100 => spins 1 rad/frame, appears as flicker), K ['linearGradient','white','#00BFFF'], S [2] |
| Wave7 | Multi-layered polar waveform with dynamic color shifting | [baseColor string] -> same derived-colour rule as Wave4 | 8 layers, each C ['polar',100], D ['time',R] with R = 400,350,300,250,200,150,100,50; same hex ramp as Wave4; S default 2 |

Derived colour rule (Wave4, Wave7), only when `options` is a string:
```
[h,s,l] = toHsl(baseColor)                       // see A.6
for i in 0..7: layer[i].color = `hsl(${h + i*10}, ${s / ((i+1)/2)}%, ${l}%)`
//  i=0 -> s*2 (>100%, clamped by canvas), i=1 -> s, i=2 -> 2s/3, ... i=7 -> s/4 ; hue steps +10deg per layer
```
(Wave7's own `userOptions` block is commented out; only this loop exists.)

### Dots
| # | description | props | layers |
|---|---|---|---|
| Dots1 | Simple dots visualizer, customizable color and dot count | [color,count] -> V ['dots',count], K [color], S [6] | 1: D ['time',200], V ['dots',32], K ['#ff00ff'], S [4] (canvas 600x350 black, r=8px) |
| Dots2 | Dots with a linear gradient | [color1,color2] -> K ['linearGradient',c1,c2] on all 5 layers | 5 layers, all C ['rect'], V ['dots'] (100 samples), S [2], K ['linearGradient'] (default colours #E34AB0 -> #5BC4F9); D: ['time'] (amp100,range1024), ['time',200], ['time',300], ['time',400], ['time',500] |
| Dots3 | Dots with a radial gradient | [color1,color2] -> BUG: written as `['radialGradient',-,-,50,120,c1,c2]` so c1,c2 land in unused slots 5,6: user colours have no effect | 5 layers, all C ['polar',70], V ['dots',200], S [2], K ['radialGradient',-,-,50,120] (default colours #E34AB0 -> #5BC4F9, inner 50 outer 120); D ['time',R] R=100,120,140,160,180 |
| Dots4 | Multi-layered dots with radial gradients | same BUG as Dots3 (colours inert) | 5 layers, K ['radialGradient',-,-,50,120] all; L0: D ['time',100], C ['polar',70], V ['line'], S [1]; L1: D ['time',120], C ['rect',70], V ['dots',200], S [2]; L2..L4: C ['polar',70], V ['dots',200], S [2], D ['time',140|160|180] |

### Particles
| # | description | props | layers |
|---|---|---|---|
| Particles1 | Particle burst visualizer with radial gradient coloring | [color1,color2] -> D ['time',300], C ['polar'], V ['particles',[2,2],0,15,3], K ['radialGradient',c1,c2], S [5] (so with props: stroke 5, inner/outer reset to 0/250) | 1: D ['time',300], C ['polar'] (r=100), V ['particles',[2,2],0,15,3] (velocity +-1px, gravity 0, life 15 frames, spawn every 3rd frame, samples default 100 => step round(300/100)=3 => 100 spawns/burst), K ['radialGradient',-,-,100,150], S [10] |

### Mixed
Note presets whose header says "polar" but have no `coord` key are RECT (Mixed8, Mixed9 text is misleading).
| # | description | props | layers (defaults) |
|---|---|---|---|
| Mixed1 | Combination of polar bars and particles, customizable color and bar count | [color,bars] -> NO EFFECT (Object.assign onto the array, BUG D) | L0: D ['time',200], C ['polar',120], V ['bars',200], K ['randomPalette',['#00BFFF','#40E0D0','#5AC8FA','#0096FF']], S [2,'dashes']; L1: D ['time',100], C ['polar'], V ['particles',[1,1],0,25,5,50], K ['randomPalette',['#00BCD4','#3F51B5','#8E24AA','#E91E63']], S [2] |
| Mixed2 | Bars with a random color palette and a secondary color for particles | [palette[], color] -> L0 K ['randomPalette',palette]; L1 K [color] | L0: D ['time',500], C rect, V ['bars',10], K ['randomPalette',['#E91E63','#9C27B0','#673AB7','#3F51B5','#00BCD4']], S [25,'dashes']; L1: D ['time',500], rect, V ['particles',[1,1],0.1,40,5,50], K ['#00bcd4'], S [3] |
| Mixed3 | Multi-layered polar bars and lines with radial gradients | [c1,c2] -> userOptions re-states all 4 layers fully with K ['radialGradient',c1,c2] (so inner/outer reset to 0/250) | L0: D ['time',200], C ['polar'], V ['bars',33], K ['radialGradient','#0088ffff','#00ffd5ff'], S [10]; L1: D ['time',50], C ['polar',150], line, same K, S [2]; L2: D ['time',30], C ['polar',50], line, same K, S [2]; L3: D ['time',30,50], C ['polar',10], line, K ['radialGradient','#00e5ffff','#00ffd5ff'], S [30] (note domain range 50 with amp 30, i.e. D=['time',30,50]) |
| Mixed4 | Multi-layered polar bars, lines, and particles with gradients | [c1,c2] -> every layer K becomes ['linearGradient',c1,c2] (changes gradient KIND from radial to linear) | L0: D ['time',400], C ['polar',100], V ['bars',64], K ['radialGradient','#70044aff','#f84791ff',100,120], S [6]; L1: D ['time',300], C ['polar',100], line, K ['radialGradient','#003bdcff','#1893B8',100,150], S [4]; L2: D ['time',250], C ['polar',0,0,0.1] (radius 0 => centre-origin, slow spin autoRot 0.1 rad/100 frames), V ['particles',[3,3],0,35,5,50], K ['radialGradient','#002f41ff','#02bff8ff',10,50], S [1] |
| Mixed5 | Combination of polar bars, dots, and particles with random palettes | [color,bars] -> NO EFFECT (array bug) | L0: D ['time',400], C ['polar',90], V ['bars',30], K ['randomPalette',['#57BBDE','#9DDE57','#CC57DE','#DE9C57','#FDB813']], S [10]; L1: D ['time',300], C ['rect'], V ['dots',300], same palette, S [3]; L2: D ['freq',400], C ['polar',140], V ['particles',[1,1],0.2,200,6,80], K ['randomPalette',['#ffffff','#ff00cc','#00ffff','#f5f5f5','#99ccff']], S [0.7] (freq domain, amp 400, range 1024) |
| Mixed6 | Polar particles and lines with a linear gradient | [c1,c2] -> both layers K ['linearGradient',c1,c2,'flip'] | L0 & L1 D ['time',300,100,'hann'], C ['polar',100,90]; L0: V ['particles',[0.5,0.5],-0.01,-,5,20] (lifespan Infinity, gravity -0.01 => drifts up), K ['linearGradient','yellow','red','flip'], S [4]; L1: V ['line'], same K, S [5] |
| Mixed7 | Particles and lines with a linear gradient and "flip" effect | [c1,c2] -> L0 K ['linearGradient',c1,c2,'flip']; L1 K [c1] | L0: D ['time',300,100], C ['rect',100], V ['particles',[1,3],0.1,-,6,40], K ['linearGradient','white','teal','flip'], S [2]; L1: D ['time',300,100], C ['rect',100], line, K ['snow'], S [3] |
| Mixed8 | Multi-layered lines and particles with linear gradients | [c1,c2] -> K ['linearGradient',c1,c2] for all 5 layers | all rect, no coord/viz key => rect/line unless set. L0: D ['time',500], K ['linearGradient','#00FFFF','#8A2BE2'], S [5]; L1: D ['time',400], K [...,'#20B2AA','#8A2BE2'], S [4]; L2: D ['time',300], K [...,'#7FFFD4','#6A5ACD'], S [3]; L3: D ['time',400], V ['particles',[1,1],0.02,30,5,40], K [...,'#7FFFD4','#00FFFF'], S [2]; L4: same but gravity -0.02, K ['linearGradient','#7FFFD4'] (c2 default #5BC4F9), S [2] (L3/L4 share the particle pool: see A.5) |
| Mixed9 | Multi-layered polar lines and dots, customizable color | [color] -> L0 K [color], D ['time',300,512]; L1 D ['time',600], K ['ghostwhite'] (drops range 200, amp 600!) | L0: D ['time',300,512], rect line, K ['#7afff2ff'], S [2]; L1: D ['time',100,200], V ['dots',80], K ['#e5fffbff'], S [2]. (Despite the text, rect.) |
| Mixed10 | Multi-layered polar lines and particles with radial gradients | [c1,c2] -> K ['radialGradient',c1,c2] for all 4 layers (inner/outer reset 0/250) | L0: D ['time',250], C ['polar',90], line, K ['radialGradient','#315f00ff','#adffc1ff',90,120], S [3]; L1: D ['time',350], C ['polar',100], line, K [..,'#76003fff','#ef62ffff',120,150], S [2]; L2: D ['time',450], C ['polar',100], line, K [..,'#009dffff','#0f0062ff'] (0/250), S [2]; L3: D ['time',250], C ['polar',120], V ['particles',-,-,-,2,50] = velocity [1,1], gravity 1 (!), lifespan Infinity, birthrate 2, samples 50, K ['radialGradient','#E322A6','#139133'], S [2] |
| Mixed11 | Polar lines and dots, customizable color | [color string] -> L0 D ['time',100,512], K [color], C ['polar'], fill ['solid',color]; L1 D ['time',200,300], C ['polar',150], K ['#e5fffbff'], V ['dots',200] | L0: D ['time',100,512] (amp 100, range 512), C ['polar'], line, K ['#7afff2ff'], fill ['solid','#a3daec60'], S [2]; L1: D ['time',200,300], C ['polar',150], V ['dots',200], K ['#e5fffbff'], S [2] |

Per-preset "prop" summary for the config UI: Bars: colour(s), count, radius(Bar4). Waves: colour(s),
sample range(Wave1), radius(Wave4? no: Wave5, Wave6), angle(Wave5), base colour (Wave4/7). Dots: colour(s),
count(Dots1). Particles1: 2 colours. Mixed: colour(s) (palette array for Mixed2), bar count (Mixed1/5 - inert).

Canvas sizes: all 500x300 except Dots1-4 600x350 (black bg, 8px radius).

---------------------------------------------------------------------------------------------------
## D. Known bugs / traps to NOT reproduce (file refs relative to repo `src/`)

1. Orphan rAF loop - `visualizers/visualizer.ts` `render()`/`stop()`: `render` stores only the latest
   `requestAnimationFrame` id and `stop()` cancels only that. Calling `render()` while a loop is already
   running (React effect re-run on `options`/`audioContext`/`srcAudio` change, repeated `play` events, or
   `render` from both a `play` handler and the else-branch of the preset effect) starts a second loop; the
   old id is lost, so `stop()` can never cancel it. Also `frame`/`particleSystem` are shared by both loops
   (double speed). Fix: `cancelAnimationFrame(this.id)` at start of `start()`, guard with a `running` flag.
   Presets' effect also does not stop the loop for non-`<audio>` sources.
2. Missing `break` in `fill()` (`visualizer.ts` `fill`): `case 'rect'` falls through into `case 'polar'`.
   Rect fills get their fill style overwritten by the polar branch (solid is idempotent; the 'gradient'
   fill type becomes a radial gradient). Also `fill[0]` documented as `'linearGradient'` in `types/types.ts`
   but the switch compares `'gradient'` - the documented value never matches. Implement as
   solid | linear | radial properly.
3. `randomPalette` undefined - `visualizer.ts` `randomPalette`: `Math.round(Math.random()*len)` can equal
   `len` (probability 0.5/len, 12.5% for 4 colours); `strokeStyle = undefined` is ignored by canvas so the
   previous layer's/frame's style persists. Use `floor`. Also colour is re-rolled every frame per layer
   (rapid strobe); pick per item or smooth over time. `randomColor` likewise.
4. No DPR scaling: canvas width/height are used as both backing size and CSS size, all dimensions are raw
   pixels, so output is blurry/unscaled on HiDPI. Scale `canvas.width = cssW*dpr`, `ctx.setTransform(dpr,...)`
   and scale amplitude/radius/lineWidth/dash by the same factor or by canvas size.
5. Dash state leak - `visualizer.ts` `stroke()`: `setLineDash([10,10])` is set for 'dashes' but never reset,
   so later layers (and the next frame's first layer) stay dashed. `ctx.setLineDash([])` per layer. Dashes
   apply only to bar strokes visually (bars are lines of length > 10).
6. Particles: shared pool across layers (A.5); `step=round(N/samples)` may be 0 (infinite loop);
   splice-while-iterating; frame-rate-dependent physics; particle drawn the frame it is culled.
7. `Object.assign(defaults /*array*/, userOptions /*object*/)` in Mixed1 and Mixed5 writes `color`/`viz` props
   on the array object, not on any layer - those presets ignore their props. Intended: apply to layer 0
   (and probably 0..n). `Object.assign(defaultsLayer, ...)` elsewhere mutates the defaults; harmless.
8. Props mis-wired: Bar6 passes `color: options[0]` (string) so `color[0]` = first character; Dots3/Dots4 put
   user colours at tuple slots 5/6 (unused); Wave5 user `coord` drops the 90 degree rotation default;
   Mixed9 user override changes layer-1 domain; Mixed4 swaps radial for linear on override; Mixed3 and
   Mixed10 reset gradient inner/outer to 0/250 on override. Bar2/Wave2: `stroke` omitted => 2 px bars
   (probably unintended but it is how it renders).
9. `makePeriodic` is forced on every polar layer, including bars/dots/particles (bars see the de-trended
   data). Polar bars ignore rotation/autoRotate (spin affects line/dots/particles only).
10. `dataToPolar` radius can go negative for large negative excursions (radius + e < 0 draws through the
    centre); polar bars take |dist| and mirror it.
11. Analyser settings never set (smoothing 0.8 default); `getByteTimeDomainData` into a half-length array
    (1024 of 2048); both arrays re-read per layer; `Input.connectAudioSource` has `console.log` noise and an
    async race (layer may render before the analyser exists: `dataPreProcessor` crashes on a null array;
    `AudioAnalyzer.freqData/timeData` return an empty `Uint8Array(0)` so output is just empty).
12. `domain` switch has no default for `options.domain` containing an unknown first element beyond time
    (`default` treats it as 'time' with amplitude 100/range 1024 - amplitude/range from the tuple ignored).
    `viz:'polarBars'` is only a comment in Dots1; unknown viz types render as `line`.

---------------------------------------------------------------------------------------------------
## E. Licence

`LICENSE` is the standard MIT licence text, first lines:
```
MIT License

Copyright (c) 2025 Waviz Team
```
Attribution comment to keep in the port (MIT requires the notice + permission text in copies/substantial
portions; include the full MIT text if the file is a substantial derivative):
```
// Portions derived from Waviz (https://github.com/Waviz-Team/Waviz), MIT License, Copyright (c) 2025 Waviz Team.
// Permission is hereby granted, free of charge ... (full MIT text kept in THIRD_PARTY_LICENSES or this header).
```
`README.md` also states "MIT (c) 2025 Waviz Team".

---------------------------------------------------------------------------------------------------
## F. Minimal reimplementation checklist
1. Layer tuple types + shallow-merge DEFAULTS (A.0/A.1).
2. `preprocess(kind, amp, range, window)` (A.2) - window fns exactly as listed.
3. `toRect`, `makePeriodic`, `toPolar` with `rotation = deg*pi/180 + frame*autoRot/100` (A.3).
4. line / bars (rect+polar) / dots / particles (per-layer pool recommended) (A.4-A.5).
5. Colour factory incl. gradient geometry (A.6); one colour per layer; fix `randomPalette` index.
6. fill solid (+ real linear/radial), stroke width, dashes reset per layer (A.7, D).
7. Presets as data: table in C is complete; derive Wave4/7 palette via the HSL rule.
8. Single guarded rAF loop, DPR-aware backing store, analyser fftSize 2048 + explicit smoothing 0.8.
