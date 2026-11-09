import type { UserWidget } from "@/components/widgets-page/widgets-model";

/*
 * The Widgets page's owner-signed code widget (`?fixture=widgets/owner-signed`; `widgets/recipe` for the recipe state with the same
 * cards), as the mockup's screenshot 02 shows it. Phase 6b made the user-key and refused states real (a package signed by a key
 * trusted in Settings, `?fixture=widgets/user-key` and `widgets/refused` select one); the owner's key is not set up yet (docs/
 * security.md), so the owner state can only be shown from this entry. It exists only in dev and `vite build --mode fixtures`
 * builds (the import is behind a static condition, so a release build has neither the data nor the state). Nothing loads or
 * runs: the entry is a name, a picture line and the detail pane's lines.
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
  ];
}
