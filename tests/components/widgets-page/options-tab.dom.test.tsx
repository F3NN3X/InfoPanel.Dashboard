// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { addOption, newRecipe } from "@/components/widgets-page/builder-model";
import { OptionsTab } from "@/components/widgets-page/options-tab";
import type { Recipe } from "@/widgets/recipe/types";

// B2: an option's label and a choice's label can be emptied while they are typed (the old label came back at each keystroke);
// committing an empty one keeps the old label.

afterEach(cleanup);

function Host({ start, seen }: { start: Recipe; seen: Recipe[] }) {
  const [recipe, setRecipe] = useState(start);
  return (
    <OptionsTab
      recipe={recipe}
      data={{}}
      onChange={(r) => {
        seen.push(r);
        setRecipe(r);
      }}
    />
  );
}

describe("the Options tab", () => {
  it("a choice's label and the option's label empty while typed, and keep the old one when committed empty (B2)", () => {
    const start = addOption(newRecipe("W", new Set()), { key: "history", label: "History", type: "select", default: "a", options: [{ value: "a", label: "First" }, { value: "b", label: "Second" }] });
    const seen: Recipe[] = [];
    render(<Host start={start} seen={seen} />);
    fireEvent.click(screen.getByRole("button", { name: /History/ }));
    const choice = screen.getByLabelText("Choice 1") as HTMLInputElement;
    fireEvent.focus(choice);
    for (const v of ["Firs", "Fir", "Fi", "F", ""]) fireEvent.change(choice, { target: { value: v } });
    expect(choice.value).toBe("");
    fireEvent.change(choice, { target: { value: "Hourly" } });
    fireEvent.blur(choice);
    expect(seen.at(-1)?.options[0].options?.[0].label).toBe("Hourly");
    expect(seen).toHaveLength(1);
    const label = screen.getByLabelText("Option label") as HTMLInputElement;
    fireEvent.focus(label);
    fireEvent.change(label, { target: { value: "" } });
    expect(label.value).toBe("");
    fireEvent.blur(label);
    expect(seen.at(-1)?.options[0].label).toBe("History");
  });
});
