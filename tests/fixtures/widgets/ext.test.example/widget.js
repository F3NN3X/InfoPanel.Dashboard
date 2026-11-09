// tests/fixtures/widgets/example/widget.jsx
function widget(sdk) {
  const h = sdk.React.createElement;
  return sdk.defineWidget({
    name: "CPU ring (example)",
    description: "CPU load as a ring: the example code widget.",
    icon: "memory",
    // the CPU's total load: Studio's own reading, or LibreHardwareMonitor's
    reads: ["system.cpu.", "libre."],
    defaultSize: [2, 2],
    settings: [
      { type: "text", key: "label", label: "Label", default: "CPU" },
      { type: "boolean", key: "crash", label: "Throw while drawing (tests)", default: false }
    ],
    render: ({ sensors, settings }) => {
      if (settings.crash) throw new Error("the example was asked to throw");
      const key = "system.cpu.load" in sensors ? "system.cpu.load" : Object.keys(sensors).find((k) => k.startsWith("libre.") && k.endsWith("_cpu_total"));
      const load = key ? sensors[key] : void 0;
      const value = load?.value ?? 0;
      return /* @__PURE__ */ h("div", { "data-example-widget": "", style: { height: "100%", display: "grid", placeItems: "center" } }, /* @__PURE__ */ h(sdk.Ring, { value, max: 100, t: value >= 90 ? "crit" : value >= 75 ? "warn" : "ok" }, /* @__PURE__ */ h(sdk.Num, null, sdk.format(load)), /* @__PURE__ */ h("div", { style: { fontSize: 11, opacity: 0.7 } }, String(settings.label))));
    }
  });
}
export {
  widget as default
};
