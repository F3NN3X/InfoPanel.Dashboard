// Skin · instrument — Instrument rack (Widget Sampler): IBM Plex Sans/Mono, condensed Archivo numerals, colour only for state.
// Fonts to load: IBM Plex Sans, IBM Plex Mono, Archivo. Docs: widgets/docs/skins/instrument.md

export const instrumentSkin = {
  name: 'instrument',
  description: "Instrument rack (Widget Sampler): IBM Plex Sans/Mono, condensed Archivo numerals, colour only for state.",
  fonts: ["IBM Plex Sans","IBM Plex Mono","Archivo"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: 'instrument', radius: 10, accent: '#7D95FF', font: "'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif", num: "'Archivo','IBM Plex Sans',sans-serif", numWeight: 700, numStretch: '82%', graph: 'area', meter: 'bar', header: 'instrument', ring: 1.1 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    instrument: { c: 'border', s: { background: '#161A20', borderColor: '#29303A' } },
  },
};
