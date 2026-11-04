# Fonts bundled with the built-in packs

Every font a built-in pack uses is an SIL Open Font License 1.1 (OFL-1.1) face, subset to Basic Latin plus the degree, middle dot, multiplication, dashes, bullet, minus and the two triangles (`pyftsubset`, woff2, no hinting) and bundled in the pack's `assets/` folder. Packs load them with the `FontFace` API from those files: no stylesheet, no request to a font host (D23). The licence text ships with the fonts: `OFL.txt` in each pack's folder (beside `assets/`, with the copyright lines and what was modified) and `public/licences/pack-fonts-OFL.txt` in the build; each `pack.json` repeats the copyright line per file. `packs.test.ts` pins both. The source of each file is the `@fontsource` package of the same family (latin subset), subset again.

| Pack | File | Family | Copyright |
|---|---|---|---|
| field-kit | `barlow-condensed-600.woff2`, `barlow-condensed-700.woff2` | Barlow Condensed | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) |
| tape-86 | `archivo-black-400.woff2` | Archivo Black | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) |
| tape-86 | `space-mono-400.woff2`, `space-mono-700.woff2` | Space Mono | Copyright 2016 The Space Mono Project Authors (https://github.com/googlefonts/spacemono) |
| term | `vt323-400.woff2` | VT323 | Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com) |
| term | `pack-term-mono-400.woff2` | IBM Plex Mono (renamed, see below) | Copyright 2017 IBM Corp. All rights reserved. |

The OFL allows bundling and subsetting; a subset keeps the licence and the copyright line, and none of these is sold alone. Reserved Font Name: IBM Plex Mono declares "Plex". A subset is a Modified Version, so it may not carry that name: the file is `pack-term-mono-400.woff2` and its name table reads `Pack Term Mono` (family, full and PostScript names; the copyright line is kept). The other four families declare none. Space Mono's vertical metrics are also changed (ascent 0.97 em, descent 0.25 em, 1.22 em in all, from 1.48) so its text boxes do not overlap the line above; that is a modification the licence allows and the OFL text records.

The sample themes of these three packs set `font` to a system stack (`sans`, `sans`, `mono`); the pack's CSS sets its face on every descendant, so wearing a pack asks no font host for anything (`pack-visibility.spec.ts` logs the requests; the page's own Geist is the app's default and is not the pack's). The other sample themes still name catalog fonts that load from Google Fonts (L35, P11).
