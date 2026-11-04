# Fonts bundled with the built-in packs

Every font a built-in pack uses is an SIL Open Font License 1.1 (OFL-1.1) face, subset to Basic Latin plus the degree, middle dot, multiplication, dashes, bullet, minus and the two triangles (`pyftsubset`, woff2, no hinting) and bundled in the pack's `assets/` folder. Packs load them with the `FontFace` API from those files: no stylesheet, no request to a font host (D23). The licence text is at <https://openfontlicense.org/>; each `pack.json` repeats the copyright line per file. The source of each file is the `@fontsource` package of the same family (latin subset), subset again.

| Pack | File | Family | Copyright |
|---|---|---|---|
| field-kit | `barlow-condensed-600.woff2`, `barlow-condensed-700.woff2` | Barlow Condensed | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) |
| tape-86 | `archivo-black-400.woff2` | Archivo Black | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) |
| tape-86 | `space-mono-400.woff2`, `space-mono-700.woff2` | Space Mono | Copyright 2016 The Space Mono Project Authors (https://github.com/googlefonts/spacemono) |
| term | `vt323-400.woff2` | VT323 | Copyright 2011, The VT323 Project Authors (peter.hull@oikoi.com) |
| term | `ibm-plex-mono-400.woff2` | IBM Plex Mono | Copyright 2017 IBM Corp. All rights reserved. |

The OFL allows bundling and subsetting; a subset keeps the licence and the copyright line, and none of these is sold alone. The sample themes' own `font` key (`oswald`, `archivo`, `ibm-plex-mono`) still names a catalog font that loads from Google Fonts (ledger L35).
