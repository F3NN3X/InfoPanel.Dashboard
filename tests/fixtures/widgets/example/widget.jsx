// The example code widget (Phase 6b; docs/code-widgets.md): CPU load as a ring, in the theme's look. Built by ./build.mjs into
// ../ext.test.example/widget.js and signed with a TEST-ONLY key. A bundle carries no React: the app hands it its own (`sdk.React`),
// so JSX is compiled to `h`, taken from the SDK.

/** @param {import("infopanel-studio/widget-sdk").WidgetSdk} sdk */
export default function widget(sdk) {
  // biome-ignore lint/correctness/noUnusedVariables: the JSX factory esbuild compiles to (build.mjs `jsxFactory`)
  const h = sdk.React.createElement;
  return sdk.defineWidget({
    name: "CPU ring (example)",
    description: "CPU load as a ring: the example code widget.",
    icon: "memory",
    reads: ["system.cpu."],
    defaultSize: [2, 2],
    settings: [
      { type: "text", key: "label", label: "Label", default: "CPU" },
      { type: "boolean", key: "crash", label: "Throw while drawing (tests)", default: false },
    ],
    render: ({ sensors, settings }) => {
      if (settings.crash) throw new Error("the example was asked to throw");
      const load = sensors["system.cpu.load"];
      const value = load?.value ?? 0;
      return (
        <div data-example-widget="" style={{ height: "100%", display: "grid", placeItems: "center" }}>
          <sdk.Ring value={value} max={100} t={value >= 90 ? "crit" : value >= 75 ? "warn" : "ok"}>
            <sdk.Num>{sdk.format(load)}</sdk.Num>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{String(settings.label)}</div>
          </sdk.Ring>
        </div>
      );
    },
  });
}
