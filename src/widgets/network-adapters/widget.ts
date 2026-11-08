// Network Adapters: IP address and link speed per adapter. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { networkAdaptersIsland } from "../island/hardware";
import { boolSetting, enumSetting, pass } from "../shared/settings-kit";
import { meta } from "./meta";
import type { NetworkAdaptersProps } from "./NetworkAdapters";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    boolSetting("showDown", "Show adapters that are down", false, { group: "Adapters" }),
    enumSetting("showIpv6", "IPv6 count", "auto", [{ value: "auto", label: "Large sizes" }, { value: "show", label: "Show" }, { value: "hide", label: "Hide" }], { group: "Addresses" }),
    boolSetting("hideIp", "Blur addresses", false, { group: "Addresses", hint: "Privacy: addresses stay blurred" }),
  ],
  island: networkAdaptersIsland,
  render: {
    load: () => import("./NetworkAdapters"),
    toProps: (s: ModuleSettings): Partial<NetworkAdaptersProps> => ({ ...pass<Partial<NetworkAdaptersProps>>("showDown", "hideIp")(s), showIpv6: s.showIpv6 === "show" ? true : s.showIpv6 === "hide" ? false : undefined }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
