// @vitest-environment happy-dom
// L6: the chrome field shows the same 2 px focus ring as every other primitive, not only a border change.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FOCUS_RING } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

describe("Field", () => {
  it("carries the shared focus ring", () => {
    render(<Field aria-label="Address" />);
    for (const cls of FOCUS_RING.split(" ")) expect(screen.getByLabelText("Address").className).toContain(cls);
  });
});
