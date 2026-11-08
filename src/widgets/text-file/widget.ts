// Text File: a watched text file, live. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { TextFileProps } from "./TextFile";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [boolSetting("showMeta", "Size / lines / status header", true, { group: "Details" })],
  render: {
    load: () => import("./TextFile"),
    toProps: (s: ModuleSettings): Partial<TextFileProps> => ({ showMeta: boolOf(s.showMeta) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
