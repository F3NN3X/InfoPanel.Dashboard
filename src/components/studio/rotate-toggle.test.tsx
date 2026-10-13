import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RotateToggle, rotateTooltip } from "./rotate-toggle";

const noop = () => {};

describe("rotateTooltip", () => {
  it("names the state, and the saved setting when overridden", () => {
    expect(rotateTooltip(true, null, true)).toBe("Rotating on the kiosk");
    expect(rotateTooltip(false, null, true)).toBe("Auto-rotate paused");
    expect(rotateTooltip(true, "on", false)).toBe("Rotating on the kiosk · saved: off");
    expect(rotateTooltip(false, "off", true)).toBe("Auto-rotate paused · saved: on");
  });
});

describe("RotateToggle", () => {
  it("shows Pause while rotating and Play while not", () => {
    const on = renderToString(
      <RotateToggle entry={{ page: "a", rotating: true, override: null }} saved onToggle={noop} onSaved={noop} />
    );
    expect(on).toContain("lucide-pause");
    expect(on).not.toContain("Back to the saved setting");
    const off = renderToString(<RotateToggle entry={undefined} saved={false} onToggle={noop} onSaved={noop} />);
    expect(off).toContain("lucide-play");
  });

  it("offers the saved setting back while an override is set", () => {
    const out = renderToString(
      <RotateToggle entry={{ page: "a", rotating: true, override: "on" }} saved={false} onToggle={noop} onSaved={noop} />
    );
    expect(out).toContain('aria-label="Back to the saved setting"');
    expect(out).toContain("Rotating on the kiosk · saved: off");
  });
});
