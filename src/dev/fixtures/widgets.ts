import type { UserWidget } from "@/components/widgets-page/widgets-model";

/*
 * The Widgets page's two code-widget trust states (`?fixture=widgets/owner-signed`, `?fixture=widgets/user-key`; and
 * `widgets/recipe` for the recipe state with the same cards), as the mockup's screenshots 01-03 show them. Signed code widgets
 * come in Phase 6; until then these entries exist only in dev and `vite build --mode fixtures` builds (the import is behind a
 * static condition, so a release build has neither the data nor the states), for screenshots and review. Nothing loads or runs:
 * an entry is a name, a picture line and the detail pane's lines.
 */

export function widgetFixtures(): UserWidget[] {
  return [
    {
      id: "ext:infopanel.rig-pet",
      name: "Rig Pet",
      kind: "code",
      yours: false,
      issues: [],
      trust: { kind: "owner" },
      blurb: "Reacts to CPU and GPU heat",
      version: "1.2",
      bytes: 86_000,
      fixture: { preview: "Miso · level 7 · comfy at 58 °C", presets: ["Room", "Pet only"], options: [["Pet", "Cat"], ["Heat source", "CPU and GPU"]] },
    },
    {
      id: "ext:mika.fan-curve-live",
      name: "Fan Curve Live",
      kind: "code",
      yours: false,
      issues: [],
      trust: { kind: "user-key", signer: "Mika", trusted: "2 Nov" },
      blurb: "Live fan speed against its curve",
      version: "0.4",
      bytes: 42_000,
      fixture: { preview: "Fan curve · CPU fan 1,298 RPM", presets: ["Curve", "Curve and table"], options: [["Fan", "All fans"], ["Curve source", "FanControl"]] },
    },
  ];
}
