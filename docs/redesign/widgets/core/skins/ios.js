// Skin · ios — iOS 18 widget: solid card, bold rounded numerals, Activity-ring thickness.
// Fonts to load: system fonts only. Docs: widgets/docs/skins/ios.md

export const iosSkin = {
  name: 'ios',
  description: "iOS 18 widget: solid card, bold rounded numerals, Activity-ring thickness.",
  fonts: [],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: 'ios', radius: 24, font: "-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif", num: "ui-rounded,'SF Pro Rounded',-apple-system,system-ui,sans-serif", numWeight: 700, graph: 'area', meter: 'pill', header: 'ios', ring: 1.7 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    ios: { c: '', s: { background: '#1c1c1e', boxShadow: '0 1px 0 rgba(255,255,255,.04) inset, 0 18px 40px -18px rgba(0,0,0,.8)' } },
  },
};
