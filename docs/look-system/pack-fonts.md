# Fonts bundled with the built-in packs

Every font a built-in pack uses is an SIL Open Font License 1.1 (OFL-1.1) face, subset to Basic Latin plus the degree, middle dot, multiplication, dashes, bullet, minus and the two triangles (`pyftsubset`, woff2, no hinting) and bundled in the pack's `assets/` folder. Packs load them with the `FontFace` API from those files: no stylesheet, no request to a font host (D23). The licence text ships with the fonts: `OFL.txt` in each pack's folder (beside `assets/`, with the copyright lines and what was modified) and `public/licences/pack-fonts-OFL.txt` in the build; each `pack.json` repeats the copyright line per file. `packs.test.ts` pins both. The source of each file is the `@fontsource` package of the same family (latin subset), subset again.

| Pack | File | Family | Copyright |
|---|---|---|---|
| field-kit | `barlow-condensed-600.woff2`, `barlow-condensed-700.woff2` | Barlow Condensed | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) |
| tape-86 | `archivo-black-400.woff2` | Archivo Black | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) |
| tape-86 | `space-mono-400.woff2`, `space-mono-700.woff2` | Space Mono | Copyright 2016 The Space Mono Project Authors (https://github.com/googlefonts/spacemono) |
| term | `vt323-400.woff2` | VT323 | Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com) |
| term | `pack-term-mono-400.woff2` | IBM Plex Mono (renamed, see below) | Copyright 2017 IBM Corp. All rights reserved. |
| swiss-mono | `inter-tight-300.woff2`, `inter-tight-500.woff2` | Inter Tight | Copyright 2022 The Inter Project Authors (https://github.com/rsms/inter-tight) |
| neon-stripe | `pack-neon-mono-400.woff2` | Share Tech Mono (renamed, see below) | Copyright (c) 2012, Carrois Type Design, Ralph du Carrois (post@carrois.com www.carrois.com), with Reserved Font Name 'Share' |
| neon-stripe | `chakra-petch-500.woff2` | Chakra Petch | Copyright 2018 The Chakra Petch Project Authors (https://github.com/m4rc1e/Chakra-Petch.git) |
| overdrive | `rajdhani-600.woff2` | Rajdhani | Copyright (c) 2014 Indian Type Foundry (info@indiantypefoundry.com) |
| overdrive | `pack-overdrive-mono-400.woff2` | Share Tech Mono (renamed, see below) | Copyright (c) 2012, Carrois Type Design, Ralph du Carrois (post@carrois.com www.carrois.com), with Reserved Font Name 'Share' |
| holo | `exo-2-500.woff2` | Exo 2 | Copyright 2013 The Exo 2 Project Authors (https://github.com/googlefonts/Exo-2.0) |
| holo | `pack-holo-display-500.woff2` | Orbitron (renamed, see below) | Copyright 2018 The Orbitron Project Authors (https://github.com/theleagueof/orbitron), with Reserved Font Name: "Orbitron". |

The OFL allows bundling and subsetting; a subset keeps the licence and the copyright line, and none of these is sold alone. Reserved Font Name: IBM Plex Mono declares "Plex". A subset is a Modified Version, so it may not carry that name: the file is `pack-term-mono-400.woff2` and its name table reads `Pack Term Mono` (family, full and PostScript names; the copyright line is kept). The other four families declare none. Space Mono's vertical metrics are also changed (ascent 0.97 em, descent 0.25 em, 1.22 em in all, from 1.48) so its text boxes do not overlap the line above; that is a modification the licence allows and the OFL text records.

The sample themes of these three packs set `font` to a system stack (`sans`, `sans`, `mono`); the pack's CSS sets its face on every descendant, so wearing a pack asks no font host for anything (`pack-visibility.spec.ts` logs the requests; the page's own Geist is the app's default and is not the pack's). The other sample themes still name catalog fonts that load from Google Fonts (L35, P11).

P11a adds four packs. Two more families declare a Reserved Font Name, so their subsets are Modified Versions with the name table (family, full, PostScript and unique names; the copyright line is kept) renamed and no reserved word in the file name: Share Tech Mono ("Share") becomes `Pack Neon Mono` in neon-stripe and `Pack Overdrive Mono` in overdrive, and Orbitron ("Orbitron") becomes `Pack Holo Display` (checked with fontTools). Inter Tight, Chakra Petch, Rajdhani and Exo 2 declare none. `packs.test.ts` now refuses a family or file name with "plex", "share" or "orbitron". Each pack folder has its `OFL.txt` and the build's `public/licences/pack-fonts-OFL.txt` has all seven sections.

The four packs register each single-weight face over the whole weight range (`pack.json` weight `100 900`): a widget asks for 600 or 700 for its numerals, and a face registered at 400 only would be faux-bolded by the browser, which smears a light display face (Swiss Mono's light numerals, Chakra Petch) and clogs a mono one. The sample themes of the four set `font: "auto"`: a named stack would be written inline on every numeral and beat the pack's `font-family`.
