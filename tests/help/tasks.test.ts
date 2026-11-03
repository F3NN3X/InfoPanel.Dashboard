/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { checkTasks } from "@/help/check";
import { HELP } from "@/help/content";
import { HELP_TASKS } from "@/help/tasks";
import { buildHelp } from "@/help/build";

const file = (id: string, body: string) => `---\nid: ${id}\ntitle: ${id}\nicon: dns\nverified: 1\n---\n${body}`;

describe("Help home's task cards", () => {
  it("each lead to an article and heading that exist", () => {
    expect(checkTasks(HELP_TASKS, HELP)).toEqual([]);
  });

  it("flags a task whose article or heading is gone", () => {
    const content = buildHelp({ "./articles/a.md": file("a", "Lede.\n\n## Part one\n\ntext") }, [{ label: "G", articles: ["a"] }]);
    const out = checkTasks(
      [
        { title: "Fine", article: "a", heading: "part-one" },
        { title: "No heading", article: "a", heading: "part-two" },
        { title: "No article", article: "ghost", heading: "x" },
      ],
      content
    );
    expect(out).toEqual(['task "No heading": "a" has no heading "#part-two"', 'task "No article": links to the missing article "ghost"']);
  });
});
