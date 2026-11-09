// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CodeWidget, { type CodeWidgetHostProps } from "@/widgets/code/CodeWidget";
import { resetCode, setImportBundle } from "@/widgets/code/loader";

// A code widget draws inside the standard card, and one that throws while it draws is contained: its own zone says "Widget not
// available" with the error, and everything beside it goes on drawing (Phase 6b).

const manifest = readFileSync("tests/fixtures/widgets/ext.test.example/manifest.json", "utf8");
const list = JSON.stringify([{ id: "ext:test.example", kind: "code", name: "CPU ring (example)", version: "1.0.0", trust: "user:Test" }]);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetCode();
});

// the readings, without the sensor stream
vi.mock("@/hooks/useSensors", () => ({ useSensors: () => ({ "system.cpu.load": { value: 42, unit: "%" } }) }));

/** A placement of the widget. */
const Placed = (p: CodeWidgetHostProps) => <CodeWidget {...p} />;

function serve() {
  vi.stubGlobal("fetch", async (url: string) =>
    url === "/api/widgets" ? new Response(list) : url.endsWith("/manifest.json") ? new Response(manifest) : new Response(null, { status: 404 })
  );
  setImportBundle(() => import("../../fixtures/widgets/ext.test.example/widget.js"));
}

describe("a code widget on a screen", () => {
  it("draws its definition in the standard card", async () => {
    serve();
    const { container } = render(<Placed code="ext:test.example" saved={{ label: "Load" }} />);
    await waitFor(() => expect(container.querySelector("[data-example-widget]")).not.toBeNull());
    expect(container.textContent).toContain("Load");
    expect(container.textContent).toContain("42 %");
  });

  it("contains a widget that throws: its zone says why, the zone beside it still draws", async () => {
    serve();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <div>
        <Placed code="ext:test.example" saved={{ crash: true }} />
        <p data-neighbour="">still here</p>
      </div>
    );
    await waitFor(() => expect(container.textContent).toContain("Widget not available"));
    expect(container.textContent).toContain("It stopped with an error: the example was asked to throw");
    expect(container.querySelector("[data-neighbour]")?.textContent).toBe("still here");
  });

  it("draws the not-available card with the reason for a refused widget, and imports nothing", async () => {
    const imported = vi.fn();
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify([{ id: "ext:test.example", kind: "code", name: "x", version: "1", trust: "refused:signed with a revoked key (A993D81C89F8D8C1)" }])));
    setImportBundle(imported);
    const { container } = render(<Placed code="ext:test.example" />);
    await waitFor(() => expect(container.textContent).toContain("Widget not available"));
    expect(container.textContent).toContain("Refused: signed with a revoked key");
    expect(imported).not.toHaveBeenCalled();
  });
});
