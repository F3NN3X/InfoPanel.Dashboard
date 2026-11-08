// NetworkAdapters's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "NetworkAdapters",
  name: "Network Adapters",
  category: "Network",
  icon: "lan",
  prefixes: ["plugins.network-info-plugin."],
  defaultSize: [2, 2],
  minSize: [1, 1],
  blurb: "IP address and link speed per adapter",
  tags: "ip ethernet wifi",
  description: "Public IP plus each adapter’s status, link speed, IPv4 and IPv6 addresses.",
};
