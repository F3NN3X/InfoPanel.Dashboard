// @vitest-environment happy-dom
import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LedLadder } from "@/widgets/core/primitives";
import { Widget } from "@/widgets/core/Widget";

// L56: the theme's card on a light page draws its ladder with the shell's status variables (the light colours); on a dark page, and on any other card, the literals.
const drawn = (mode: string, surface: string) => {
  const { container } = render(createElement("div", { "data-mode": mode }, createElement(Widget, { size: "lg", surface, title: "T", icon: "memory" }, createElement(LedLadder, { value: 100, n: 10 }))));
  return { container, html: () => container.innerHTML };
};

describe("the theme card's status colours follow the page's mode", () => {
  it("a light page: the variables; a dark page: the dark literals", () => {
    expect(drawn("light", "theme").html()).toContain("var(--w-warn, #EDB232)");
    const dark = drawn("dark", "theme").html();
    expect(dark).toContain("#EDB232");
    expect(dark).not.toContain("var(--w-warn, #EDB232)");
  });
  it("a card that is not the theme's reads no page: a glass card on a light page keeps the literals", () => {
    expect(drawn("light", "glass").html()).not.toContain("var(--w-warn, #EDB232)");
  });
  it("follows the page when its mode changes", async () => {
    const { container, html } = drawn("dark", "theme");
    expect(html()).not.toContain("var(--w-warn, #EDB232)");
    await act(async () => container.firstElementChild!.setAttribute("data-mode", "light"));
    expect(html()).toContain("var(--w-warn, #EDB232)");
  });
});

describe("a mode that arrives after the card mounted", () => {
  const ladder = () => createElement(Widget, { size: "lg", surface: "theme", title: "T", icon: "memory" }, createElement(LedLadder, { value: 100, n: 10 }));
  const LIGHT = "var(--w-warn, #EDB232)";

  const mounted = (pageMode?: string) => {
    const { container } = render(createElement("div", { id: "page", "data-mode": pageMode }, createElement("div", { id: "scope" }, ladder())));
    return { container, page: container.querySelector("#page")!, scope: container.querySelector("#scope")! };
  };

  it("follows a page that sets data-mode after the card mounted", async () => {
    const { container, page } = mounted();
    expect(container.innerHTML).not.toContain(LIGHT);
    await act(async () => page.setAttribute("data-mode", "light"));
    expect(container.innerHTML).toContain(LIGHT);
  });

  it("follows an element nearer than the one the card first found", async () => {
    const { container, scope } = mounted("dark");
    expect(container.innerHTML).not.toContain(LIGHT);
    await act(async () => scope.setAttribute("data-mode", "light"));
    expect(container.innerHTML).toContain(LIGHT);
  });
});
