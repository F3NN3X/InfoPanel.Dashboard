// @vitest-environment happy-dom
// L6: the chrome field shows the same 2 px focus ring as every other primitive, not only a border change.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FOCUS_RING } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

describe("Field", () => {
  it("carries the shared focus ring", () => {
    render(<Field aria-label="Address" />);
    const field = screen.getByLabelText("Address");
    for (const cls of FOCUS_RING.split(" ")) expect(field.className).toContain(cls);
    // `outline-none` sets the outline style to none, which the ring's width and colour would then draw nothing over.
    expect(field.className.split(" ")).not.toContain("outline-none");
  });
});
